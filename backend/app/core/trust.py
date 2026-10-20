"""Trust-aware evaluation for incoming text and execution context."""

from __future__ import annotations

from typing import Final

from app.core.models import TrustSource

# Risk multiplier matrix by input source
# Instructions found in retrieved chunks or tool outputs represent indirect prompt injection
# and receive an elevated risk weighting.
TRUST_MULTIPLIERS: Final[dict[TrustSource, float]] = {
    "system": 0.2,  # System developer prompt: highest inherent trust
    "user": 1.0,  # Direct user message: baseline reference trust
    "retrieved": 1.35,  # RAG chunks, scraped websites, ingested PDFs: elevated indirect risk
    "tool_output": 1.45,  # External API or tool outputs: highest indirect injection risk
}

# Source sensitivity descriptions for explanation and forensic reporting
TRUST_DESCRIPTIONS: Final[dict[TrustSource, str]] = {
    "system": "Trusted developer instruction context.",
    "user": "Interactive user input subject to direct injection filtering.",
    "retrieved": "External untrusted document/chunk subjected to indirect injection inspection.",
    "tool_output": (
        "Agent tool return payload subjected to high-scrutiny indirect injection inspection."
    ),
}


def get_trust_multiplier(source: TrustSource) -> float:
    """Returns the risk weighting multiplier for a given trust source."""
    return TRUST_MULTIPLIERS.get(source, 1.0)


def adjust_score_for_trust(raw_score: float, source: TrustSource) -> float:
    """Calculates effective risk score factoring in source trust level."""
    mult = get_trust_multiplier(source)
    # If the score is non-zero, scale it according to the trust multiplier, bounded to [0.0, 1.0]
    scaled = raw_score * mult
    return min(1.0, max(0.0, round(scaled, 3)))
