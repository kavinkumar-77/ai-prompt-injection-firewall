"""Decision engine compiling layer results into final gateway verdicts."""

from __future__ import annotations

from app.core.models import LayerResult, ScanRequest, ScanVerdict
from app.core.trust import adjust_score_for_trust


class DecisionEngine:
    """Evaluates multi-layer signals and policy thresholds for final security verdict."""

    def __init__(
        self,
        block_threshold: float = 0.70,
        warn_threshold: float = 0.40,
        policy_id: str = "default_strict",
    ) -> None:
        self.block_threshold = block_threshold
        self.warn_threshold = warn_threshold
        self.policy_id = policy_id

    def evaluate(
        self,
        request: ScanRequest,
        layer_results: list[LayerResult],
        sanitized_text: str | None = None,
    ) -> tuple[ScanVerdict, float, str]:
        """Calculates final verdict, consolidated risk score, and primary rationale."""
        if not layer_results:
            return "allow", 0.0, "No active security layers reported."

        # Find highest raw score and any critical triggers
        raw_max_score = 0.0
        critical_reasons: list[str] = []
        has_redaction_target = False

        for res in layer_results:
            if res.score > raw_max_score:
                raw_max_score = res.score
            for ev in res.evidence:
                if ev.kind in ("secret_exposure", "canary_leak"):
                    has_redaction_target = True
                if res.score >= 0.85:
                    critical_reasons.append(f"{res.layer}: {ev.detail}")

        # Scale score according to trust level of source
        adjusted_score = adjust_score_for_trust(raw_max_score, request.source)

        # Redaction condition
        if has_redaction_target and sanitized_text is not None and sanitized_text != request.text:
            return (
                "redact",
                adjusted_score,
                "Sensitive data or canary tokens detected and scrubbed.",
            )

        # Hard block if adjusted score exceeds block threshold or critical violations found
        if adjusted_score >= self.block_threshold or len(critical_reasons) > 0:
            if critical_reasons:
                primary_reason = critical_reasons[0]
            else:
                primary_reason = (
                    f"Risk score {adjusted_score:.2f} exceeded blocking threshold "
                    f"{self.block_threshold:.2f}."
                )
            return "block", adjusted_score, primary_reason

        # Warn condition
        if adjusted_score >= self.warn_threshold:
            return (
                "warn",
                adjusted_score,
                f"Elevated suspicion score {adjusted_score:.2f} flagged for monitoring.",
            )

        return "allow", adjusted_score, "Payload passed all security inspection layers."
