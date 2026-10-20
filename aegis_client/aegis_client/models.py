"""Data models and response types for the AEGIS Client SDK."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class EvidenceSpan(BaseModel):
    """Character offset evidence span flagged by defense layers."""

    start: int
    end: int
    snippet: str
    detail: str = ""


class LayerInspectionResult(BaseModel):
    """Individual execution result from a single pipeline defense layer."""

    layer: str
    score: float = Field(ge=0.0, le=1.0)
    label: str
    evidence: list[EvidenceSpan] = Field(default_factory=list)
    latency_ms: float = 0.0


class ScanResult(BaseModel):
    """Inspection verdict returned by Project AEGIS Gateway."""

    request_id: str
    verdict: Literal["allow", "warn", "block", "redact"]
    risk_score: float = Field(ge=0.0, le=1.0)
    policy_id: str = "balanced"
    latency_ms: float = 0.0
    layers: list[LayerInspectionResult] = Field(default_factory=list)
    explanations: list[str] = Field(default_factory=list)
    rationale: str | None = None
    transformed_text: str | None = None

    @property
    def is_blocked(self) -> bool:
        """Returns True if the payload was quarantined/blocked by gateway policy."""
        return self.verdict == "block"

    @property
    def is_redacted(self) -> bool:
        """Returns True if secrets or PII were detected and redacted."""
        return self.verdict == "redact"

    @property
    def is_allowed(self) -> bool:
        """Returns True if the payload was allowed through to the model."""
        return self.verdict in ("allow", "warn")


class ToolCallDecision(BaseModel):
    """Evaluation result for an agent tool execution check."""

    tool_name: str
    allowed: bool
    requires_approval: bool = False
    reason: str
    policy_id: str = "default_capabilities"
    latency_ms: float = 0.0
