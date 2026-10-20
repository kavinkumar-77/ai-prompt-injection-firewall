"""FastAPI Gateway for Project AEGIS (Prompt-Injection & Data-Leak Firewall)."""

import hashlib
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import (
    clear_all_threats,
    get_recent_threats,
    get_threat_stats,
    init_db,
    log_threat,
)
from app.model_manager import analyzer
from app.schemas import (
    CanaryCheckRequest,
    CanaryCheckResponse,
    ExfiltrationCheckRequest,
    ExfiltrationCheckResponse,
    IntentAnalysisRequest,
    IntentAnalysisResponse,
    ThreatEvent,
    VisualSimilarityRequest,
    VisualSimilarityResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to initialize resources."""
    init_db()
    yield


app = FastAPI(
    title="Project AEGIS Security Gateway",
    description="Local-first AI defense gateway against prompt injection and data exfiltration.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for dashboard, browser extension, and test harness
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount demo folder for interactive presentation (DocuMind AI & Attack Center)
demo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "demo"))
if os.path.exists(demo_dir):
    app.mount("/demo", StaticFiles(directory=demo_dir, html=True), name="demo")


# Trusted destination domains for safe data transmission
ALLOWED_DESTINATIONS = {
    "localhost",
    "127.0.0.1",
    "api.openai.com",
    "api.anthropic.com",
    "generativelanguage.googleapis.com",
    "huggingface.co",
}

SUSPICIOUS_INDICATORS = [
    "evil-collector.xyz",
    "attacker.com",
    "leak",
    "steal",
    "webhook.site",
    "pastebin.com",
    "ngrok-free.app",
]


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Health check endpoint to verify backend operational readiness."""
    return {"status": "ok"}


@app.get("/aegis-shield.js", tags=["System"])
def get_aegis_shield_sdk() -> FileResponse:
    """Serves the standalone drop-in web defense SDK for zero-extension in-app protection."""
    sdk_path = os.path.join(demo_dir, "aegis-shield.js")
    if os.path.exists(sdk_path):
        return FileResponse(sdk_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="SDK script not found")


@app.post("/analyze-intent", response_model=IntentAnalysisResponse, tags=["Security"])
def analyze_intent_endpoint(request: IntentAnalysisRequest) -> IntentAnalysisResponse:
    """Analyzes text for obfuscated prompt injections and intent divergence."""
    try:
        response = analyzer.analyze_intent(request)

        # Log threat if malicious injection or suspicious payload detected
        if response.verdict in ("INJECTION", "SUSPICIOUS"):
            threat_id = f"inj_{uuid.uuid4().hex[:8]}"
            log_threat(
                ThreatEvent(
                    id=threat_id,
                    timestamp=response.timestamp,
                    attack_type="INJECTION",
                    source_url=request.source_url or "unknown",
                    risk_score=response.intent_divergence_score,
                    details={
                        "verdict": response.verdict,
                        "obfuscation_detected": response.obfuscation_detected,
                        "obfuscation_type": response.obfuscation_type,
                        "reasoning": response.reasoning,
                        "payload_hash": hashlib.sha256(
                            request.user_input.encode("utf-8")
                        ).hexdigest(),
                    },
                )
            )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}") from e


@app.post(
    "/check-exfiltration",
    response_model=ExfiltrationCheckResponse,
    tags=["Security"],
)
def check_exfiltration_endpoint(
    request: ExfiltrationCheckRequest,
) -> ExfiltrationCheckResponse:
    """Enforces capability policies to prevent tainted data from leaking to untrusted domains."""
    try:
        parsed_url = urlparse(request.destination_url)
        hostname = (parsed_url.hostname or "").lower()

        is_suspicious_domain = any(
            sus in request.destination_url.lower() for sus in SUSPICIOUS_INDICATORS
        )
        is_allowed = hostname in ALLOWED_DESTINATIONS

        # Block if tainted data is bound for an untrusted or suspicious destination
        should_block = (request.taint_level == "HIGH" and not is_allowed) or is_suspicious_domain

        if should_block:
            reason = (
                f"Tainted credential/token data (hash {request.payload_hash[:10]}...) "
                f"destined for unauthorized domain '{hostname}' was intercepted and blocked."
            )
            action = "BLOCKED_AND_LOGGED"
            risk = "CRITICAL" if is_suspicious_domain else "HIGH"

            log_threat(
                ThreatEvent(
                    id=f"exf_{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.now(UTC).isoformat(),
                    attack_type="EXFILTRATION",
                    source_url=request.source_url,
                    risk_score=0.98 if risk == "CRITICAL" else 0.85,
                    details={
                        "destination_url": request.destination_url,
                        "taint_level": request.taint_level,
                        "trigger_element": request.trigger_element,
                        "payload_hash": request.payload_hash,
                        "reason": reason,
                    },
                )
            )
        else:
            reason = (
                f"Outbound transmission to '{hostname}' verified safe under current taint policy."
            )
            action = "ALLOWED"
            risk = "LOW"

        return ExfiltrationCheckResponse(
            blocked=should_block,
            risk_level=risk,
            reason=reason,
            action_taken=action,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exfiltration check failed: {str(e)}") from e


@app.post(
    "/check-visual-similarity",
    response_model=VisualSimilarityResponse,
    tags=["Security"],
)
def check_visual_similarity_endpoint(
    request: VisualSimilarityRequest,
) -> VisualSimilarityResponse:
    """Checks page layout perceptual hash for visual phishing clones."""
    try:
        response = analyzer.check_visual_similarity(request)

        if response.is_phishing:
            log_threat(
                ThreatEvent(
                    id=f"phi_{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.now(UTC).isoformat(),
                    attack_type="PHISHING",
                    source_url=request.url,
                    risk_score=response.confidence,
                    details={
                        "matched_brand": response.matched_brand,
                        "hash_distance": response.hash_distance,
                        "screenshot_hash": request.screenshot_hash,
                        "reason": response.reason,
                    },
                )
            )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual check failed: {str(e)}") from e


@app.get("/threat-intel", tags=["Telemetry"])
def get_threat_intel_endpoint(limit: int = 50) -> dict:
    """Returns real-time threat feed and aggregated metrics for the dashboard."""
    try:
        threats = get_recent_threats(limit=limit)
        stats = get_threat_stats()
        return {
            "threats": threats,
            "stats": stats.model_dump(),
        }
    except Exception as e:
        detail_msg = f"Failed to fetch threat intel: {str(e)}"
        raise HTTPException(status_code=500, detail=detail_msg) from e


@app.post("/threat-intel/reset", tags=["Telemetry"])
def reset_threat_intel_endpoint() -> dict:
    """Clears all logged threat telemetry."""
    try:
        clear_all_threats()
        return {"status": "cleared", "total_threats": 0}
    except Exception as e:
        detail_msg = f"Failed to reset threat telemetry: {str(e)}"
        raise HTTPException(status_code=500, detail=detail_msg) from e


@app.post(
    "/check-canary",
    response_model=CanaryCheckResponse,
    tags=["Security"],
)
def check_canary_endpoint(request: CanaryCheckRequest) -> CanaryCheckResponse:
    """Detects system prompt canary token extraction in LLM responses and sanitizes output."""
    try:
        response_lower = request.model_response.lower()
        canary_clean = request.canary_token.strip()
        canary_lower = canary_clean.lower()

        # Check for full exact canary match
        full_match = canary_lower in response_lower

        # Check for partial matches (first or last 8 chars) if canary is sufficiently long
        partial_match = False
        if len(canary_clean) >= 16:
            head_part = canary_clean[:8].lower()
            tail_part = canary_clean[-8:].lower()
            partial_match = head_part in response_lower or tail_part in response_lower

        leaked = full_match or partial_match
        confidence = 1.0 if full_match else (0.75 if partial_match else 0.0)

        if leaked:
            # Mask the canary token in the sanitized response
            sanitized = re.sub(
                re.escape(canary_clean),
                "[REDACTED_SYSTEM_INSTRUCTION]",
                request.model_response,
                flags=re.IGNORECASE,
            )

            # Mask/hash the canary for zero data exposure logging
            canary_hash = hashlib.sha256(canary_clean.encode("utf-8")).hexdigest()[:16]
            threat_id = f"can_{uuid.uuid4().hex[:8]}"

            log_threat(
                ThreatEvent(
                    id=threat_id,
                    timestamp=datetime.now(UTC).isoformat(),
                    attack_type="SYSTEM_PROMPT_LEAK",
                    source_url=request.source_url or "unknown",
                    risk_score=0.95,
                    details={
                        "attack_subfamily": "canary_token_extraction",
                        "canary_hash": canary_hash,
                        "session_id": request.session_id or "unknown",
                        "confidence": confidence,
                        "partial_match": partial_match,
                    },
                )
            )

            return CanaryCheckResponse(
                canary_leaked=True,
                confidence=confidence,
                blocked=True,
                sanitized_response=sanitized,
                reason=(
                    f"System prompt canary extraction detected (confidence: {confidence:.0%}). "
                    "Confidential system instruction suppressed."
                ),
            )

        return CanaryCheckResponse(
            canary_leaked=False,
            confidence=0.0,
            blocked=False,
            sanitized_response=request.model_response,
            reason="No canary token detected in model response.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Canary check failed: {str(e)}") from e

