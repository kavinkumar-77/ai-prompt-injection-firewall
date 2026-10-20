"""Deterministic regex rule signatures for Project AEGIS.

Each rule defines an explicit rule identifier, severity, OWASP LLM category,
regex patterns, and forensic evidence extraction.
"""

from __future__ import annotations

import re
import time
from re import Pattern
from typing import Final

from app.core.models import Evidence, LayerResult, SeverityLevel


class SecurityRule:
    """Represents a discrete deterministic inspection rule."""

    def __init__(
        self,
        rule_id: str,
        name: str,
        severity: SeverityLevel,
        owasp_category: str,
        risk_score: float,
        description: str,
        patterns: list[Pattern[str]],
    ) -> None:
        self.rule_id = rule_id
        self.name = name
        self.severity = severity
        self.owasp_category = owasp_category
        self.risk_score = risk_score
        self.description = description
        self.patterns = patterns

    def evaluate(self, text: str) -> list[Evidence]:
        """Scans text against rule patterns and returns forensic evidence matches."""
        evidence: list[Evidence] = []
        for pattern in self.patterns:
            for match in pattern.finditer(text):
                matched_sub = match.group()[:60]
                evidence.append(
                    Evidence(
                        kind=f"rule_match_{self.rule_id}",
                        span=(match.start(), match.end()),
                        detail=f"[{self.rule_id}] {self.name}: matched substring '{matched_sub}'",
                    )
                )
        return evidence


# Standard Rule Definitions
RULES_CATALOG: Final[list[SecurityRule]] = [
    SecurityRule(
        rule_id="R-DELIM-001",
        name="Chat Template Delimiter Injection",
        severity="CRITICAL",
        owasp_category="LLM01:2025-Prompt-Injection",
        risk_score=0.98,
        description="Detects control tokens attempting to forge system or assistant turns.",
        patterns=[
            re.compile(r"<\|im_start\|>", re.IGNORECASE),
            re.compile(r"<\|im_end\|>", re.IGNORECASE),
            re.compile(r"\[INST\]", re.IGNORECASE),
            re.compile(r"\[/INST\]", re.IGNORECASE),
            re.compile(r"<<SYS>>", re.IGNORECASE),
            re.compile(r"<</SYS>>", re.IGNORECASE),
            re.compile(r"<s>\[SYSTEM\]", re.IGNORECASE),
            re.compile(r"(?is)\bHuman:\s*.*?\bAssistant:\s*"),
        ],
    ),
    SecurityRule(
        rule_id="R-EXFIL-001",
        name="Markdown / HTML Image Data Exfiltration",
        severity="CRITICAL",
        owasp_category="LLM02:2025-Sensitive-Information-Disclosure",
        risk_score=0.97,
        description=(
            "Detects untrusted image tags or markdown links leaking data via query parameters."
        ),
        patterns=[
            re.compile(
                r"!\[.*?\]\(https?://[^\s)]+?(?:cookie|token|auth|key|secret|leak|exfil|data|session)=.*?\)",
                re.IGNORECASE,
            ),
            re.compile(
                r"!\[.*?\]\(https?://(?:evil|attacker|webhook|requestbin|pipedream|pastebin)[^\s)]*?\)",
                re.IGNORECASE,
            ),
            re.compile(
                r"<img\s+[^>]*?src=['\"]https?://[^\s'\"]+?(?:leak|steal|token|cookie)=.*?['\"][^>]*?>",
                re.IGNORECASE,
            ),
        ],
    ),
    SecurityRule(
        rule_id="R-JAIL-001",
        name="Roleplay Jailbreak Framing",
        severity="HIGH",
        owasp_category="LLM01:2025-Prompt-Injection",
        risk_score=0.95,
        description=(
            "Detects persona adoption or overrides designed to bypass ethical boundaries."
        ),
        patterns=[
            re.compile(
                r"(?i)(?:you\s+are\s+now|pretend\s+(?:that\s+)?you\s+are)\s+(?:in\s+)?(?:DAN|STAN|DUDE|AIM|Developer\s+Mode|unrestricted|god\s+mode)"
            ),
            re.compile(
                r"ignore\s+(?:all\s+)?(?:safety|content|ethical)\s+(?:rules|policies|guidelines|filters)",
                re.IGNORECASE,
            ),
            re.compile(r"from\s+now\s+on,?\s+you\s+(?:will|must)\s+act\s+as", re.IGNORECASE),
            re.compile(
                r"hypothetical\s+scenario\s+where\s+you\s+have\s+no\s+(?:rules|morals|limits)",
                re.IGNORECASE,
            ),
        ],
    ),
    SecurityRule(
        rule_id="R-OVERRIDE-001",
        name="Direct Instruction Override",
        severity="CRITICAL",
        owasp_category="LLM01:2025-Prompt-Injection",
        risk_score=0.96,
        description="Detects instructions commanding the model to disregard prior directives.",
        patterns=[
            re.compile(
                r"(?i)(?:disregard|ignore|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directives|rules)",
            ),
            re.compile(r"(?i)(?:system\s+override|admin\s+override)\s*:"),
            re.compile(r"(?i)new\s+system\s+directive\s*:"),
        ],
    ),
    SecurityRule(
        rule_id="R-SECRET-001",
        name="Exposed API Key / Credential Pattern",
        severity="CRITICAL",
        owasp_category="LLM02:2025-Sensitive-Information-Disclosure",
        risk_score=0.95,
        description="Detects high-entropy API keys or credentials embedded within prompts.",
        patterns=[
            re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b"),
            re.compile(r"\bsk-ant-[A-Za-z0-9_-]{32,}\b"),
            re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
            re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
            re.compile(r"\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*\b"),
        ],
    ),
]


class RulesLayer:
    """Evaluates text against deterministic security rules."""

    def __init__(self, rules: list[SecurityRule] | None = None) -> None:
        self.layer_name = "rules"
        self.rules = rules or RULES_CATALOG

    def process(self, text: str) -> LayerResult:
        """Executes rules catalog and compiles evidence spans and maximum risk score."""
        start_time = time.perf_counter()
        if not text:
            elapsed = (time.perf_counter() - start_time) * 1000
            return LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        all_evidence: list[Evidence] = []
        max_score = 0.0
        triggered_rules: list[str] = []

        for rule in self.rules:
            evidences = rule.evaluate(text)
            if evidences:
                all_evidence.extend(evidences)
                triggered_rules.append(rule.rule_id)
                if rule.risk_score > max_score:
                    max_score = rule.risk_score

        elapsed = (time.perf_counter() - start_time) * 1000
        label = f"violation_{','.join(triggered_rules)}" if triggered_rules else "clean"

        return LayerResult(
            layer=self.layer_name,
            score=max_score,
            label=label,
            evidence=all_evidence,
            latency_ms=round(elapsed, 3),
        )
