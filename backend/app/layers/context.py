"""Context-aware layer evaluating trust levels, RAG chunks, and indirect injections."""

from __future__ import annotations

import re
import time
from typing import Final

from app.core.models import Evidence, LayerResult, TrustSource

# Suspicious directive markers when found inside external retrieved data or tool outputs
INDIRECT_INSTRUCTION_PATTERNS: Final[list[tuple[str, re.Pattern[str], float]]] = [
    (
        "instruction_override",
        re.compile(
            r"(?i)\b(?:ignore|disregard|override|forget)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b"
        ),
        0.95,
    ),
    (
        "new_system_directive",
        re.compile(
            r"(?i)\b(?:you\s+must\s+now|new\s+system\s+directive|administrative\s+override|system\s+override)\b"
        ),
        0.95,
    ),
    (
        "data_exfiltration_directive",
        re.compile(
            r"(?i)\b(?:exfiltrate|send|leak|forward|upload)\s+(?:all\s+)?(?:data|secrets|keys|tokens|passwords|history)\b"
        ),
        0.98,
    ),
    (
        "stealth_directive",
        re.compile(
            r"(?i)\b(?:do\s+not\s+inform\s+the\s+user|hide\s+this\s+from\s+the\s+user|silently\s+execute|in\s+secret)\b"
        ),
        0.92,
    ),
    (
        "persona_override",
        re.compile(
            r"(?i)\b(?:from\s+now\s+on\s+you\s+are|you\s+are\s+no\s+longer|act\s+as\s+(?:an?\s+)?unrestricted)\b"
        ),
        0.90,
    ),
    (
        "chat_role_smuggling",
        re.compile(
            r"(?i)(?:<\|im_start\|>(?:system|assistant)|\[INST\]\s*<<SYS>>|<s>\s*\[SYSTEM\]|\bSystem:\s*|\bHuman:\s*.*?\bAssistant:\s*)"
        ),
        0.96,
    ),
    (
        "tool_call_smuggling",
        re.compile(
            r"(?i)(?:<tool_call>|<function=|\bcall\s*:\s*[a-zA-Z0-9_-]+\(|\bAction\s*:\s*[a-zA-Z0-9_-]+)"
        ),
        0.92,
    ),
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
        max_score = 0.0

        for kind, pattern, base_score in INDIRECT_INSTRUCTION_PATTERNS:
            for match in pattern.finditer(text):
                matched_str = match.group()[:60]
                if is_external_source:
                    # Indirect injections via external RAG documents or tool outputs are critical
                    scaled_score = base_score
                    detail = (
                        f"Detected high-risk indirect injection directive in untrusted '{source}' "
                        f"chunk: '{matched_str}'"
                    )
                    evidence.append(
                        Evidence(
                            kind=f"indirect_{kind}",
                            span=(match.start(), match.end()),
                            detail=detail,
                        )
                    )
                else:
                    # Direct user prompts: suspicious but primary defense is rules/ML
                    scaled_score = round(base_score * 0.65, 4)
                    detail = f"Instruction imperative found in user prompt: '{matched_str}'"
                    evidence.append(
                        Evidence(
                            kind=f"user_{kind}",
                            span=(match.start(), match.end()),
                            detail=detail,
                        )
                    )

                max_score = max(max_score, scaled_score)

        # Instruction density heuristic for external documents: multiple imperative verbs
        if is_external_source:
            imperative_markers = len(evidence)
            if imperative_markers >= 2:
                max_score = min(1.0, max_score + 0.10)

        elapsed = (time.perf_counter() - start_time) * 1000

        if is_external_source and max_score >= 0.70:
            label = "indirect_injection_threat"
        elif max_score >= 0.50:
            label = "instruction_imperative"
        else:
            label = "clean"

        return LayerResult(
            layer=self.layer_name,
            score=round(max_score, 4),
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
