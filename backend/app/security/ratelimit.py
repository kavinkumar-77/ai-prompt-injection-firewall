"""Token bucket rate limiter for Project AEGIS Gateway."""

from __future__ import annotations

import time
from threading import Lock
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.security.auth import get_current_client
from app.storage.db import ApiKeyModel


class TokenBucket:
    """Thread-safe token bucket rate limiter."""

    def __init__(self, rate_per_minute: float = 60.0, capacity: float = 60.0) -> None:
        self.rate = rate_per_minute / 60.0  # tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.monotonic()
        self.lock = Lock()

    def consume(self, tokens: float = 1.0) -> tuple[bool, int]:
        """Consumes tokens if available, returning (allowed, retry_after_seconds)."""
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now

            # Replenish tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True, 0

            # Calculate wait time until enough tokens are replenished
            needed = tokens - self.tokens
            retry_after = int(needed / self.rate) + 1
            return False, retry_after


class RateLimitManager:
    """Manages token buckets partitioned by client identifier."""

    def __init__(
        self, default_rate_per_min: float = 120.0, default_capacity: float = 120.0
    ) -> None:
        self.default_rate = default_rate_per_min
        self.default_capacity = default_capacity
        self.buckets: dict[str, TokenBucket] = {}
        self.lock = Lock()

    def get_bucket(self, client_id: str) -> TokenBucket:
        with self.lock:
            if client_id not in self.buckets:
                self.buckets[client_id] = TokenBucket(
                    rate_per_minute=self.default_rate,
                    capacity=self.default_capacity,
                )
            return self.buckets[client_id]

    def check(self, client_id: str) -> None:
        """Enforces rate limit for client_id, raising HTTP 429 if exceeded."""
        bucket = self.get_bucket(client_id)
        allowed, retry_after = bucket.consume(1.0)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )


# Global default rate limit manager
limiter = RateLimitManager()


def rate_limit_check(
    request: Request,
    client: Annotated[ApiKeyModel | None, Depends(get_current_client)],
) -> None:
    """FastAPI dependency enforcing rate limits per client key or client host IP."""
    client_id = client.id if client else (request.client.host if request.client else "unknown_ip")
    limiter.check(client_id)
