"""Sync and Async HTTP clients for the Project AEGIS Gateway."""

from __future__ import annotations

from typing import Any, Literal

import httpx

from aegis_client.models import ScanResult, ToolCallDecision


class AegisClient:
    """Synchronous client for Project AEGIS AI Security Gateway."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        headers = {}
        if api_key:
            headers["X-API-Key"] = api_key
        self._client = httpx.Client(base_url=self.base_url, headers=headers, timeout=timeout)

    def scan(
        self,
        text: str,
        source: Literal["system", "user", "retrieved", "tool_output"] = "user",
        policy_preset: str | None = None,
        system_prompt: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ScanResult:
        """Scans text for prompt injection, secrets, PII, and exfiltration."""
        payload: dict[str, Any] = {
            "text": text,
            "source": source,
            "metadata": metadata or {},
        }
        if policy_preset:
            payload["policy_preset"] = policy_preset
        if system_prompt:
            payload["system_prompt"] = system_prompt

        resp = self._client.post("/v1/scan", json=payload)
        resp.raise_for_status()
        return ScanResult.model_validate(resp.json())

    def scan_tool_call(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        is_tainted: bool = False,
        agent_role: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ToolCallDecision:
        """Verifies if an agent tool invocation is permitted under active capability policy."""
        payload = {
            "tool_name": tool_name,
            "arguments": arguments,
            "is_tainted": is_tainted,
            "agent_role": agent_role,
            "metadata": metadata or {},
        }
        resp = self._client.post("/v1/scan/tool-call", json=payload)
        resp.raise_for_status()
        return ToolCallDecision.model_validate(resp.json())

    def close(self) -> None:
        """Closes underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> AegisClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


class AsyncAegisClient:
    """Asynchronous client for Project AEGIS AI Security Gateway."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        headers = {}
        if api_key:
            headers["X-API-Key"] = api_key
        self._client = httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=timeout)

    async def scan(
        self,
        text: str,
        source: Literal["system", "user", "retrieved", "tool_output"] = "user",
        policy_preset: str | None = None,
        system_prompt: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ScanResult:
        """Asynchronously scans text for prompt injection and security violations."""
        payload: dict[str, Any] = {
            "text": text,
            "source": source,
            "metadata": metadata or {},
        }
        if policy_preset:
            payload["policy_preset"] = policy_preset
        if system_prompt:
            payload["system_prompt"] = system_prompt

        resp = await self._client.post("/v1/scan", json=payload)
        resp.raise_for_status()
        return ScanResult.model_validate(resp.json())

    async def scan_tool_call(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        is_tainted: bool = False,
        agent_role: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ToolCallDecision:
        """Asynchronously verifies an agent tool invocation against capability policies."""
        payload = {
            "tool_name": tool_name,
            "arguments": arguments,
            "is_tainted": is_tainted,
            "agent_role": agent_role,
            "metadata": metadata or {},
        }
        resp = await self._client.post("/v1/scan/tool-call", json=payload)
        resp.raise_for_status()
        return ToolCallDecision.model_validate(resp.json())

    async def aclose(self) -> None:
        """Closes underlying asynchronous HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> AsyncAegisClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.aclose()
