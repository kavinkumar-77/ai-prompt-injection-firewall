"""API v1 endpoints for operational telemetry and system metrics."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.observability.metrics import metrics_collector

router = APIRouter(prefix="/v1/metrics", tags=["Metrics"])


@router.get("")
def get_metrics() -> dict[str, Any]:
    """Retrieves real-time gateway execution statistics, latencies, and verdict distributions."""
    return metrics_collector.get_summary()
