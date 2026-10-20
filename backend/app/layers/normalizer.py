"""Text normalization and deobfuscation layer for Project AEGIS.

Implements Unicode NFKC normalization, zero-width steganography stripping,
homoglyph/confusable folding, ROT13/Base64/Hex/URL decoding, and hidden
HTML/Markdown extraction (comments, display:none, white-on-white text).
"""

from __future__ import annotations

import base64
import binascii
import codecs
import re
import time
import unicodedata
from urllib.parse import unquote

from app.core.models import Evidence, LayerResult

# Invisible zero-width and directional characters
ZERO_WIDTH_PATTERN = re.compile(r"[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]")

# Unicode tag characters (U+E0001 - U+E007F) used for covert channel exfiltration / injection
UNICODE_TAGS_PATTERN = re.compile(r"[\U000E0001-\U000E007F]")

# Base64 candidate substrings (at least 12 chars = 3 full blocks)
BASE64_PATTERN = re.compile(
    r"\b(?:[A-Za-z0-9+/]{4}){3,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b"
)

# Hexadecimal byte sequence candidate
HEX_PATTERN = re.compile(r"(?:(?:0x|\\x)[0-9a-fA-F]{2}){4,}")

# URL percent-encoding candidate
URL_ENCODED_PATTERN = re.compile(r"(?:%[0-9a-fA-F]{2}){3,}")

# HTML comments pattern
HTML_COMMENT_PATTERN = re.compile(r"<!--(.*?)-->", re.DOTALL)

# CSS hidden text patterns (display:none, visibility:hidden, opacity:0, font-size:0, white text)
CSS_HIDDEN_PATTERN = re.compile(
    r"<(?:span|div|p|section|article)\s+[^>]{0,300}?style=[\"'][^\"']{0,200}?"
    r"(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0"
    r"|color\s*:\s*(?:#fff(?:fff)?|white|rgba?\(\s*255\s*,\s*255\s*,\s*255))"
    r"[^\"']{0,200}?[\"'][^>]{0,100}?>([\s\S]{0,2000}?)</(?:span|div|p|section|article)>",
    re.IGNORECASE,
)

# Homoglyph translation mapping (Cyrillic, Greek, lookalikes commonly used in evasion)
HOMOGLYPH_MAP: dict[str, str] = {
    # Cyrillic lowercase
    "\u0430": "a",
    "\u0441": "c",
    "\u0435": "e",
    "\u0456": "i",
    "\u0458": "j",
    "\u043e": "o",
    "\u0440": "p",
    "\u0455": "s",
    "\u0443": "y",
    "\u0445": "x",
    # Cyrillic uppercase
    "\u0410": "A",
    "\u0412": "B",
    "\u0421": "C",
    "\u0415": "E",
    "\u041d": "H",
    "\u0406": "I",
    "\u0408": "J",
    "\u041a": "K",
    "\u041c": "M",
    "\u041e": "O",
    "\u0420": "P",
    "\u0422": "T",
    "\u0425": "X",
    # Greek lookalikes
    "\u03b1": "a",
    "\u03bf": "o",
    "\u03bd": "v",
    "\u03c1": "p",
}

# Injection trigger words to verify ROT13 candidates
ROT13_INDICATORS = {
    "ignore",
    "system",
    "prompt",
    "instructions",
    "override",
    "jailbreak",
    "disregard",
    "developer",
}


class NormalizerLayer:
    """Normalizes Unicode text, strips steganography, folds homoglyphs, and unwraps encodings."""

    def __init__(self) -> None:
        self.layer_name = "normalizer"

    def process(self, text: str) -> tuple[str, LayerResult]:
        """Normalizes text and returns (cleaned_text, layer_result)."""
        start_time = time.perf_counter()
        evidence_list: list[Evidence] = []
        obfuscation_detected = False

        if not text:
            elapsed = (time.perf_counter() - start_time) * 1000
            return "", LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        # 1. Unicode NFKC Normalization
        normalized = unicodedata.normalize("NFKC", text)

        # 2. Invisible zero-width character detection & stripping
        zw_matches = list(ZERO_WIDTH_PATTERN.finditer(normalized))
        if zw_matches:
            obfuscation_detected = True
            evidence_list.append(
                Evidence(
                    kind="zero_width_steganography",
                    span=(zw_matches[0].start(), zw_matches[-1].end()),
                    detail=f"Detected and stripped {len(zw_matches)} zero-width characters",
                )
            )
            normalized = ZERO_WIDTH_PATTERN.sub("", normalized)

        # 3. Unicode Tag characters (U+E0000 - U+E007F) conversion
        tag_matches = list(UNICODE_TAGS_PATTERN.finditer(normalized))
        if tag_matches:
            obfuscation_detected = True
            decoded_tags = []
            for m in tag_matches:
                char_code = ord(m.group()) - 0xE0000
                if 0 <= char_code <= 127:
                    decoded_tags.append(chr(char_code))
            tag_decoded_str = "".join(decoded_tags)
            evidence_list.append(
                Evidence(
                    kind="unicode_tag_smuggling",
                    span=(tag_matches[0].start(), tag_matches[-1].end()),
                    detail=(
                        f"Decoded {len(tag_matches)} hidden Unicode tag chars into: "
                        f"{tag_decoded_str}"
                    ),
                )
            )
            normalized = UNICODE_TAGS_PATTERN.sub(
                lambda m: (
                    chr(ord(m.group()) - 0xE0000) if 0 <= ord(m.group()) - 0xE0000 <= 127 else ""
                ),
                normalized,
            )

        # 4. Homoglyph / Confusable Folding
        replaced_chars: list[tuple[int, str, str]] = []
        chars_list = list(normalized)
        for idx, char in enumerate(chars_list):
            if char in HOMOGLYPH_MAP:
                ascii_char = HOMOGLYPH_MAP[char]
                chars_list[idx] = ascii_char
                replaced_chars.append((idx, char, ascii_char))

        if replaced_chars:
            # Check if homoglyphs are mixed into predominantly Latin words
            obfuscation_detected = True
            normalized = "".join(chars_list)
            first_idx = replaced_chars[0][0]
            last_idx = replaced_chars[-1][0]
            preview = ", ".join(f"'{c}'->'{a}'" for _, c, a in replaced_chars[:4])
            evidence_list.append(
                Evidence(
                    kind="homoglyph_obfuscation",
                    span=(first_idx, last_idx + 1),
                    detail=f"Folded {len(replaced_chars)} confusable homoglyphs: {preview}",
                )
            )

        # 5. Hidden HTML Comments Extraction
        comment_matches = list(HTML_COMMENT_PATTERN.finditer(normalized))[:25]
        extracted_hidden_text: list[str] = []
        for m in comment_matches:
            content = m.group(1).strip()
            if content and any(c.isalnum() for c in content):
                obfuscation_detected = True
                extracted_hidden_text.append(content[:1000])
                evidence_list.append(
                    Evidence(
                        kind="hidden_html_comment",
                        span=(m.start(), m.end()),
                        detail=f"Extracted covert HTML comment payload: {content[:60]}",
                    )
                )

        # 6. Hidden CSS Elements Extraction (display:none / white text)
        css_hidden_matches = list(CSS_HIDDEN_PATTERN.finditer(normalized))[:25]
        for m in css_hidden_matches:
            inner_text = m.group(1).strip()
            if inner_text:
                obfuscation_detected = True
                extracted_hidden_text.append(inner_text[:1000])
                evidence_list.append(
                    Evidence(
                        kind="hidden_css_element",
                        span=(m.start(), m.end()),
                        detail=f"Extracted hidden CSS element payload: {inner_text[:60]}",
                    )
                )

        if extracted_hidden_text:
            # Append hidden text with a clear delimiter so downstream layers analyze it
            normalized += "\n\n" + "\n".join(extracted_hidden_text[:25])

        # 7. URL percent-decoding check
        url_matches = list(URL_ENCODED_PATTERN.finditer(normalized))
        for m in url_matches:
            try:
                raw_chunk = m.group()
                unquoted = unquote(raw_chunk)
                if unquoted != raw_chunk and any(c.isalnum() for c in unquoted):
                    obfuscation_detected = True
                    evidence_list.append(
                        Evidence(
                            kind="url_percent_encoding",
                            span=(m.start(), m.end()),
                            detail=f"Unwrapped percent-encoded string: {unquoted[:50]}",
                        )
                    )
                    normalized = normalized[: m.start()] + unquoted + normalized[m.end() :]
            except Exception:
                pass

        # 8. Base64 unwrap check
        for m in list(BASE64_PATTERN.finditer(normalized)):
            raw_token = m.group()
            try:
                decoded_bytes = base64.b64decode(raw_token, validate=True)
                decoded_str = decoded_bytes.decode("utf-8")
                if (
                    len(decoded_str) >= 4
                    and sum(c.isprintable() for c in decoded_str) / len(decoded_str) > 0.85
                ):
                    obfuscation_detected = True
                    evidence_list.append(
                        Evidence(
                            kind="base64_payload",
                            span=(m.start(), m.end()),
                            detail=f"Decoded Base64 fragment: {decoded_str[:60]}",
                        )
                    )
                    normalized = normalized[: m.start()] + decoded_str + normalized[m.end() :]
            except (binascii.Error, UnicodeDecodeError, ValueError):
                continue

        # 9. Hex unwrap check
        for m in list(HEX_PATTERN.finditer(normalized)):
            raw_hex = m.group().replace("0x", "").replace("\\x", "")
            try:
                decoded_bytes = bytes.fromhex(raw_hex)
                decoded_str = decoded_bytes.decode("utf-8")
                if (
                    len(decoded_str) >= 4
                    and sum(c.isprintable() for c in decoded_str) / len(decoded_str) > 0.85
                ):
                    obfuscation_detected = True
                    evidence_list.append(
                        Evidence(
                            kind="hex_payload",
                            span=(m.start(), m.end()),
                            detail=f"Decoded Hex fragment: {decoded_str[:60]}",
                        )
                    )
                    normalized = normalized[: m.start()] + decoded_str + normalized[m.end() :]
            except Exception:
                continue

        # 10. ROT13 decoding check
        words = normalized.split()
        if len(words) >= 3:
            rot13_candidate = codecs.decode(normalized, "rot_13")
            rot13_lower = rot13_candidate.lower()
            matched_indicators = [ind for ind in ROT13_INDICATORS if ind in rot13_lower]
            if len(matched_indicators) >= 2:
                obfuscation_detected = True
                evidence_list.append(
                    Evidence(
                        kind="rot13_obfuscation",
                        span=(0, min(100, len(normalized))),
                        detail=f"Decoded ROT13 cipher containing: {', '.join(matched_indicators)}",
                    )
                )
                normalized = rot13_candidate

        elapsed = (time.perf_counter() - start_time) * 1000
        score = 0.50 if obfuscation_detected else 0.0
        label = "obfuscation_detected" if obfuscation_detected else "clean"

        result = LayerResult(
            layer=self.layer_name,
            score=score,
            label=label,
            evidence=evidence_list,
            latency_ms=round(elapsed, 3),
        )
        return normalized, result
