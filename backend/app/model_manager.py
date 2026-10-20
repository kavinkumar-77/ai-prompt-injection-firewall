"""Inference and security analysis orchestrator for Project AEGIS."""

import base64
import binascii
import re
import urllib.parse

from app.schemas import (
    IntentAnalysisRequest,
    IntentAnalysisResponse,
    VisualSimilarityRequest,
    VisualSimilarityResponse,
)

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|system)\s+instructions?", re.IGNORECASE),
    re.compile(r"system\s+(prompt|override|command|directive)", re.IGNORECASE),
    re.compile(
        r"disregard\s+(all\s+)?(previous|prior|above|preceding|initial)(\s+(instructions?|directives?|prompts?))?",
        re.IGNORECASE,
    ),
    re.compile(
        r"you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|unrestricted|jailbreak)", re.IGNORECASE
    ),
    re.compile(r"send\s+(auth|cookie|token|data|password|secret|key)s?\s+to", re.IGNORECASE),
    re.compile(
        r"output\s+(all\s+)?(session\s+)?(cookies?|tokens?|passwords?|keys?|prompts?)",
        re.IGNORECASE,
    ),
    re.compile(r"bypass\s+(safety|guardrail|filter|policy)", re.IGNORECASE),
    re.compile(r"exfiltrat(e|ion|ing)", re.IGNORECASE),
    re.compile(r"reveal\s+(the\s+)?(secret|hidden|system)\s+prompt", re.IGNORECASE),
    re.compile(r"new\s+instructions?\s*:", re.IGNORECASE),
    re.compile(r"assistant\s*:\s*", re.IGNORECASE),
]

ZERO_WIDTH_CHARS = re.compile(r"[\u200B\u200C\u200D\uFEFF\u2060]")
UNICODE_TAGS = re.compile(r"[\U000E0000-\U000E007F]")

# Reference layout perceptual hashes for common phishing targets (32-hex blockhash)
KNOWN_BRAND_HASHES = {
    "Google Account Login": "ff0000ff00ffff0000ffff00ff00ff00",
    "Microsoft 365 Sign In": "00ffff00ff0000ffff00ff0000ffff00",
    "PayPal Authentication": "f0f0f0f00f0f0f0f00ff00ff00ff00ff",
}


def decode_unicode_tags(text: str) -> str:
    """Decodes invisible Unicode tags back to ASCII."""
    chars = []
    for c in text:
        cp = ord(c)
        if 0xE0020 <= cp <= 0xE007E:
            chars.append(chr(cp - 0xE0000))
    return "".join(chars)


def detect_and_unwrap_obfuscation(text: str) -> tuple[bool, str | None, str]:
    """Detects and decodes obfuscated representations (Base64, Hex, URL, Unicode)."""
    # 1. Unicode Tags
    if UNICODE_TAGS.search(text):
        decoded = decode_unicode_tags(text)
        if len(decoded.strip()) > 3:
            return True, "unicode_tags", decoded.strip()

    # 2. Zero-width stripping
    if ZERO_WIDTH_CHARS.search(text):
        cleaned = ZERO_WIDTH_CHARS.sub("", text)
        return True, "zero_width_unicode", cleaned

    # 3. URL Encoding (%XX)
    if "%" in text:
        try:
            unquoted = urllib.parse.unquote(text)
            if unquoted != text and any(p.search(unquoted) for p in INJECTION_PATTERNS):
                return True, "url_encoding", unquoted
        except Exception:
            pass

    # 4. Base64 Detection
    words = text.strip().split()
    for word in words:
        cleaned_word = re.sub(r"[^A-Za-z0-9+/=]", "", word)
        if len(cleaned_word) >= 16 and len(cleaned_word) % 4 == 0:
            try:
                decoded_bytes = base64.b64decode(cleaned_word, validate=True)
                decoded_str = decoded_bytes.decode("utf-8", errors="strict")
                # Ensure it looks like human-readable text
                if len(decoded_str) >= 6 and all(
                    32 <= ord(c) <= 126 or c in "\n\r\t" for c in decoded_str
                ):
                    return True, "base64", decoded_str
            except Exception:
                pass

    # 5. Hex Detection (e.g. 49676e6f7265...)
    cleaned_hex = re.sub(r"[^0-9a-fA-F]", "", text.strip())
    if len(cleaned_hex) >= 20 and len(cleaned_hex) % 2 == 0:
        try:
            decoded_bytes = binascii.unhexlify(cleaned_hex)
            decoded_str = decoded_bytes.decode("utf-8", errors="strict")
            if len(decoded_str) >= 6 and all(
                32 <= ord(c) <= 126 or c in "\n\r\t" for c in decoded_str
            ):
                return True, "hex", decoded_str
        except Exception:
            pass

    return False, None, text


def compute_divergence(system_prompt: str, inspected_text: str) -> float:
    """Computes semantic/instruction divergence between system goal and user text."""
    if not system_prompt:
        # Default baseline divergence
        return 0.1

    sys_lower = system_prompt.lower()
    user_lower = inspected_text.lower()

    # Look for task disruption directives
    override_signals = [
        "instead",
        "disregard",
        "override",
        "forget",
        "bypass",
        "do not",
        "send to",
        "exfiltrate",
        "dump",
        "new instruction",
    ]
    divergence_score = 0.05
    for sig in override_signals:
        if sig in user_lower:
            divergence_score += 0.25

    # Check for direct keyword matches with known adversarial patterns
    for pat in INJECTION_PATTERNS:
        if pat.search(inspected_text):
            divergence_score = max(divergence_score, 0.95)
            break

    # If user requests actions unrelated to the system objective
    sys_tokens = set(re.findall(r"\w+", sys_lower))
    user_tokens = set(re.findall(r"\w+", user_lower))
    overlap = len(sys_tokens.intersection(user_tokens))
    if len(user_tokens) > 5 and overlap == 0:
        divergence_score = min(1.0, divergence_score + 0.20)

    return min(1.0, round(divergence_score, 3))


def hamming_distance(hash1: str, hash2: str) -> int:
    """Calculates the bitwise Hamming distance between two hex hashes."""
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        xor_val = val1 ^ val2
        return bin(xor_val).count("1")
    except ValueError:
        return 128


class IntentAnalyzer:
    """High-performance intent divergence and injection detection engine."""

    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = model_path
        self._llm = None
        # Attempt to load quantized GGUF model if provided and library installed
        if model_path:
            try:
                from llama_cpp import Llama  # type: ignore

                self._llm = Llama(model_path=model_path, n_ctx=2048, verbose=False)
            except Exception:
                self._llm = None

    def analyze_intent(self, request: IntentAnalysisRequest) -> IntentAnalysisResponse:
        """Analyzes untrusted input against system prompt and checks for injections."""
        raw_text = request.user_input
        obf_detected, obf_type, decoded_text = detect_and_unwrap_obfuscation(raw_text)

        # Inspect both raw and decoded strings
        inspection_target = decoded_text if obf_detected else raw_text
        system_prompt = request.system_prompt or ""
        divergence = compute_divergence(system_prompt, inspection_target)

        # Run multi-vector AI prober & vector semantic scan
        from app.ai_engine import ai_engine

        ai_scan = ai_engine.full_ai_scan(inspection_target, system_prompt)

        has_attack_pattern = any(p.search(inspection_target) for p in INJECTION_PATTERNS)

        if has_attack_pattern or ai_scan["is_threat"]:
            verdict = "INJECTION"
            divergence = max(divergence, ai_scan["risk_score"], 0.96)
            vector_str = (
                ", ".join(ai_scan["detected_vectors"])
                if ai_scan["detected_vectors"]
                else "direct_regex_override"
            )
            reason = (
                f"Adversarial prompt injection pattern detected"
                f"{f' via {obf_type} obfuscation' if obf_detected else ''} "
                f"[AI Vectors: {vector_str}]: "
                f"Attempted instruction hijacking or unauthorized capability invocation."
            )
        elif obf_detected and len(decoded_text) > 10:
            verdict = "SUSPICIOUS"
            divergence = max(divergence, 0.65)
            reason = (
                f"Hidden obfuscated payload detected ({obf_type}) without benign justification."
            )
        elif divergence > 0.70 or ai_scan["attention_shift_score"] > 0.60:
            verdict = "SUSPICIOUS"
            divergence = max(divergence, ai_scan["attention_shift_score"])
            reason = (
                f"Elevated intent divergence (attention shift: "
                f"{ai_scan['attention_shift_score']}): "
                f"Input shifts model attention away from stated system prompt."
            )
        else:
            verdict = "SAFE"
            reason = (
                "Input aligns with task objective; no obfuscation or adversarial patterns found."
            )

        return IntentAnalysisResponse(
            intent_divergence_score=divergence,
            obfuscation_detected=obf_detected,
            obfuscation_type=obf_type,
            decoded_payload=decoded_text if obf_detected else None,
            verdict=verdict,
            reasoning=reason,
            ai_analysis=ai_scan,
        )

    def check_visual_similarity(self, request: VisualSimilarityRequest) -> VisualSimilarityResponse:
        """Evaluates perceptual hash against known legitimate targets for visual phishing."""
        min_distance = 128
        matched_brand = None

        for brand, ref_hash in KNOWN_BRAND_HASHES.items():
            dist = hamming_distance(request.screenshot_hash, ref_hash)
            if dist < min_distance:
                min_distance = dist
                matched_brand = brand

        # If layout is very close to a major login brand but domain is unrecognized
        is_clone = min_distance <= 12
        confidence = max(0.0, min(1.0, round(1.0 - (min_distance / 64.0), 3)))

        if is_clone and matched_brand:
            return VisualSimilarityResponse(
                is_phishing=True,
                confidence=confidence,
                matched_brand=matched_brand,
                hash_distance=min_distance,
                reason=(
                    f"Visual layout perceptual hash closely matches legitimate brand "
                    f"'{matched_brand}' (Hamming distance {min_distance}), "
                    f"indicating a potential visual clone."
                ),
            )

        return VisualSimilarityResponse(
            is_phishing=False,
            confidence=0.1,
            matched_brand=None,
            hash_distance=min_distance,
            reason="Page layout does not match any known sensitive login templates.",
        )


# Global singleton instance
analyzer = IntentAnalyzer()
