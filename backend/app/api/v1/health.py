"""Health and readiness probe endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.config import settings
from app.observability.metrics import metrics_collector

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Basic health check endpoint to verify process is alive."""
    return {"status": "ok"}


@router.get("/ready")
def readiness_check() -> dict[str, Any]:
    """Readiness probe verifying system components and configuration are operational."""
    summary = metrics_collector.get_summary()
    return {
        "status": "ready",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "uptime_seconds": summary["uptime_seconds"],
    }
