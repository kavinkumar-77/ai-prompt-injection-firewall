"""Streaming response inspector for Project AEGIS Gateway."""

from __future__ import annotations

import json
from collections.abc import Iterator

from app.core.canary import CANARY_REGEX
from app.layers.rules import RULES_CATALOG
from app.layers.secrets import SECRET_PATTERNS


class StreamingViolationException(Exception):
    """Raised when streaming tokens violate security policies."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def inspect_and_filter_stream(raw_stream: Iterator[str], request_id: str) -> Iterator[str]:
    """Inspects SSE streaming chunks with a lookahead buffer to block leaks mid-stream."""
    accumulated_content = []

    # Rules to check against generated stream output (secrets, exfiltration, canary)
    output_rules = [r for r in RULES_CATALOG if r.rule_id in ("R-EXFIL-001", "R-SECRET-001")]

    for line in raw_stream:
        clean_line = line.strip()

        # Pass through empty keepalives or completion markers
        if not clean_line or clean_line == "data: [DONE]":
            yield line
            continue

        if clean_line.startswith("data: "):
            payload_str = clean_line[6:].strip()
            try:
                chunk_data = json.loads(payload_str)
                choices = chunk_data.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    token = delta.get("content", "")
                    if token:
                        accumulated_content.append(token)
                        current_buffer = "".join(accumulated_content)

                        # 1. Canary leak check
                        if CANARY_REGEX.search(current_buffer):
                            err_chunk = {
                                "id": f"err-{request_id}",
                                "error": {
                                    "message": "Stream aborted: Canary token leaked in response.",
                                    "type": "aegis_policy_violation",
                                    "code": "canary_leak_intercepted",
                                },
                            }
                            yield f"data: {json.dumps(err_chunk)}\n\n"
                            yield "data: [DONE]\n\n"
                            return

                        # 2. Output rules exfiltration & secret patterns check
                        for rule in output_rules:
                            if any(pattern.search(current_buffer) for pattern in rule.patterns):
                                err_chunk = {
                                    "id": f"err-{request_id}",
                                    "error": {
                                        "message": (
                                            f"Stream aborted: [{rule.rule_id}] {rule.name} "
                                            f"detected in output."
                                        ),
                                        "type": "aegis_policy_violation",
                                        "code": "data_leakage_intercepted",
                                    },
                                }
                                yield f"data: {json.dumps(err_chunk)}\n\n"
                                yield "data: [DONE]\n\n"
                                return

                        # 3. High-entropy API key check
                        for s_rule in SECRET_PATTERNS:
                            is_sec = s_rule.category == "SECRET"
                            if is_sec and s_rule.pattern.search(current_buffer):
                                err_chunk = {
                                    "id": f"err-{request_id}",
                                    "error": {
                                        "message": (
                                            f"Stream aborted: Credentials ({s_rule.name}) "
                                            f"detected in output."
                                        ),
                                        "type": "aegis_policy_violation",
                                        "code": "credentials_leakage_intercepted",
                                    },
                                }
                                yield f"data: {json.dumps(err_chunk)}\n\n"
                                yield "data: [DONE]\n\n"
                                return
            except json.JSONDecodeError:
                pass

        yield line
