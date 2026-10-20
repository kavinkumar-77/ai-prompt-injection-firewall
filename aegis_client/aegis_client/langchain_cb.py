"""LangChain-compatible security callback handler for Project AEGIS."""

from __future__ import annotations

from typing import Any

from aegis_client.client import AegisClient


class AegisSecurityCallbackHandler:
    """LangChain callback handler inspecting prompt inputs and tool invocations."""

    def __init__(
        self,
        gateway_url: str = "http://localhost:8000",
        api_key: str | None = None,
        block_on_threat: bool = True,
    ) -> None:
        self.client = AegisClient(base_url=gateway_url, api_key=api_key)
        self.block_on_threat = block_on_threat

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        **kwargs: Any,
    ) -> None:
        """Inspects prompts sent to LLM before generation."""
        for p in prompts:
            res = self.client.scan(text=p, source="user")
            if self.block_on_threat and res.is_blocked:
                raise PermissionError(f"[AEGIS Security Block]: {res.rationale}")

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        **kwargs: Any,
    ) -> None:
        """Inspects tool invocations before execution."""
        tool_name = serialized.get("name", "unknown_tool")
        decision = self.client.scan_tool_call(tool_name=tool_name, arguments={"input": input_str})
        if not decision.allowed:
            raise PermissionError(f"[AEGIS Tool Block]: {decision.reason}")
