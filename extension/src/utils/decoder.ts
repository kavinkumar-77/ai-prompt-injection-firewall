/**
 * Obfuscation detection and decoding utilities for Project AEGIS.
 */

export function decodeBase64(str: string): string | null {
  try {
    const clean = str.trim().replace(/\s+/g, "");
    if (clean.length < 12 || clean.length % 4 !== 0) return null;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;

    // Use atob safely in browser or node test runner
    const decoded = typeof atob === "function" ? atob(clean) : Buffer.from(clean, "base64").toString("utf-8");
    if (!decoded || decoded.length < 6) return null;

    // Verify it contains printable ASCII characters
    const isPrintable = /^[\x20-\x7E\r\n\t]+$/.test(decoded);
    return isPrintable ? decoded : null;
  } catch {
    return null;
  }
}

export function decodeHex(str: string): string | null {
  try {
    const clean = str.trim().replace(/^(0x|\\x)/, "").replace(/[^0-9a-fA-F]/g, "");
    if (clean.length < 16 || clean.length % 2 !== 0) return null;

    let decoded = "";
    for (let i = 0; i < clean.length; i += 2) {
      decoded += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    }
    const isPrintable = /^[\x20-\x7E\r\n\t]+$/.test(decoded);
    return isPrintable ? decoded : null;
  } catch {
    return null;
  }
}

export function decodeURL(str: string): string | null {
  try {
    if (!str.includes("%")) return null;
    const decoded = decodeURIComponent(str);
    return decoded !== str ? decoded : null;
  } catch {
    return null;
  }
}

export function decodeUnicodeTags(str: string): string | null {
  let decoded = "";
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint >= 0xe0020 && codePoint <= 0xe007e) {
      decoded += String.fromCharCode(codePoint - 0xe0000);
    }
  }
  return decoded.length >= 3 ? decoded : null;
}

export function stripZeroWidth(str: string): string {
  return str.replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, "");
}

export interface DecodedResult {
  detected: boolean;
  type: "base64" | "hex" | "url" | "unicode-tag" | "zero-width" | null;
  decoded: string;
}

export function detectAndDecode(str: string): DecodedResult {
  if (!str) return { detected: false, type: null, decoded: str };

  // 1. Unicode Tags
  const tagDecoded = decodeUnicodeTags(str);
  if (tagDecoded) {
    return { detected: true, type: "unicode-tag", decoded: tagDecoded };
  }

  // 2. Zero-Width characters
  if (/[\u200B\u200C\u200D\uFEFF\u2060]/.test(str)) {
    const stripped = stripZeroWidth(str);
    return { detected: true, type: "zero-width", decoded: stripped };
  }

  // 3. URL Encoding
  const urlDecoded = decodeURL(str);
  if (urlDecoded) {
    return { detected: true, type: "url", decoded: urlDecoded };
  }

  // 4. Base64
  const b64Decoded = decodeBase64(str);
  if (b64Decoded) {
    return { detected: true, type: "base64", decoded: b64Decoded };
  }

  // 5. Hex
  const hexDecoded = decodeHex(str);
  if (hexDecoded) {
    return { detected: true, type: "hex", decoded: hexDecoded };
  }

  return { detected: false, type: null, decoded: str };
}
