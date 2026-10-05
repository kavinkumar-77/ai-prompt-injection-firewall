import { DetectorOptions, Finding } from "./types";
import { getSelector } from "./utils";

const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\uFEFF\u2060]/;
const UNICODE_TAG_REGEX = /[\u{E0000}-\u{E007F}]/u;

/**
 * Decodes Unicode tag characters (U+E0000 to U+E007F) back to plain ASCII text if possible.
 */
function decodeUnicodeTags(str: string): string {
  let decoded = "";
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint >= 0xe0000 && codePoint <= 0xe007f) {
      if (codePoint >= 0xe0020 && codePoint <= 0xe007e) {
        decoded += String.fromCharCode(codePoint - 0xe0000);
      }
    }
  }
  return decoded;
}

/**
 * Detects zero-width characters and invisible Unicode tag characters inside text nodes.
 */
export function detectUnicodeTricks(root: Element | Document, options: DetectorOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const doc = root.ownerDocument || (root as Document);

  if (!doc || typeof doc.createTreeWalker !== "function") {
    return findings;
  }

  // NodeFilter.SHOW_TEXT constant is 4
  const walker = doc.createTreeWalker(root, 4, null);
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;
    if (parent) {
      const tag = parent.tagName.toLowerCase();
      if (!["script", "style", "meta", "noscript"].includes(tag)) {
        const text = node.nodeValue || "";

        // Check for Unicode Tag characters (U+E0000 block)
        if (UNICODE_TAG_REGEX.test(text)) {
          const decoded = decodeUnicodeTags(text);
          const preview = decoded
            ? `Decoded tag text: "${decoded}"`
            : "Invisible Unicode tag sequence detected";

          findings.push({
            type: "unicode-tag-characters",
            selector: getSelector(parent),
            text: preview,
            severity: "high",
          });
        }

        // Check for zero-width characters
        if (ZERO_WIDTH_REGEX.test(text)) {
          // Count occurrences to avoid flagging a single isolated non-joiner in certain languages
          const matches = text.match(/[\u200B\u200C\u200D\uFEFF\u2060]/g);
          const count = matches ? matches.length : 0;

          // Flag if there are multiple zero-width characters or if used inside a word
          if (count >= 2 || (count === 1 && /\w[\u200B\u200C\u200D\uFEFF\u2060]\w/.test(text))) {
            const sanitizedPreview = text
              .replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, "[ZW]")
              .substring(0, 150);

            findings.push({
              type: "zero-width-unicode",
              selector: getSelector(parent),
              text: `Zero-width characters (${count} found): "${sanitizedPreview}"`,
              severity: "high",
            });
          }
        }
      }
    }

    node = walker.nextNode();
  }

  return findings;
}
