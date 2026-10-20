"""FastAPI and Starlette middleware for Project AEGIS inspection."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

try:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import JSONResponse, Response
except ImportError:
    BaseHTTPMiddleware = object  # type: ignore[misc,assignment]
    Request = Any  # type: ignore[misc,assignment]
    Response = Any  # type: ignore[misc,assignment]
    JSONResponse = Any  # type: ignore[misc,assignment]

from aegis_client.client import AsyncAegisClient


class AegisFirewallMiddleware(BaseHTTPMiddleware):
    """FastAPI/Starlette middleware inspecting inbound prompt payloads against AEGIS."""

    def __init__(
        self,
        app: Any,
        gateway_url: str = "http://localhost:8000",
        api_key: str | None = None,
        block_on_threat: bool = True,
        inspect_paths: list[str] | None = None,
    ) -> None:
        super().__init__(app)
        self.gateway_url = gateway_url
        self.api_key = api_key
        self.block_on_threat = block_on_threat
        self.inspect_paths = inspect_paths or ["/chat", "/generate", "/api/v1/chat", "/v1/chat"]
        self.aegis_client = AsyncAegisClient(base_url=gateway_url, api_key=api_key)

    async def dispatch(self, request: Request, call_next: Callable[[Request], Any]) -> Response:
        """Inspects request body text on targeted paths."""
        if request.method == "POST" and any(
            request.url.path.startswith(p) for p in self.inspect_paths
        ):
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body_json = json.loads(body_bytes.decode("utf-8"))
                    # Extract prompt candidate
                    prompt_text = (
                        body_json.get("prompt")
                        or body_json.get("input")
                        or body_json.get("message")
                        or (body_json.get("messages") and body_json["messages"][-1].get("content"))
                    )

                    if prompt_text and isinstance(prompt_text, str):
                        scan_result = await self.aegis_client.scan(text=prompt_text, source="user")
                        if self.block_on_threat and scan_result.is_blocked:
                            return JSONResponse(
                                status_code=403,
                                content={
                                    "error": {
                                        "type": "aegis_security_violation",
                                        "message": (
                                            f"Prompt injection blocked: {scan_result.rationale}"
                                        ),
                                        "risk_score": scan_result.risk_score,
                                        "request_id": scan_result.request_id,
                                    }
                                },
                            )
            except Exception:
                pass  # Do not disrupt downstream service on inspection error unless strict

        response: Response = await call_next(request)
        return response
