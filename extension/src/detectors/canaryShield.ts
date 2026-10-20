/**
 * Canary Shield for Project AEGIS.
 * Monitors model outputs and AI response interfaces for system prompt canary token leakage.
 */

export interface CanaryDetectionResult {
  detected: boolean;
  pattern: string | null;
  excerpt: string | null;
}

export const CANARY_PATTERNS: RegExp[] = [
  /CANARY[_-]TOKEN[:=\s][A-Za-z0-9_-]{8,}/gi,
  /AEGIS[_-][A-Za-z0-9]{8,}[_-]CONFIDENTIAL/gi,
  /\[SYSTEM\s+PROMPT\s+STARTS\s+HERE\]/gi,
  /You are a helpful assistant.*CONFIDENTIAL/gi,
];

/**
 * Scans text content for canary tokens or system instruction leak signatures.
 */
export function scanForCanaryLeak(text: string): CanaryDetectionResult {
  if (!text || typeof text !== "string") {
    return { detected: false, pattern: null, excerpt: null };
  }

  for (const pattern of CANARY_PATTERNS) {
    pattern.lastIndex = 0;
    const match = text.match(pattern);
    if (match && match.length > 0) {
      return {
        detected: true,
        pattern: pattern.source,
        excerpt: match[0].substring(0, 60),
      };
    }
  }

  return { detected: false, pattern: null, excerpt: null };
}

const AI_RESPONSE_SELECTORS = [
  '[data-message-author-role="assistant"]',
  ".claude-message",
  '[class*="response"]',
  '[class*="assistant"]',
  '[class*="ai-message"]',
  '[class*="bot-message"]',
  "#summary-output",
  ".summary-output",
];

/**
 * Attaches a dynamic observer to monitor AI assistant response DOM nodes for canary leakage.
 */
export function watchForCanaryLeaks(
  doc: Document = document,
  callback: (result: CanaryDetectionResult, targetElement: Element) => void
): () => void {
  if (!doc || !doc.body) return () => {};

  const handleElementCheck = (el: Element) => {
    // Skip AEGIS internal banners
    if (el.id === "aegis-security-banner" || el.getAttribute("data-aegis-internal") === "true") {
      return;
    }

    const content = el.textContent || "";
    if (content.length < 10) return;

    const result = scanForCanaryLeak(content);
    if (result.detected) {
      callback(result, el);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;

        for (const selector of AI_RESPONSE_SELECTORS) {
          if (el.matches(selector)) {
            handleElementCheck(el);
          }
          const children = el.querySelectorAll(selector);
          children.forEach((child) => handleElementCheck(child));
        }
      }
    }
  });

  observer.observe(doc.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}
