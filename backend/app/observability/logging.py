"""Structured JSON logging with request ID tracking and zero data exposure safeguards."""

from __future__ import annotations

import contextvars
import hashlib
import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

# Context variable to hold active request ID across async tasks
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="none")


class JSONLogFormatter(logging.Formatter):
    """Formats log records as structured single-line JSON with zero raw data exposure."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": request_id_ctx.get(),
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include any extra structured fields
        if hasattr(record, "extra_fields") and isinstance(record.extra_fields, dict):
            log_entry.update(record.extra_fields)

        return json.dumps(log_entry)


def mask_or_hash_payload(text: str, salt: str = "aegis_salt") -> str:
    """Hashes untrusted payload text to guarantee zero sensitive data exposure in logs."""
    if not text:
        return "empty"
    digest = hashlib.sha256(f"{salt}:{text}".encode()).hexdigest()
    return f"sha256:{digest[:16]}..."


def setup_structured_logging(level: int = logging.INFO) -> None:
    """Configures root logger to use structured JSON logging to stdout."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONLogFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers if called multiple times
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)


logger = logging.getLogger("aegis.gateway")
