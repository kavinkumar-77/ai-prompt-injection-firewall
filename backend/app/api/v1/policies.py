"""API v1 endpoints for security policies and gating configuration."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.pipeline import pipeline

router = APIRouter(prefix="/v1/policies", tags=["Policies"])


@router.get("")
def list_policies() -> list[dict[str, Any]]:
    """Returns currently loaded security inspection policies and active thresholds."""
    return [
        {
            "id": pipeline.decision_engine.policy_id,
            "name": "Default Strict Security Policy",
            "block_threshold": pipeline.decision_engine.block_threshold,
            "warn_threshold": pipeline.decision_engine.warn_threshold,
            "active_layers": [
                "normalizer",
                "rules",
                "classifier",
                "context",
                "toolcall",
            ],
            "description": (
                "Standard multi-layer defense enforcing zero-trust "
                "indirect injection filtering and strict delimiter checks."
            ),
        }
    ]
