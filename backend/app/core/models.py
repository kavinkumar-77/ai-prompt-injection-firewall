"""Core Pydantic models for AEGIS security gateway and pipeline layers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

# Trust level classification for incoming text / data chunks
TrustSource = Literal["system", "user", "retrieved", "tool_output"]

# Final security verdict issued by the gateway
ScanVerdict = Literal["allow", "warn", "block", "redact"]

# Threat severity level
SeverityLevel = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"]


class Evidence(BaseModel):
    """Forensic evidence span indicating where a suspicious signal was located."""

    kind: str = Field(
        ...,
        description="Classification of evidence (e.g. delimiter, exfil_url, secret, jailbreak)",
    )
    span: tuple[int, int] | None = Field(
        default=None,
        description="Character start and end index (start, end) for UI highlighting",
    )
    detail: str = Field(..., description="Human-readable explanation of why fragment is flagged")


class LayerResult(BaseModel):
    """Execution output from a single pipeline layer."""

    layer: str = Field(..., description="Name of the executing layer")
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized risk score from 0.0 to 1.0")
    label: str = Field(..., description="Descriptive label (e.g. clean, delimiter_smuggling)")
    evidence: list[Evidence] = Field(
        default_factory=list, description="Forensic evidence items detected by this layer"
    )
    latency_ms: float = Field(
        default=0.0, ge=0.0, description="Layer execution latency in milliseconds"
    )


class ScanRequest(BaseModel):
    """Request payload to scan a text block for prompt injection, secrets, or leakage."""

    text: str = Field(..., min_length=1, description="Untrusted text payload to scan")
    source: TrustSource = Field(
        default="user",
        description="Origin trust level: system, user, retrieved, or tool_output",
    )
    system_prompt: str | None = Field(
        default=None,
        description="Optional active system prompt to evaluate intent alignment or directive clash",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary context metadata (e.g. session_id, user_id, document_uri)",
    )


class ToolCallScanRequest(BaseModel):
    """Request payload to scan agent tool invocations before execution."""

    tool_name: str = Field(
        ..., description="Name of the tool being called (e.g. execute_bash, send_email)"
    )
    arguments: dict[str, Any] = Field(
        default_factory=dict, description="Parameters and payload passed to the tool"
    )
    caller_role: TrustSource = Field(
        default="tool_output",
        description="Source role initiating or resulting from the call",
    )
    is_tainted: bool = Field(
        default=False,
        description="Whether conversation context contains untrusted/retrieved data",
    )
    agent_role: str | None = Field(
        default=None,
        description="Optional agent persona or capability role",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Session and environment metadata"
    )


class ScanResponse(BaseModel):
    """Comprehensive verdict returned by the AEGIS pipeline."""

    verdict: ScanVerdict = Field(
        ..., description="Final security action: allow, warn, block, or redact"
    )
    risk_score: float = Field(
        ..., ge=0.0, le=1.0, description="Consolidated risk score across all active layers"
    )
    layers: list[LayerResult] = Field(
        default_factory=list, description="Ordered layer execution results"
    )
    explanations: list[str] = Field(
        default_factory=list,
        description="Human-readable forensic explanations from all layers",
    )
    rationale: str | None = Field(
        default=None,
        description="Primary reason summarizing the final verdict",
    )
    request_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique trace identifier for audit logging and correlation",
    )
    policy_id: str = Field(
        default="balanced", description="Identifier of the policy used for this decision"
    )
    latency_ms: float = Field(
        default=0.0, ge=0.0, description="Total pipeline processing latency in milliseconds"
    )
    sanitized_text: str | None = Field(
        default=None,
        description="Sanitized or redacted version of payload if verdict is redact",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="ISO-8601 UTC timestamp of decision",
    )
