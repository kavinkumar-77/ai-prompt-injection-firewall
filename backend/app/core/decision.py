"""Decision engine compiling multi-layer findings into gateway verdicts.

Supports configurable policy presets (strict, balanced, lenient),
trust-level adjustments, redaction conditions, and generates human-readable
forensic explanations.
"""

from __future__ import annotations

from typing import Final

from app.core.models import LayerResult, ScanRequest, ScanVerdict
from app.core.trust import adjust_score_for_trust

POLICY_PRESETS: Final[dict[str, dict[str, float]]] = {
    "default_strict": {
        "block_threshold": 0.70,
        "warn_threshold": 0.40,
    },
    "strict": {
        "block_threshold": 0.50,
        "warn_threshold": 0.30,
    },
    "balanced": {
        "block_threshold": 0.70,
        "warn_threshold": 0.40,
    },
    "lenient": {
        "block_threshold": 0.85,
        "warn_threshold": 0.60,
    },
}


class DecisionEngine:
    """Evaluates multi-layer signals and policy thresholds for final security verdict."""

    def __init__(
        self,
        block_threshold: float = 0.70,
        warn_threshold: float = 0.40,
        policy_id: str = "default_strict",
    ) -> None:
        self.policy_id = policy_id
        if policy_id in POLICY_PRESETS:
            preset = POLICY_PRESETS[policy_id]
            self.block_threshold = preset["block_threshold"]
            self.warn_threshold = preset["warn_threshold"]
        else:
            self.block_threshold = block_threshold
            self.warn_threshold = warn_threshold

    def set_preset(self, preset_name: str) -> None:
        """Dynamically applies a policy preset."""
        if preset_name in POLICY_PRESETS:
            self.policy_id = preset_name
            self.block_threshold = POLICY_PRESETS[preset_name]["block_threshold"]
            self.warn_threshold = POLICY_PRESETS[preset_name]["warn_threshold"]

    def evaluate(
        self,
        request: ScanRequest,
        layer_results: list[LayerResult],
        sanitized_text: str | None = None,
        policy_override: str | None = None,
    ) -> tuple[ScanVerdict, float, str, list[str]]:
        """Calculates final verdict, consolidated risk score, primary reason, and explanations."""
        if not layer_results:
            return "allow", 0.0, "No active security layers reported.", []

        # Determine effective policy preset and thresholds
        effective_policy = (
            policy_override
            or getattr(request, "policy_preset", None)
            or (request.metadata.get("policy_preset") if request.metadata else None)
            or self.policy_id
        )
        if effective_policy in POLICY_PRESETS:
            block_threshold = POLICY_PRESETS[effective_policy]["block_threshold"]
            warn_threshold = POLICY_PRESETS[effective_policy]["warn_threshold"]
        else:
            block_threshold = self.block_threshold
            warn_threshold = self.warn_threshold

        raw_max_score = 0.0
        explanations: list[str] = []
        critical_violations: list[str] = []
        has_redaction = False

        for res in layer_results:
            if res.score > raw_max_score:
                raw_max_score = res.score

            for ev in res.evidence:
                explanation = f"[{res.layer.upper()}] {ev.detail}"
                explanations.append(explanation)

                # Critical trigger detection
                if "leak" in ev.kind or "canary" in ev.kind or "secret" in ev.kind:
                    has_redaction = True

                if res.score >= 0.85:
                    critical_violations.append(f"{res.layer}: {ev.detail}")

        # Adjust score according to caller / origin trust level
        adjusted_score = adjust_score_for_trust(raw_max_score, request.source)

        # 1. Redaction Condition (sensitive data scrubbed)
        if (
            has_redaction
            and sanitized_text is not None
            and sanitized_text != request.text
            and adjusted_score < 0.95
        ):
            reason = "Sensitive credentials or PII detected and redacted with typed placeholders."
            return "redact", adjusted_score, reason, explanations

        # 2. Hard Block (score exceeds threshold or critical violation confirmed)
        if adjusted_score >= block_threshold or len(critical_violations) > 0:
            if critical_violations:
                primary_reason = f"Blocked: {critical_violations[0]}"
            else:
                primary_reason = (
                    f"Blocked: Consolidated risk score {adjusted_score:.2f} exceeded "
                    f"policy threshold {block_threshold:.2f} (preset '{effective_policy}')."
                )
            return "block", adjusted_score, primary_reason, explanations

        # 3. Warn Condition
        if adjusted_score >= warn_threshold:
            primary_reason = (
                f"Warn: Elevated risk score {adjusted_score:.2f} flagged for monitoring."
            )
            return "warn", adjusted_score, primary_reason, explanations

        # 4. Allow
        return (
            "allow",
            adjusted_score,
            "Payload passed all active security inspection layers.",
            explanations,
        )
