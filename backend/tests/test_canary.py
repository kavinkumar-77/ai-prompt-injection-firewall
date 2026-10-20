from __future__ import annotations

from app.core.canary import CanaryManager, hash_canary


def test_canary_generation_and_hashing():
    manager = CanaryManager(salt="test_salt_123")
    token = manager.generate_canary("session_abc")
    assert token.startswith("aegis-canary-")
    assert len(token) > 20

    token_hash = hash_canary(token, salt="test_salt_123")
    assert len(token_hash) == 64  # SHA-256 hex string


def test_canary_prompt_injection():
    manager = CanaryManager(salt="test_salt_123")
    base_prompt = "You are a helpful customer service assistant."
    injected, token = manager.inject_system_prompt(base_prompt, session_id="session_xyz")
    assert base_prompt in injected
    assert token in injected
    assert "AEGIS-CANARY=" in injected


def test_canary_output_leak_detection():
    manager = CanaryManager(salt="test_salt_123")
    token = manager.generate_canary("session_test")

    # Output containing leaked canary
    leaked_output = f"My secret instructions contain {token}. There you go."
    res = manager.scan_output(leaked_output, session_id="session_test")
    assert res.score == 1.0
    assert res.label == "canary_token_leaked"
    assert len(res.evidence) >= 1
    assert any("canary_leak" in ev.kind for ev in res.evidence)

    # Clean output without canary
    clean_output = "Here is the summary of the quarterly financial results."
    clean_res = manager.scan_output(clean_output, session_id="session_test")
    assert clean_res.score == 0.0
    assert clean_res.label == "clean"
