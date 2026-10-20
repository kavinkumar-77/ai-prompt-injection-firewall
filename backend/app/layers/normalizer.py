"""Text normalization and deobfuscation layer for Project AEGIS."""

from __future__ import annotations

import base64
import binascii
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


class NormalizerLayer:
    """Normalizes Unicode text, removes steganographic markers, and decodes obfuscations."""

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
            for m in zw_matches:
                evidence_list.append(
                    Evidence(
                        kind="zero_width_steganography",
                        span=(m.start(), m.end()),
                        detail=(
                            f"Detected invisible zero-width char (code U+{ord(m.group()):04X})"
                        ),
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
            # Replace tag characters with their ASCII equivalents
            normalized = UNICODE_TAGS_PATTERN.sub(
                lambda m: (
                    chr(ord(m.group()) - 0xE0000) if 0 <= ord(m.group()) - 0xE0000 <= 127 else ""
                ),
                normalized,
            )

        # 4. URL percent-decoding check
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

        # 5. Base64 unwrap check
        for m in list(BASE64_PATTERN.finditer(normalized)):
            raw_token = m.group()
            try:
                decoded_bytes = base64.b64decode(raw_token, validate=True)
                decoded_str = decoded_bytes.decode("utf-8")
                # Filter out pure noise / binary blobs
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

        # 6. Hex unwrap check
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
