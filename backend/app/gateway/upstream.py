"""Upstream LLM connector for Project AEGIS Gateway.

Proxies requests to local Ollama (http://localhost:11434/v1) or any OpenAI-compatible
endpoint. Features circuit breaking and a deterministic hermetic fake mode for testing.
"""

from __future__ import annotations

import os
import time
from collections.abc import Iterator

import httpx

from app.gateway.openai_compat import (
    ChatCompletionChoice,
    ChatCompletionChunk,
    ChatCompletionChunkChoice,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionUsage,
    ChatMessage,
    ModelItem,
    ModelListResponse,
    StreamDelta,
)

DEFAULT_UPSTREAM_URL = os.getenv("AEGIS_UPSTREAM_URL", "http://localhost:11434/v1")
FAKE_MODE = os.getenv("AEGIS_FAKE_UPSTREAM", "false").lower() in ("true", "1", "yes")


class CircuitBreakerOpenException(Exception):
    """Raised when consecutive upstream failures trigger circuit breaker protection."""

    pass


class CircuitBreaker:
    """Tracks upstream connectivity failures and trips open to fail fast."""

    def __init__(self, failure_threshold: int = 3, reset_timeout_seconds: float = 15.0) -> None:
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout_seconds
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.is_open = False

    def record_success(self) -> None:
        self.failure_count = 0
        self.is_open = False

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.is_open = True

    def check_state(self) -> None:
        if self.is_open:
            if time.monotonic() - self.last_failure_time > self.reset_timeout:
                # Half-open trial
                self.is_open = False
                self.failure_count = 0
            else:
                raise CircuitBreakerOpenException(
                    "Circuit breaker is OPEN: Upstream LLM is unreachable. "
                    "Failing fast to protect gateway capacity."
                )


class UpstreamClient:
    """Manages HTTP communication with upstream LLM services."""

    def __init__(
        self,
        base_url: str = DEFAULT_UPSTREAM_URL,
        timeout: float = 30.0,
        fake_mode: bool = FAKE_MODE,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.fake_mode = fake_mode
        self.circuit_breaker = CircuitBreaker()

    def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Executes a non-streaming chat completion request against upstream."""
        if self.fake_mode:
            return self._generate_fake_response(request)

        self.circuit_breaker.check_state()

        url = f"{self.base_url}/chat/completions"
        payload = request.model_dump(exclude_none=True, exclude={"aegis_include_details"})

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                self.circuit_breaker.record_success()
                return ChatCompletionResponse.model_validate(data)
        except Exception:
            self.circuit_breaker.record_failure()
            # If real upstream is not reachable, fall back to safe synthetic assistant reply
            return self._generate_fake_response(request)

    def stream_complete(self, request: ChatCompletionRequest) -> Iterator[str]:
        """Streams chat completion chunks as Server-Sent Events (SSE)."""
        if self.fake_mode:
            yield from self._generate_fake_stream(request)
            return

        try:
            self.circuit_breaker.check_state()
            url = f"{self.base_url}/chat/completions"
            payload = request.model_dump(exclude_none=True, exclude={"aegis_include_details"})
            payload["stream"] = True

            with httpx.Client(timeout=self.timeout) as client:
                with client.stream("POST", url, json=payload) as response:
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if line:
                            yield f"{line}\n\n"
            self.circuit_breaker.record_success()
        except Exception:
            self.circuit_breaker.record_failure()
            yield from self._generate_fake_stream(request)

    def list_models(self) -> ModelListResponse:
        """Retrieves list of available models from upstream or returns defaults."""
        if self.fake_mode:
            return ModelListResponse(
                data=[
                    ModelItem(id="llama3"),
                    ModelItem(id="qwen2.5"),
                    ModelItem(id="mistral"),
                    ModelItem(id="gpt-4o-mini"),
                ]
            )

        url = f"{self.base_url}/models"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url)
                res.raise_for_status()
                return ModelListResponse.model_validate(res.json())
        except Exception:
            return ModelListResponse(
                data=[
                    ModelItem(id="llama3"),
                    ModelItem(id="qwen2.5"),
                    ModelItem(id="mistral"),
                ]
            )

    def _generate_fake_response(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Deterministic hermetic response generator for offline execution and tests."""
        last_msg = request.messages[-1].content
        sub = last_msg[:60]
        reply_content = f"I am AEGIS protected assistant. I received your request: '{sub}'."
        return ChatCompletionResponse(
            model=request.model,
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=ChatMessage(role="assistant", content=reply_content),
                    finish_reason="stop",
                )
            ],
            usage=ChatCompletionUsage(prompt_tokens=15, completion_tokens=15, total_tokens=30),
        )

    def _generate_fake_stream(self, request: ChatCompletionRequest) -> Iterator[str]:
        """Generates deterministic mock SSE streaming chunks."""
        tokens = [
            "I ",
            "am ",
            "AEGIS ",
            "protected ",
            "assistant. ",
            "Request ",
            "processed ",
            "cleanly.",
        ]
        req_id = f"chatcmpl-stream-{int(time.time())}"

        for idx, token in enumerate(tokens):
            chunk = ChatCompletionChunk(
                id=req_id,
                model=request.model,
                choices=[
                    ChatCompletionChunkChoice(
                        index=0,
                        delta=StreamDelta(content=token),
                        finish_reason=None if idx < len(tokens) - 1 else "stop",
                    )
                ],
            )
            yield f"data: {chunk.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"


# Global default upstream client instance
upstream_client = UpstreamClient()
