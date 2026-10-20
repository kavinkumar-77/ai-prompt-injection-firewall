"""OpenAI-compatible proxy gateway router for Project AEGIS.

Intercepts, scans, and filters chat completions in both non-streaming and
streaming modes before forwarding to local Ollama or upstream providers.
"""

from __future__ import annotations

import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.canary import canary_manager
from app.core.models import ScanRequest, TrustSource
from app.core.pipeline import pipeline
from app.gateway.openai_compat import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelListResponse,
    OpenAIErrorDetail,
    OpenAIErrorResponse,
)
from app.gateway.streaming import inspect_and_filter_stream
from app.gateway.upstream import upstream_client
from app.security.auth import get_current_client
from app.security.ratelimit import rate_limit_check
from app.storage.db import ApiKeyModel, get_db
from app.storage.repositories import EventRepository

router = APIRouter(prefix="/v1", tags=["OpenAI Gateway"])


@router.get("/models", response_model=ModelListResponse)
def list_models(
    _client: Annotated[ApiKeyModel | None, Depends(get_current_client)],
) -> ModelListResponse:
    """Returns available LLM models from upstream provider."""
    return upstream_client.list_models()


@router.post(
    "/chat/completions",
    dependencies=[Depends(rate_limit_check)],
    responses={
        200: {"model": ChatCompletionResponse},
        400: {"model": OpenAIErrorResponse},
        429: {"description": "Rate limit exceeded"},
    },
)
def create_chat_completion(
    request: ChatCompletionRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    client: Annotated[ApiKeyModel | None, Depends(get_current_client)],
    x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None,
) -> Response:
    """OpenAI-compatible drop-in proxy endpoint intercepting prompts and responses."""
    start_time = time.perf_counter()
    req_id = str(uuid.uuid4())
    event_repo = EventRepository(db)
    client_id = client.id if client else "anonymous"
    session_id = x_session_id or req_id

    max_req_risk = 0.0
    blocked_reason = None
    all_layer_findings = []

    # 1. PRE-FLIGHT REQUEST SCAN: Inspect conversation messages
    for msg in request.messages:
        # Resolve trust level
        if msg.aegis_source:
            source: TrustSource = msg.aegis_source
        elif msg.role == "tool":
            source = "tool_output"
        elif msg.role == "system":
            source = "system"
        else:
            source = "user"

        if msg.content:
            scan_res = pipeline.scan(ScanRequest(text=msg.content, source=source))
            max_req_risk = max(max_req_risk, scan_res.risk_score)
            all_layer_findings.extend([lr.model_dump() for lr in scan_res.layers])

            if scan_res.verdict == "block":
                default_msg = "Prompt injection or security policy violation detected."
                blocked_reason = scan_res.rationale or default_msg
                # Record blocked audit event
                event_repo.record_event(
                    request_id=req_id,
                    source=source,
                    text=msg.content,
                    verdict="block",
                    risk_score=scan_res.risk_score,
                    policy_id=scan_res.policy_id,
                    latency_ms=round((time.perf_counter() - start_time) * 1000, 3),
                    primary_reason=blocked_reason,
                    layers=all_layer_findings,
                    api_key_id=client_id,
                )

                error_body = OpenAIErrorResponse(
                    error=OpenAIErrorDetail(
                        message=blocked_reason,
                        type="aegis_policy_violation",
                        param="messages",
                        code="prompt_injection_blocked",
                    )
                )
                headers = {
                    "X-Aegis-Request-Id": req_id,
                    "X-Aegis-Verdict": "block",
                    "X-Aegis-Risk": str(round(scan_res.risk_score, 4)),
                }
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content=error_body.model_dump(),
                    headers=headers,
                )

            elif scan_res.verdict == "redact" and scan_res.sanitized_text:
                # Apply in-place redaction to request message content
                msg.content = scan_res.sanitized_text

    # 2. STREAMING DISPATCH
    if request.stream:
        raw_stream = upstream_client.stream_complete(request)
        filtered_stream = inspect_and_filter_stream(raw_stream, request_id=req_id)

        # Record audit event for streaming request
        event_repo.record_event(
            request_id=req_id,
            source="user",
            text=request.messages[-1].content if request.messages else "",
            verdict="allow",
            risk_score=max_req_risk,
            policy_id=pipeline.decision_engine.policy_id,
            latency_ms=round((time.perf_counter() - start_time) * 1000, 3),
            primary_reason="Streaming chat completion allowed.",
            layers=all_layer_findings,
            api_key_id=client_id,
        )

        headers = {
            "X-Aegis-Request-Id": req_id,
            "X-Aegis-Verdict": "allow",
            "X-Aegis-Risk": str(round(max_req_risk, 4)),
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
        return StreamingResponse(filtered_stream, media_type="text/event-stream", headers=headers)

    # 3. NON-STREAMING DISPATCH
    upstream_resp = upstream_client.complete(request)

    # 4. POST-FLIGHT RESPONSE SCAN: Verify model output safety
    if upstream_resp.choices:
        assistant_reply = upstream_resp.choices[0].message.content
        if assistant_reply:
            # Check canary token leakage
            canary_check = canary_manager.scan_output(assistant_reply, session_id=session_id)
            if canary_check.score >= 0.90:
                event_repo.record_event(
                    request_id=req_id,
                    source="assistant",
                    text=assistant_reply,
                    verdict="block",
                    risk_score=1.0,
                    policy_id=pipeline.decision_engine.policy_id,
                    latency_ms=round((time.perf_counter() - start_time) * 1000, 3),
                    primary_reason="Blocked: System prompt canary token leaked in model response.",
                    api_key_id=client_id,
                )
                error_body = OpenAIErrorResponse(
                    error=OpenAIErrorDetail(
                        message="AEGIS blocked model response: Confidential canary token leaked.",
                        type="aegis_policy_violation",
                        param="response",
                        code="system_prompt_leakage_blocked",
                    )
                )
                headers = {
                    "X-Aegis-Request-Id": req_id,
                    "X-Aegis-Verdict": "block",
                    "X-Aegis-Risk": "1.0",
                }
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content=error_body.model_dump(),
                    headers=headers,
                )

            # Scan for leaked credentials or exfiltration in output
            out_scan = pipeline.scan(ScanRequest(text=assistant_reply, source="system"))
            if out_scan.verdict == "block":
                event_repo.record_event(
                    request_id=req_id,
                    source="assistant",
                    text=assistant_reply,
                    verdict="block",
                    risk_score=out_scan.risk_score,
                    policy_id=pipeline.decision_engine.policy_id,
                    latency_ms=round((time.perf_counter() - start_time) * 1000, 3),
                    primary_reason=f"Blocked: {out_scan.rationale}",
                    api_key_id=client_id,
                )
                error_body = OpenAIErrorResponse(
                    error=OpenAIErrorDetail(
                        message=f"AEGIS blocked model response: {out_scan.rationale}",
                        type="aegis_policy_violation",
                        param="response",
                        code="output_policy_violation",
                    )
                )
                headers = {
                    "X-Aegis-Request-Id": req_id,
                    "X-Aegis-Verdict": "block",
                    "X-Aegis-Risk": str(round(out_scan.risk_score, 4)),
                }
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content=error_body.model_dump(),
                    headers=headers,
                )

    # 5. Successful Clean Completion
    total_elapsed = round((time.perf_counter() - start_time) * 1000, 3)
    event_repo.record_event(
        request_id=req_id,
        source="user",
        text=request.messages[-1].content if request.messages else "",
        verdict="allow",
        risk_score=max_req_risk,
        policy_id=pipeline.decision_engine.policy_id,
        latency_ms=total_elapsed,
        primary_reason="Chat completion allowed.",
        layers=all_layer_findings,
        api_key_id=client_id,
    )

    if request.aegis_include_details:
        upstream_resp.aegis = {
            "request_id": req_id,
            "verdict": "allow",
            "risk_score": max_req_risk,
            "latency_ms": total_elapsed,
            "policy_id": pipeline.decision_engine.policy_id,
        }

    headers = {
        "X-Aegis-Request-Id": req_id,
        "X-Aegis-Verdict": "allow",
        "X-Aegis-Risk": str(round(max_req_risk, 4)),
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=upstream_resp.model_dump(),
        headers=headers,
    )
