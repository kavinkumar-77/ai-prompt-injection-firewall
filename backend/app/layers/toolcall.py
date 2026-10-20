"""Tool-call policy engine inspecting agent function arguments and actions."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Final

from app.core.models import Evidence, LayerResult

# High risk command patterns in tool arguments
DANGEROUS_COMMAND_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"\brm\s+-(?:r|f|rf|fr)\s+[/~*]", re.IGNORECASE),
    re.compile(r"\bmkfs\b", re.IGNORECASE),
    re.compile(r"\bdd\s+if=", re.IGNORECASE),
    re.compile(r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", re.IGNORECASE),  # Fork bomb
    re.compile(r"\bcurl\s+.*?\b\|\s*(?:bash|sh|zsh)\b", re.IGNORECASE),
    re.compile(r"\bwget\s+.*?\b\|\s*(?:bash|sh|zsh)\b", re.IGNORECASE),
    re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE),
    re.compile(r"\bDELETE\s+FROM\s+\w+\s*;?$", re.IGNORECASE),
]

DISALLOWED_TOOLS: Final[set[str]] = {
    "system_shutdown",
    "format_disk",
    "modify_firewall_rules",
}


class ToolCallLayer:
    """Validates LLM-generated agent tool calls against security policies."""

    def __init__(self) -> None:
        self.layer_name = "toolcall"

    def process(self, tool_name: str, arguments: dict[str, Any]) -> LayerResult:
        """Inspects tool invocation name and parameters for policy violations."""
        start_time = time.perf_counter()
        evidence: list[Evidence] = []
        score = 0.0

        # 1. Disallowed tools check
        if tool_name in DISALLOWED_TOOLS:
            score = 1.0
            evidence.append(
                Evidence(
                    kind="disallowed_tool",
                    span=None,
                    detail=f"Tool '{tool_name}' is explicitly forbidden by security policy",
                )
            )

        # 2. Serialize arguments to string for regex safety checks
        arg_dump = json.dumps(arguments)
        for pattern in DANGEROUS_COMMAND_PATTERNS:
            match = pattern.search(arg_dump)
            if match:
                score = max(score, 0.98)
                evidence.append(
                    Evidence(
                        kind="dangerous_tool_argument",
                        span=(match.start(), match.end()),
                        detail=(
                            f"Dangerous command pattern detected in tool arguments: "
                            f"'{match.group()}'"
                        ),
                    )
                )

        elapsed = (time.perf_counter() - start_time) * 1000
        if score >= 0.70:
            label = "unsafe_tool_action"
        elif score > 0:
            label = "tool_warning"
        else:
            label = "allowed_tool_call"

        return LayerResult(
            layer=self.layer_name,
            score=score,
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
