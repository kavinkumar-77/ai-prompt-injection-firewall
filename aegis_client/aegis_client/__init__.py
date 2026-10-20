"""Project AEGIS Official Client SDK."""

from __future__ import annotations

from aegis_client.client import AegisClient, AsyncAegisClient
from aegis_client.middleware import AegisFirewallMiddleware
from aegis_client.models import (
    EvidenceSpan,
    LayerInspectionResult,
    ScanResult,
    ToolCallDecision,
)
from aegis_client.openai_wrapper import wrap_openai

__version__ = "0.1.0"

__all__ = [
    "AegisClient",
    "AsyncAegisClient",
    "AegisFirewallMiddleware",
    "EvidenceSpan",
    "LayerInspectionResult",
    "ScanResult",
    "ToolCallDecision",
    "wrap_openai",
]
