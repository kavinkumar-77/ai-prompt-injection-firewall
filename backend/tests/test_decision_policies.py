from __future__ import annotations

from app.core.decision import DecisionEngine
from app.core.models import Evidence, LayerResult, ScanRequest


def test_decision_engine_presets():
    engine_strict = DecisionEngine(policy_id="strict")
    assert engine_strict.block_threshold == 0.50
    assert engine_strict.warn_threshold == 0.30

    engine_balanced = DecisionEngine(policy_id="balanced")
    assert engine_balanced.block_threshold == 0.70
    assert engine_balanced.warn_threshold == 0.40

    engine_lenient = DecisionEngine(policy_id="lenient")
    assert engine_lenient.block_threshold == 0.85
    assert engine_lenient.warn_threshold == 0.60


def test_decision_engine_dynamic_preset_switch():
    engine = DecisionEngine(policy_id="balanced")
    assert engine.block_threshold == 0.70

    engine.set_preset("strict")
    assert engine.policy_id == "strict"
    assert engine.block_threshold == 0.50


def test_decision_engine_verdict_and_explanations():
    engine = DecisionEngine(policy_id="balanced")
    req = ScanRequest(text="Hello world", source="user")
    layers = [
        LayerResult(
            layer="rules",
            score=0.96,
            label="violation_R-DELIM-001",
            evidence=[
                Evidence(
                    kind="rule_match_R-DELIM-001",
                    span=(0, 10),
                    detail="Chat template delimiter smuggled",
                )
            ],
            latency_ms=0.1,
        )
    ]
    verdict, score, reason, explanations = engine.evaluate(req, layers)
    assert verdict == "block"
    assert score >= 0.70
    assert "Blocked:" in reason
    assert len(explanations) == 1
    assert "[RULES]" in explanations[0]
