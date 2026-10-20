"""Data access repositories for security events and API keys."""

from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.storage.db import ApiKeyModel, SecurityEventModel


def hash_text_payload(text: str) -> str:
    """Computes SHA-256 digest of untrusted text payload for privacy-preserving storage."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class EventRepository:
    """Handles persistence and retrieval of security events."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def record_event(
        self,
        request_id: str,
        source: str,
        text: str,
        verdict: str,
        risk_score: float,
        policy_id: str,
        latency_ms: float,
        primary_reason: str | None = None,
        layers: list[dict[str, Any]] | None = None,
        api_key_id: str | None = None,
    ) -> SecurityEventModel:
        """Persists a new security audit event with SHA-256 payload hashing."""
        text_hash = hash_text_payload(text)
        layers_json = json.dumps(layers) if layers else None

        event = SecurityEventModel(
            request_id=request_id,
            source=source,
            text_hash=text_hash,
            verdict=verdict,
            risk_score=risk_score,
            policy_id=policy_id,
            latency_ms=latency_ms,
            primary_reason=primary_reason,
            layers_json=layers_json,
            api_key_id=api_key_id,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list_events(
        self,
        limit: int = 50,
        offset: int = 0,
        verdict: str | None = None,
    ) -> list[SecurityEventModel]:
        """Queries events with pagination and optional verdict filtering."""
        query = self.db.query(SecurityEventModel)
        if verdict:
            query = query.filter(SecurityEventModel.verdict == verdict)
        return query.order_by(SecurityEventModel.id.desc()).offset(offset).limit(limit).all()

    def count_events(self) -> int:
        """Returns total number of recorded security events."""
        return self.db.query(SecurityEventModel).count()

    def clear_events(self) -> int:
        """Clears all stored security events."""
        deleted = self.db.query(SecurityEventModel).delete()
        self.db.commit()
        return deleted


class ApiKeyRepository:
    """Handles storage, validation, and lifecycle of API keys."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_key(
        self,
        raw_key: str,
        role: str = "client",
        description: str | None = None,
    ) -> ApiKeyModel:
        """Stores a newly generated API key, recording only its hash and prefix."""
        hashed = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        prefix = raw_key[:12] if len(raw_key) >= 12 else raw_key[:4]
        key_id = str(uuid.uuid4())

        record = ApiKeyModel(
            id=key_id,
            prefix=prefix,
            hashed_key=hashed,
            role=role,
            description=description,
            is_active=True,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def validate_key(self, raw_key: str) -> ApiKeyModel | None:
        """Validates incoming raw API key against stored SHA-256 hashes."""
        hashed = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        return (
            self.db.query(ApiKeyModel)
            .filter(ApiKeyModel.hashed_key == hashed, ApiKeyModel.is_active.is_(True))
            .first()
        )

    def list_keys(self) -> list[ApiKeyModel]:
        """Lists registered API keys (never returning hashes)."""
        return self.db.query(ApiKeyModel).order_by(ApiKeyModel.created_at.desc()).all()

    def revoke_key(self, key_id: str) -> bool:
        """Revokes an active API key."""
        record = self.db.query(ApiKeyModel).filter(ApiKeyModel.id == key_id).first()
        if not record:
            return False
        record.is_active = False
        self.db.commit()
        return True
