import { DetectorOptions, Finding } from "./types";
import {
  getEffectiveStyle,
  getSelector,
  hasPromptInjectionPattern,
  isLegitimateAccessibleOrUIContext,
} from "./utils";

/**
 * Detects elements hidden via CSS display, visibility, opacity, or tiny font sizes.
 */
export function detectCssHidden(root: Element | Document, options: DetectorOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const targetRoot = "body" in root && root.body ? root.body : (root as Element);
  const elements = targetRoot.querySelectorAll("*");

  for (const el of elements) {
    // Skip script, style, meta, head, title, etc.
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

    // Only inspect elements with direct or immediate text content
    const text = (el.textContent || "").trim();
    if (!text) continue;

    // Check display: none
    const display = getEffectiveStyle(el, "display");
    if (display === "none") {
      processFinding(el, text, "css-display-none", findings, options);
      continue;
    }

    // Check visibility: hidden
    const visibility = getEffectiveStyle(el, "visibility");
    if (visibility === "hidden" || visibility === "collapse") {
      processFinding(el, text, "css-visibility-hidden", findings, options);
      continue;
    }

    // Check opacity: 0
    const opacity = getEffectiveStyle(el, "opacity");
    if (opacity !== "" && parseFloat(opacity) === 0) {
      processFinding(el, text, "zero-opacity", findings, options);
      continue;
    }

    // Check font-size: 0 or tiny (< 2px)
    const fontSize = getEffectiveStyle(el, "font-size");
    if (fontSize) {
      const parsedSize = parseFloat(fontSize);
      if (parsedSize <= 1 && (fontSize.endsWith("px") || fontSize.endsWith("pt") || parsedSize === 0)) {
        processFinding(el, text, "tiny-font-size", findings, options);
        continue;
      }
    }
  }

  return findings;
}

function processFinding(
  el: Element,
  text: string,
  type: Finding["type"],
  findings: Finding[],
  options: DetectorOptions
): void {
  const isLegitimate = isLegitimateAccessibleOrUIContext(el);
  const isSuspicious = hasPromptInjectionPattern(text);

  let severity: Finding["severity"] = "medium";
  if (isSuspicious) {
    severity = "high";
  } else if (isLegitimate) {
    severity = "low";
  }

  // Deduplicate against parent findings if child has the exact same text
  const selector = getSelector(el);
  const isDuplicate = findings.some(
    (f) => f.text === text && (f.selector === selector || selector.startsWith(f.selector))
  );

  if (!isDuplicate) {
    if (severity !== "low" || options.includeLowSeverity) {
      findings.push({
        type,
        selector,
        text: text.length > 200 ? text.substring(0, 200) + "..." : text,
        severity,
      });
    }
  }
}
