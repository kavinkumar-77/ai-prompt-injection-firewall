import { DetectorOptions, Finding } from "./types";
import { getSelector, hasPromptInjectionPattern } from "./utils";

/**
 * Common benign comment markers to ignore (prevents false positives on CMS & frameworks).
 */
const BENIGN_COMMENT_PATTERNS = [
  /^(\/|\s*end\s+of|\s*start\s+of)/i,
  /^(wp:|react-|vue-|angular|next-|nuxt-|svelte-)/i,
  /^\[if\s+lte?\s+ie/i,
  /^<!\[endif/i,
  /google\s+tag\s+manager/i,
  /analytics/i,
];

/**
 * Inspects all HTML comment nodes in the document.
 */
export function detectHtmlComments(root: Element | Document, options: DetectorOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const doc = root.ownerDocument || (root as Document);

  if (!doc || typeof doc.createTreeWalker !== "function") {
    return findings;
  }

  // NodeFilter.SHOW_COMMENT constant is 128
  const walker = doc.createTreeWalker(root, 128, null);
  let node = walker.nextNode();

  while (node) {
    const rawContent = (node.nodeValue || "").trim();

    if (rawContent.length > 5) {
      const isBenign = BENIGN_COMMENT_PATTERNS.some((p) => p.test(rawContent));

      if (!isBenign) {
        const isInjection = hasPromptInjectionPattern(rawContent);
        // If it looks like natural prose (>30 chars or multiple words) and contains directive words
        const hasDirectives = /\b(instructions?|prompt|assistant|ai|model|ignore|bypass|override)\b/i.test(
          rawContent
        );

        if (isInjection || hasDirectives) {
          const parent = node.parentElement;
          const selector = parent ? `${getSelector(parent)} > <!--comment-->` : "<!--comment-->";
          const severity = isInjection ? "high" : "medium";

          findings.push({
            type: "html-comment",
            selector,
            text: rawContent.length > 200 ? rawContent.substring(0, 200) + "..." : rawContent,
            severity,
          });
        }
      }
    }

    node = walker.nextNode();
  }

  return findings;
}
