"""Pydantic schemas for Project AEGIS Security Gateway."""

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IntentAnalysisRequest(BaseModel):
    """Request payload to analyze prompt injection and intent divergence."""

    system_prompt: str | None = Field(
        default="",
        description="Original system instructions or primary user goal.",
    )
    user_input: str = Field(
        ...,
        description="Untrusted user input or document chunk to inspect.",
    )
    context: str | None = Field(
        default="",
        description="Surrounding context or retrieval snippets.",
    )
    source_url: str | None = Field(
        default="",
        description="URL or origin where the input was discovered.",
    )


class IntentAnalysisResponse(BaseModel):
    """Response payload for intent analysis."""

    intent_divergence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Divergence score between system objective and user input.",
    )
    obfuscation_detected: bool = Field(
        ...,
        description="Whether encoded or obfuscated text was detected.",
    )
    obfuscation_type: str | None = Field(
        default=None,
        description="Type of obfuscation detected (e.g. base64, hex, url, unicode).",
    )
    decoded_payload: str | None = Field(
        default=None,
        description="Decoded payload if obfuscation was unwrapped.",
    )
    verdict: Literal["SAFE", "SUSPICIOUS", "INJECTION"] = Field(
        ...,
        description="Security verdict for the payload.",
    )
    reasoning: str = Field(
        ...,
        description="Concise security rationale for the verdict.",
    )
    ai_analysis: dict[str, Any] = Field(
        default_factory=dict,
        description="Detailed vector similarity, attention shifts, and attack vectors.",
    )
    attack_family: str | None = Field(
        default=None,
        description="Categorized attack family (e.g. Indirect RAG Injection, Delimiter Smuggling).",
    )
    owasp_category: str | None = Field(
        default=None,
        description="OWASP Top 10 for LLMs alignment category.",
    )
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"] = Field(
        default="CLEAN",
        description="Threat severity classification.",
    )
    forensic_breakdown: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured multi-tier forensic evidence trail.",
    )
    remediation: str | None = Field(
        default=None,
        description="Actionable developer or security operations guidance.",
    )
    unprotected_simulation: dict[str, Any] | None = Field(
        default=None,
        description="Simulates how an unprotected model fails vs defended state.",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
    )


class ExfiltrationCheckRequest(BaseModel):
    """Request payload to check outbound network calls for data exfiltration."""

    payload_hash: str = Field(
        ...,
        description="SHA-256 hash of the sensitive data or form fields.",
    )
    destination_url: str = Field(
        ...,
        description="Target URL where data is being sent.",
    )
    taint_level: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        default="LOW",
        description="Taint level of the source element or memory context.",
    )
    trigger_element: str = Field(
        default="",
        description="DOM element or tool initiating the request.",
    )
    payload_preview: str = Field(
        default="",
        description="Sanitized non-sensitive preview or field names.",
    )
    source_url: str = Field(
        default="",
        description="Page URL where the exfiltration triggered.",
    )


class ExfiltrationCheckResponse(BaseModel):
    """Response payload for outbound exfiltration validation."""

    blocked: bool = Field(
        ...,
        description="Whether the gateway blocked the outbound transmission.",
    )
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(
        ...,
        description="Assessed risk level.",
    )
    reason: str = Field(
        ...,
        description="Explanation of policy decision.",
    )
    action_taken: str = Field(
        ...,
        description="Action performed (e.g. BLOCKED_AND_LOGGED, ALLOWED).",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
    )


class VisualSimilarityRequest(BaseModel):
    """Request payload to inspect page layout perceptual hash for phishing clones."""

    screenshot_hash: str = Field(
        ...,
        description="Perceptual or structural blockhash string of the page.",
    )
    url: str = Field(
        ...,
        description="Current page URL.",
    )
    claimed_identity: str = Field(
        default="",
        description="Brand identity claimed by title, text, or favicon.",
    )


class VisualSimilarityResponse(BaseModel):
    """Response payload for visual phishing analysis."""

    is_phishing: bool = Field(
        ...,
        description="Whether the page is classified as a visual clone/phish.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score.",
    )
    matched_brand: str | None = Field(
        default=None,
        description="Known legitimate brand layout matched.",
    )
    hash_distance: int = Field(
        ...,
        description="Hamming distance to reference brand template.",
    )
    reason: str = Field(
        ...,
        description="Security explanation of visual comparison.",
    )


class CanaryCheckRequest(BaseModel):
    """Request payload to detect system prompt canary leakage in LLM output."""

    model_response: str = Field(
        ...,
        description="The LLM or agent output response text to inspect.",
    )
    canary_token: str = Field(
        ...,
        description="The secret canary token injected into the original system prompt.",
    )
    session_id: str | None = Field(
        default=None,
        description="Session identifier or dialogue trace ID.",
    )
    source_url: str | None = Field(
        default="",
        description="Origin URL where LLM interaction occurred.",
    )


class CanaryCheckResponse(BaseModel):
    """Response payload for system prompt canary detection."""

    canary_leaked: bool = Field(
        ...,
        description="Whether the canary token was leaked in the model output.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence level of the detection.",
    )
    blocked: bool = Field(
        ...,
        description="Whether the response should be blocked from reaching the user.",
    )
    sanitized_response: str | None = Field(
        default=None,
        description="Sanitized response with canary redacted, or None if fully blocked.",
    )
    reason: str = Field(
        ...,
        description="Security explanation of the decision.",
    )


class ThreatEvent(BaseModel):
    """Historical threat event record."""

    id: str = Field(..., description="Unique event identifier.")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp.")
    attack_type: Literal["INJECTION", "EXFILTRATION", "PHISHING", "SYSTEM_PROMPT_LEAK"] = Field(
        ...,
        description="Category of threat.",
    )
    source_url: str = Field(default="", description="Origin URL of threat.")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk severity score.")
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured context (hashed/sanitized metadata).",
    )


class ThreatStatsResponse(BaseModel):
    """Aggregated threat intelligence statistics."""

    total_threats: int
    injections_blocked: int
    exfiltrations_blocked: int
    phishing_blocked: int
    avg_risk_score: float
    system_status: str
