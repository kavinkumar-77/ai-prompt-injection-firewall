"""Safety and PII scanner for dataset verification.

Ensures zero personal data, telephone numbers, emails, or active API keys are
stored or processed in dataset records.
"""

import re
from typing import Any

# Regex patterns for personal and credential data
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
OPENAI_KEY_REGEX = re.compile(r"\bsk-[a-zA-Z0-9]{20,}\b")
AWS_KEY_REGEX = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
GITHUB_TOKEN_REGEX = re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{36,}\b")
GENERIC_BEARER_REGEX = re.compile(r"\bbearer\s+[a-zA-Z0-9\-_]{32,}\b", re.IGNORECASE)


def scan_for_pii_and_secrets(text: str) -> tuple[bool, list[str]]:
    """Scans text for personal data and credentials.

    Returns:
        Tuple of (is_clean, list_of_detected_types)
    """
    flags: list[str] = []

    if EMAIL_REGEX.search(text):
        flags.append("EMAIL_ADDRESS")
    if PHONE_REGEX.search(text):
        flags.append("PHONE_NUMBER")
    if OPENAI_KEY_REGEX.search(text):
        flags.append("OPENAI_API_KEY")
    if AWS_KEY_REGEX.search(text):
        flags.append("AWS_ACCESS_KEY")
    if GITHUB_TOKEN_REGEX.search(text):
        flags.append("GITHUB_TOKEN")
    if GENERIC_BEARER_REGEX.search(text):
        flags.append("BEARER_TOKEN")

    return (len(flags) == 0, flags)


def sanitize_text(text: str) -> str:
    """Masks any accidental PII or secret patterns with dummy tokens."""
    t = EMAIL_REGEX.sub("[ANONYMIZED_EMAIL]", text)
    t = PHONE_REGEX.sub("[ANONYMIZED_PHONE]", t)
    t = OPENAI_KEY_REGEX.sub("[REDACTED_API_KEY]", t)
    t = AWS_KEY_REGEX.sub("[REDACTED_AWS_KEY]", t)
    t = GITHUB_TOKEN_REGEX.sub("[REDACTED_GH_TOKEN]", t)
    t = GENERIC_BEARER_REGEX.sub("bearer [REDACTED_TOKEN]", t)
    return t


def validate_dataset_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Scans a batch of dataset records and filters or sanitizes any flagged content."""
    clean_records: list[dict[str, Any]] = []
    sanitized_count = 0

    for r in records:
        text = r.get("text", "")
        is_clean, flags = scan_for_pii_and_secrets(text)
        if not is_clean:
            r["text"] = sanitize_text(text)
            sanitized_count += 1
        clean_records.append(r)

    return clean_records, sanitized_count
