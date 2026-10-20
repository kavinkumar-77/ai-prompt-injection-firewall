from __future__ import annotations

from app.layers.secrets import SecretsLayer, validate_luhn, validate_verhoeff


def test_validate_luhn_algorithm():
    assert validate_luhn("4111 1111 1111 1111") is True
    assert validate_luhn("4111 1111 1111 1112") is False


def test_validate_verhoeff_algorithm():
    assert validate_verhoeff("2841 9375 6046") is True
    assert validate_verhoeff("2841 9375 6047") is False
    # Cannot start with 0 or 1
    assert validate_verhoeff("0841 9375 6046") is False


def test_secrets_layer_api_key_redaction():
    layer = SecretsLayer()
    text = "Here is my test key: sk-proj-1234567890abcdef1234567890abcdef123456. Do not share."
    sanitized, res = layer.process(text, redact=True)
    assert res.score >= 0.95
    assert "[SECRET:openai_api_key]" in sanitized
    assert "sk-proj-" not in sanitized
    assert any("openai_api_key" in ev.kind for ev in res.evidence)


def test_secrets_layer_credit_card_and_pan_redaction():
    layer = SecretsLayer()
    text = "User PAN is ABCDE1234F and payment card is 4111 1111 1111 1111 on file."
    sanitized, res = layer.process(text, redact=True)
    assert res.score >= 0.90
    assert "[PII:credit_card]" in sanitized
    assert "[PII:pan_card]" in sanitized
    assert "4111 1111 1111 1111" not in sanitized
    assert "ABCDE1234F" not in sanitized


def test_secrets_layer_aadhaar_redaction():
    layer = SecretsLayer()
    text = "Citizen identification Aadhaar number: 2841 9375 6046."
    sanitized, res = layer.process(text, redact=True)
    assert res.score >= 0.90
    assert "[PII:aadhaar_number]" in sanitized
    assert "2841 9375 6046" not in sanitized


def test_secrets_layer_clean_text():
    layer = SecretsLayer()
    text = "Just a standard technical discussion regarding Python and PostgreSQL performance."
    sanitized, res = layer.process(text, redact=True)
    assert res.score == 0.0
    assert res.label == "clean"
    assert sanitized == text
