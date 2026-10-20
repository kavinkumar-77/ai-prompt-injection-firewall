"""API v1 endpoints for security policies and gating configuration."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.decision import POLICY_PRESETS
from app.core.pipeline import pipeline

router = APIRouter(prefix="/v1/policies", tags=["Policies"])

# In-memory policy change audit log
POLICY_AUDIT_LOG: list[dict[str, Any]] = [
    {
        "timestamp": datetime.now(UTC).isoformat(),
        "action": "initialize",
        "policy_id": "balanced",
        "block_threshold": 0.70,
        "warn_threshold": 0.40,
        "actor": "system",
    }
]


class PolicySwitchRequest(BaseModel):
    """Payload to switch active gateway policy preset."""

    preset: Literal["strict", "balanced", "lenient"] = Field(
        ..., description="Desired preset: strict (0.50), balanced (0.70), or lenient (0.85)"
    )


@router.get("")
def list_policies() -> list[dict[str, Any]]:
    """Returns currently loaded security policy presets, active thresholds, and available layers."""
    policies_list = [
        {
            "id": pipeline.decision_engine.policy_id,
            "name": f"Active Policy ({pipeline.decision_engine.policy_id.capitalize()})",
            "block_threshold": pipeline.decision_engine.block_threshold,
            "warn_threshold": pipeline.decision_engine.warn_threshold,
            "is_active": True,
            "active_layers": [
                "normalizer",
                "secrets",
                "rules",
                "classifier",
                "context",
                "toolcall",
            ],
            "description": "Currently active multi-layer security gateway inspection policy.",
        }
    ]

    for pid, vals in POLICY_PRESETS.items():
        if pid != pipeline.decision_engine.policy_id:
            policies_list.append(
                {
                    "id": pid,
                    "name": f"{pid.capitalize()} Policy Preset",
                    "block_threshold": vals["block_threshold"],
                    "warn_threshold": vals["warn_threshold"],
                    "is_active": False,
                    "active_layers": [
                        "normalizer",
                        "secrets",
                        "rules",
                        "classifier",
                        "context",
                        "toolcall",
                    ],
                    "description": f"Pre-configured {pid} gating threshold profile.",
                }
            )

    return policies_list


@router.get("/{policy_id}")
def get_policy(policy_id: str) -> dict[str, Any]:
    """Returns specific policy preset configuration."""
    if policy_id not in POLICY_PRESETS:
        raise HTTPException(status_code=404, detail=f"Policy preset '{policy_id}' not found")
    preset = POLICY_PRESETS[policy_id]
    return {
        "id": policy_id,
        "name": f"{policy_id.capitalize()} Policy Preset",
        "block_threshold": preset["block_threshold"],
        "warn_threshold": preset["warn_threshold"],
        "is_active": policy_id == pipeline.decision_engine.policy_id,
    }


@router.put("/active")
def switch_active_policy(req: PolicySwitchRequest) -> dict[str, Any]:
    """Switches active gateway threshold preset and records change in audit trail."""
    pipeline.decision_engine.set_preset(req.preset)
    audit_entry = {
        "timestamp": datetime.now(UTC).isoformat(),
        "action": "switch_preset",
        "policy_id": req.preset,
        "block_threshold": pipeline.decision_engine.block_threshold,
        "warn_threshold": pipeline.decision_engine.warn_threshold,
        "actor": "api_user",
    }
    POLICY_AUDIT_LOG.append(audit_entry)

    return {
        "status": "success",
        "message": f"Active policy successfully switched to '{req.preset}'",
        "active_policy": {
            "id": pipeline.decision_engine.policy_id,
            "block_threshold": pipeline.decision_engine.block_threshold,
            "warn_threshold": pipeline.decision_engine.warn_threshold,
        },
    }


@router.get("/audit/history")
def get_policy_audit_history() -> list[dict[str, Any]]:
    """Returns policy modification audit trail."""
    return POLICY_AUDIT_LOG
