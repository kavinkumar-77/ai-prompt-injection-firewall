"""API v1 endpoints for serving reproducible model and lab evaluation data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v1/eval", tags=["Evaluation"])

ROOT_DIR = Path(__file__).resolve().parents[4]
ML_REPORTS_DIR = ROOT_DIR / "ml" / "reports"
LAB_REPORTS_DIR = ROOT_DIR / "lab" / "reports"


@router.get("/metrics")
def get_model_evaluation_metrics() -> dict[str, Any]:
    """Returns trained ML detector evaluation results (F1, precision, ROC/PR, confusion matrix)."""
    metrics_file = ML_REPORTS_DIR / "metrics.json"
    if not metrics_file.is_file():
        raise HTTPException(status_code=404, detail="ML evaluation metrics not found")

    with open(metrics_file, encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))


@router.get("/lab")
def get_attack_lab_summary() -> dict[str, Any]:
    """Returns Attack Lab batch execution summary (ASR without AEGIS vs with AEGIS)."""
    lab_file = LAB_REPORTS_DIR / "summary.json"
    if not lab_file.is_file():
        raise HTTPException(status_code=404, detail="Attack Lab summary report not found")

    with open(lab_file, encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))
