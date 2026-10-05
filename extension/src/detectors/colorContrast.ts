import { DetectorOptions, Finding } from "./types";
import {
  getEffectiveStyle,
  getSelector,
  hasPromptInjectionPattern,
  parseColor,
} from "./utils";

/**
 * Finds the effective background color of an element by traversing up the DOM.
 */
function resolveBackgroundColor(element: Element): { r: number; g: number; b: number; a: number } | null {
  let current: Element | null = element;

  while (current && current.nodeType === 1) {
    const bgStr = getEffectiveStyle(current, "background-color") || getEffectiveStyle(current, "background");
    if (bgStr) {
      const parsed = parseColor(bgStr);
      if (parsed && parsed.a > 0.05) {
        return parsed;
      }
    }
    current = current.parentElement;
  }

  // Default web background assumption is white
  return { r: 255, g: 255, b: 255, a: 1 };
}

/**
 * Detects text where the font color is identical or indistinguishable from its background.
 */
export function detectColorContrast(root: Element | Document, options: DetectorOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const targetRoot = "body" in root && root.body ? root.body : (root as Element);
  const elements = targetRoot.querySelectorAll("*");

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (
      [
        "head",
        "title",
        "script",
        "style",
        "meta",
        "link",
        "noscript",
        "svg",
        "path",
        "template",
        "base",
      ].includes(tag) ||
      el.closest("head") !== null
    ) {
      continue;
    }

    // Only inspect leaf nodes or elements with direct text
    const text = (el.textContent || "").trim();
    if (!text || el.children.length > 2) continue;

    const colorStr = getEffectiveStyle(el, "color");
    if (!colorStr) continue;

    const textColor = parseColor(colorStr);
    if (!textColor) continue;

    const bgColor = resolveBackgroundColor(el);
    if (!bgColor) continue;

    // Check difference in RGB channels
    const diff =
      Math.abs(textColor.r - bgColor.r) +
      Math.abs(textColor.g - bgColor.g) +
      Math.abs(textColor.b - bgColor.b);

    // If total channel difference is less than 15, the text is unreadable (camouflaged)
    if (diff < 15 && textColor.a > 0.5 && bgColor.a > 0.5) {
      const isSuspicious = hasPromptInjectionPattern(text);
      const severity: Finding["severity"] = isSuspicious ? "high" : "medium";

      const selector = getSelector(el);
      findings.push({
        type: "color-contrast-match",
        selector,
        text: text.length > 200 ? text.substring(0, 200) + "..." : text,
        severity,
      });
    }
  }

  return findings;
}
