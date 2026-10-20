"""Secrets and PII detection layer with provider-aware patterns and checksum validation.

Supports Shannon entropy validation, Luhn credit card checks, Verhoeff Aadhaar validation,
Indian PAN cards, API keys (OpenAI, Anthropic, AWS, GitHub, Google), private keys, JWTs,
database connection URLs, emails, and phone numbers.
Supports in-place redaction mode with typed placeholders ([SECRET:type] / [PII:type]).
"""

from __future__ import annotations

import math
import re
import time
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass

from app.core.models import Evidence, LayerResult

# Verhoeff algorithm lookup tables for Indian 12-digit Aadhaar number validation
VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def shannon_entropy(data: str) -> float:
    """Calculates Shannon entropy in bits per character."""
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    counts = Counter(data)
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def validate_luhn(card_str: str) -> bool:
    """Validates credit card numbers using Luhn checksum formula."""
    digits = [int(c) for c in card_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    parity = (len(digits) - 2) % 2
    for i, d in enumerate(digits[:-1]):
        if i % 2 == parity:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    checksum += digits[-1]
    return checksum % 10 == 0


def validate_verhoeff(num_str: str) -> bool:
    """Validates 12-digit Indian Aadhaar numbers using Verhoeff algorithm."""
    clean_digits = [int(c) for c in num_str if c.isdigit()]
    if len(clean_digits) != 12:
        return False
    # Aadhaar cannot start with 0 or 1
    if clean_digits[0] in (0, 1):
        return False
    c = 0
    for i, item in enumerate(reversed(clean_digits)):
        c = VERHOEFF_D[c][VERHOEFF_P[i % 8][item]]
    return c == 0


@dataclass
class SecretRule:
    """Discrete secret or PII detection signature."""

    name: str
    pattern: re.Pattern[str]
    category: str  # "SECRET" or "PII"
    risk_score: float
    placeholder: str
    validator: Callable[[str], bool] | None = None


SECRET_PATTERNS: list[SecretRule] = [
    # 1. API Keys & Cloud Credentials
    SecretRule(
        name="openai_api_key",
        pattern=re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b"),
        category="SECRET",
        risk_score=0.98,
        placeholder="[SECRET:openai_api_key]",
    ),
    SecretRule(
        name="anthropic_api_key",
        pattern=re.compile(r"\bsk-ant-[A-Za-z0-9_-]{32,}\b"),
        category="SECRET",
        risk_score=0.98,
        placeholder="[SECRET:anthropic_api_key]",
    ),
    SecretRule(
        name="aws_access_key",
        pattern=re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        category="SECRET",
        risk_score=0.96,
        placeholder="[SECRET:aws_access_key]",
    ),
    SecretRule(
        name="github_token",
        pattern=re.compile(r"\b(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,})\b"),
        category="SECRET",
        risk_score=0.96,
        placeholder="[SECRET:github_token]",
    ),
    SecretRule(
        name="google_api_key",
        pattern=re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
        category="SECRET",
        risk_score=0.95,
        placeholder="[SECRET:google_api_key]",
    ),
    SecretRule(
        name="database_url",
        pattern=re.compile(
            r"\b(?:postgres|postgresql|mysql|mongodb|redis)://[^\s:]+:[^\s@]+@[^\s/]+/[^\s]*\b"
        ),
        category="SECRET",
        risk_score=0.98,
        placeholder="[SECRET:database_connection_url]",
    ),
    SecretRule(
        name="private_key",
        pattern=re.compile(
            r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?"
            r"-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"
        ),
        category="SECRET",
        risk_score=1.0,
        placeholder="[SECRET:private_key]",
    ),
    SecretRule(
        name="jwt_token",
        pattern=re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
        category="SECRET",
        risk_score=0.92,
        placeholder="[SECRET:jwt_token]",
    ),
    # 2. Financial & Government PII
    SecretRule(
        name="credit_card",
        pattern=re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
        category="PII",
        risk_score=0.95,
        placeholder="[PII:credit_card]",
        validator=validate_luhn,
    ),
    SecretRule(
        name="aadhaar_number",
        pattern=re.compile(r"\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b"),
        category="PII",
        risk_score=0.95,
        placeholder="[PII:aadhaar_number]",
        validator=validate_verhoeff,
    ),
    SecretRule(
        name="pan_card",
        pattern=re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),
        category="PII",
        risk_score=0.90,
        placeholder="[PII:pan_card]",
    ),
    # 3. Communications PII
    SecretRule(
        name="email_address",
        pattern=re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        category="PII",
        risk_score=0.75,
        placeholder="[PII:email_address]",
    ),
    SecretRule(
        name="phone_number",
        pattern=re.compile(r"\b(?:\+91[\-\s]?)?[6-9]\d{9}\b|\b\+\d{1,3}[\-\s]?\d{8,14}\b"),
        category="PII",
        risk_score=0.75,
        placeholder="[PII:phone_number]",
    ),
]


class SecretsLayer:
    """Detects secrets and PII using regexes, entropy estimation, and algorithmic checksums."""

    def __init__(self, rules: list[SecretRule] | None = None) -> None:
        self.layer_name = "secrets"
        self.rules = rules or SECRET_PATTERNS

    def process(self, text: str, redact: bool = False) -> tuple[str, LayerResult]:
        """Scans for secrets and PII, returning (sanitized_text, layer_result)."""
        start_time = time.perf_counter()
        if not text:
            elapsed = (time.perf_counter() - start_time) * 1000
            return "", LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        evidence: list[Evidence] = []
        max_score = 0.0
        findings_types: set[str] = set()

        # Track replacements by index range: (start, end, replacement_text)
        replacements: list[tuple[int, int, str]] = []

        for rule in self.rules:
            for match in rule.pattern.finditer(text):
                matched_val = match.group()

                # If rule specifies a checksum validator, enforce it
                if rule.validator and not rule.validator(matched_val):
                    continue

                # Extra entropy check on raw API key strings
                if rule.name in ("openai_api_key", "anthropic_api_key"):
                    if shannon_entropy(matched_val) < 3.2:
                        continue

                max_score = max(max_score, rule.risk_score)
                findings_types.add(rule.name)

                # Mask sample for audit safety (e.g. sk-...a1b2)
                if len(matched_val) > 8:
                    masked = f"{matched_val[:4]}...{matched_val[-4:]}"
                else:
                    masked = "***"

                evidence.append(
                    Evidence(
                        kind=f"{rule.category.lower()}_leak_{rule.name}",
                        span=(match.start(), match.end()),
                        detail=(
                            f"Detected sensitive {rule.category} ({rule.name}): "
                            f"{masked} [entropy={shannon_entropy(matched_val):.2f}]"
                        ),
                    )
                )

                if redact:
                    replacements.append((match.start(), match.end(), rule.placeholder))

        # Perform in-place redactions if requested
        sanitized = text
        if redact and replacements:
            # Sort replacements in reverse order of start position to preserve offsets
            replacements.sort(key=lambda x: x[0], reverse=True)
            for start_idx, end_idx, placeholder in replacements:
                sanitized = sanitized[:start_idx] + placeholder + sanitized[end_idx:]

        elapsed = (time.perf_counter() - start_time) * 1000

        if max_score >= 0.85:
            label = "critical_sensitive_data_exposure"
        elif max_score >= 0.70:
            label = "pii_exposure"
        else:
            label = "clean"

        result = LayerResult(
            layer=self.layer_name,
            score=round(max_score, 4),
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )

        return sanitized, result
