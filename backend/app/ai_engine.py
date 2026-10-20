"""[DEPRECATED] Compatibility shim for legacy ai_engine module.

This module is retained for backward compatibility. Use `app.layers.legacy_tfidf`
for baseline comparisons, or the primary `AegisPipeline` in `app.core.pipeline`.
"""

from app.layers.legacy_tfidf import (
    ATTACK_PROTOTYPES,
    BENIGN_HARD_NEGATIVES,
    CHAT_TEMPLATE_DELIMITERS,
    MARKDOWN_EXFILTRATION_PATTERNS,
    ROLEPLAY_JAILBREAK_PATTERNS,
    AISemanticEngine,
    LegacyTFIDFEngine,
    legacy_tfidf_engine,
)

# Global compatibility instance
ai_engine = legacy_tfidf_engine

__all__ = [
    "ai_engine",
    "AISemanticEngine",
    "LegacyTFIDFEngine",
    "CHAT_TEMPLATE_DELIMITERS",
    "MARKDOWN_EXFILTRATION_PATTERNS",
    "ROLEPLAY_JAILBREAK_PATTERNS",
    "ATTACK_PROTOTYPES",
    "BENIGN_HARD_NEGATIVES",
]
