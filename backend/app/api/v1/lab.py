"""API v1 endpoints for the AEGIS Attack Lab."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, cast

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from lab.runner import SCENARIOS_DIR, compare_scenario

router = APIRouter(prefix="/v1/lab", tags=["Attack Lab"])

REPORTS_DIR = Path(__file__).resolve().parents[4] / "lab" / "reports"


class RunScenarioRequest(BaseModel):
    scenario_id: str = Field(..., description="ID of the scenario to execute")


@router.get("/scenarios")
def list_scenarios() -> list[dict[str, Any]]:
    """Lists all available Attack Lab test scenarios."""
    scenarios = []
    for sc_file in sorted(SCENARIOS_DIR.glob("*.yaml")):
        try:
            with open(sc_file, encoding="utf-8") as f:
                data = yaml.safe_load(f)
            scenarios.append(
                {
                    "id": data["id"],
                    "title": data["title"],
                    "category": data.get("category", "prompt_injection"),
                    "persona": data.get("persona", "WorkplaceAssistant"),
                    "description": data.get("description", ""),
                    "expected_verdict": data.get("expected_verdict", "block"),
                }
            )
        except Exception:
            continue
    return scenarios


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str) -> dict[str, Any]:
    """Retrieves detailed scenario configuration and user task."""
    sc_file = SCENARIOS_DIR / f"{scenario_id}.yaml"
    if not sc_file.is_file():
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    with open(sc_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return cast(dict[str, Any], data)


@router.post("/run")
def run_scenario_endpoint(req: RunScenarioRequest) -> dict[str, Any]:
    """Runs an Attack Lab scenario in side-by-side mode (AEGIS OFF vs ON)."""
    sc_file = SCENARIOS_DIR / f"{req.scenario_id}.yaml"
    if not sc_file.is_file():
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")

    comp_result = compare_scenario(sc_file)
    return comp_result.to_dict()


@router.get("/run/stream/{scenario_id}")
async def stream_scenario_endpoint(scenario_id: str) -> StreamingResponse:
    """Streams Attack Lab scenario execution step-by-step in real-time via SSE."""
    sc_file = SCENARIOS_DIR / f"{scenario_id}.yaml"
    if not sc_file.is_file():
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    comp_result = compare_scenario(sc_file)
    data = comp_result.to_dict()
    steps = data.get("execution_steps", [])

    async def event_generator():
        for i, step in enumerate(steps):
            is_last = i == len(steps) - 1
            payload = {
                "step_index": i,
                "total_steps": len(steps),
                "step": step,
                "is_final": is_last,
                "result": data if is_last else None,
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if not is_last:
                await asyncio.sleep(0.4)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/report")
def get_latest_report() -> dict[str, Any]:
    """Returns the latest batch evaluation summary metrics."""
    json_path = REPORTS_DIR / "summary.json"
    if not json_path.is_file():
        raise HTTPException(status_code=404, detail="Summary report not generated yet")

    with open(json_path, encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))
