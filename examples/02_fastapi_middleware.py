"""Example 02: Protecting a FastAPI application using AegisFirewallMiddleware.

Demonstrates non-invasive middleware insertion that inspects inbound prompt payloads
and returns HTTP 403 Forbidden on policy violations before any LLM is contacted.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add repo to pythonpath for local development
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "aegis_client"))

from aegis_client.middleware import AegisFirewallMiddleware
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Customer Assistant API (Protected by AEGIS)")

# Register AEGIS Firewall Middleware
app.add_middleware(
    AegisFirewallMiddleware,
    gateway_url="http://localhost:8000",
    block_on_threat=True,
    inspect_paths=["/chat", "/generate"],
)


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat_endpoint(req: ChatRequest) -> dict[str, str]:
    """Endpoint reached only if AEGIS passes the inbound payload."""
    return {
        "status": "success",
        "reply": f"Assistant received: '{req.message}' and generated safe response.",
    }


if __name__ == "__main__":
    print("Run with: uvicorn examples.02_fastapi_middleware:app --port 8080")
