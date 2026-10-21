"""API v1 endpoints for threat audit logs and security events."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.database import clear_all_threats, get_recent_threats, get_threat_stats
from app.storage.demo_seed import seed_demo_events

router = APIRouter(prefix="/v1/events", tags=["Events"])


@router.get("")
def list_events(limit: int = 50) -> list[dict[str, Any]]:
    """Retrieves recent recorded threat audit events."""
    return get_recent_threats(limit=limit)


@router.get("/stats")
def event_stats() -> dict[str, Any]:
    """Retrieves aggregated threat event statistics."""
    stats = get_threat_stats()
    return stats.model_dump()


@router.post("/clear")
def clear_events() -> dict[str, str]:
    """Clears all stored historical threat events."""
    clear_all_threats()
    return {"status": "cleared", "message": "Threat events successfully cleared."}


@router.post("/seed")
def seed_events() -> dict[str, Any]:
    """Seeds labeled demo events (source: demo_seed) for initial UI demonstration."""
    count = seed_demo_events()
    return {
        "status": "seeded",
        "count": count,
        "message": f"Successfully seeded {count} labeled demo events.",
    }
