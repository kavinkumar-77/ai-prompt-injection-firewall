"""Authentication and API key verification for Project AEGIS Gateway."""

from __future__ import annotations

import hashlib
import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.storage.db import ApiKeyModel, get_db
from app.storage.repositories import ApiKeyRepository

AUTH_ENABLED = os.getenv("AEGIS_AUTH_ENABLED", "false").lower() in ("true", "1", "yes")


def hash_api_key(raw_key: str) -> str:
    """Computes SHA-256 hash of API key for storage and constant-time verification."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def extract_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> str | None:
    """Extracts raw key from X-API-Key or Authorization Bearer header."""
    if x_api_key:
        return x_api_key.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def get_current_client(
    raw_key: Annotated[str | None, Depends(extract_api_key)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiKeyModel | None:
    """Validates API key and returns authenticated ApiKeyModel, or None if auth is disabled."""
    if not AUTH_ENABLED:
        # Dev bypass when auth is not explicitly enabled
        return ApiKeyModel(
            id="dev_bypass_id",
            prefix="aegis_dev",
            hashed_key="dev_bypass_hash",
            role="admin",
            description="Development default bypass",
        )

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required API key (provide X-API-Key or Authorization: Bearer).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    repo = ApiKeyRepository(db)
    record = repo.validate_key(raw_key)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return record


def require_admin(
    client: Annotated[ApiKeyModel | None, Depends(get_current_client)],
) -> ApiKeyModel | None:
    """Requires authenticated client to possess admin privileges."""
    if not AUTH_ENABLED:
        return client

    if not client or client.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this endpoint.",
        )
    return client
