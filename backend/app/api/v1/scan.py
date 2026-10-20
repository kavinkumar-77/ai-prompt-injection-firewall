"""API v1 endpoints for text scanning and tool-call policy enforcement."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.models import ScanRequest, ScanResponse, ToolCallScanRequest
from app.core.pipeline import pipeline
from app.database import log_threat
from app.observability.logging import logger, mask_or_hash_payload
from app.observability.metrics import metrics_collector
from app.schemas import ThreatEvent

router = APIRouter(prefix="/v1", tags=["Scan"])


@router.post("/scan", response_model=ScanResponse)
def scan_text(request: ScanRequest) -> ScanResponse:
    """Scans untrusted text payloads for prompt injection, secrets, and exfiltration."""
    response = pipeline.scan(request)

    # Telemetry
    metrics_collector.record_scan(response.verdict, response.latency_ms)

    # Structured audit logging (zero raw data exposure)
    payload_hash = mask_or_hash_payload(request.text)
    logger.info(
        f"Scan completed: verdict={response.verdict} risk={response.risk_score:.2f} "
        f"source={request.source} payload_hash={payload_hash} latency_ms={response.latency_ms:.1f}"
    )

    # Persist threat event to database if blocked or warning
    if response.verdict in ("block", "warn"):
        event = ThreatEvent(
            id=response.request_id,
            timestamp=datetime.now(UTC).isoformat(),
            attack_type="INJECTION",
            source_url=str(request.metadata.get("source_url", "")),
            risk_score=response.risk_score,
            details={
                "verdict": response.verdict,
                "policy_id": response.policy_id,
                "source": request.source,
                "triggered_layers": [
                    {
                        "layer": lr.layer,
                        "score": lr.score,
                        "label": lr.label,
                        "evidence_count": len(lr.evidence),
                    }
                    for lr in response.layers
                    if lr.score > 0
                ],
            },
        )
        try:
            log_threat(event)
        except Exception as e:
            logger.warning(f"Failed to persist threat event: {e}")

    return response


@router.post("/scan/tool-call", response_model=ScanResponse)
def scan_tool_call(request: ToolCallScanRequest) -> ScanResponse:
    """Evaluates agent tool actions and arguments against safety policies."""
    response = pipeline.scan_tool_call(request)

    metrics_collector.record_scan(response.verdict, response.latency_ms)

    logger.info(
        f"Tool-call scan: tool={request.tool_name} verdict={response.verdict} "
        f"risk={response.risk_score:.2f} latency_ms={response.latency_ms:.1f}"
    )

    if response.verdict in ("block", "warn"):
        event = ThreatEvent(
            id=response.request_id,
            timestamp=datetime.now(UTC).isoformat(),
            attack_type="INJECTION",
            source_url="agent_tool_call",
            risk_score=response.risk_score,
            details={
                "verdict": response.verdict,
                "tool_name": request.tool_name,
                "policy_id": response.policy_id,
                "caller_role": request.caller_role,
            },
        )
        try:
            log_threat(event)
        except Exception as e:
            logger.warning(f"Failed to persist tool-call threat event: {e}")

    return response
