"""Context-aware layer evaluating trust levels, RAG chunks, and indirect injections."""

from __future__ import annotations

import re
import time
from typing import Final

from app.core.models import Evidence, LayerResult, TrustSource

# Suspicious directive markers when found inside external retrieved data or tool outputs
INDIRECT_INSTRUCTION_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(
        r"(?i)\b(?:ignore|disregard|override|forget)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b"
    ),
    re.compile(r"(?i)\b(?:you\s+must\s+now|new\s+system\s+directive|administrative\s+override)\b"),
    re.compile(
        r"(?i)\b(?:exfiltrate|send|leak|forward)\s+(?:all\s+)?(?:data|secrets|keys|tokens|passwords)\b"
    ),
    re.compile(r"(?i)\b(?:do\s+not\s+inform\s+the\s+user|hide\s+this\s+from\s+the\s+user)\b"),
]


class ContextLayer:
    """Evaluates contextual trust boundaries to defend against indirect prompt injection."""

    def __init__(self) -> None:
        self.layer_name = "context"

    def process(self, text: str, source: TrustSource) -> LayerResult:
        """Inspects text for indirect injection imperatives in untrusted external data."""
        start_time = time.perf_counter()
        if not text:
            elapsed = (time.perf_counter() - start_time) * 1000
            return LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        evidence: list[Evidence] = []
        is_external_source = source in ("retrieved", "tool_output")
        score = 0.0

        for pattern in INDIRECT_INSTRUCTION_PATTERNS:
            for match in pattern.finditer(text):
                # An imperative command inside retrieved or tool_output text is a severe red flag
                if is_external_source:
                    score = max(score, 0.92)
                    evidence.append(
                        Evidence(
                            kind="indirect_injection_imperative",
                            span=(match.start(), match.end()),
                            detail=(
                                f"Detected high-risk instruction imperative inside untrusted "
                                f"'{source}' payload: '{match.group()}'"
                            ),
                        )
                    )
                else:
                    # Inside direct user input, it's suspicious but handled primarily by rules
                    score = max(score, 0.50)
                    evidence.append(
                        Evidence(
                            kind="user_directive_imperative",
                            span=(match.start(), match.end()),
                            detail=(
                                f"Direct instruction imperative detected in user prompt: "
                                f"'{match.group()}'"
                            ),
                        )
                    )

        elapsed = (time.perf_counter() - start_time) * 1000
        if is_external_source and score >= 0.80:
            label = "indirect_injection_threat"
        elif score > 0:
            label = "instruction_imperative"
        else:
            label = "clean"

        return LayerResult(
            layer=self.layer_name,
            score=score,
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
