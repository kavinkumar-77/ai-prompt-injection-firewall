import { DetectorOptions, Finding } from "./types";
import {
  getEffectiveStyle,
  getSelector,
  hasPromptInjectionPattern,
  isLegitimateAccessibleOrUIContext,
} from "./utils";

/**
 * Detects elements placed far off-screen or clipped out of view.
 */
export function detectOffScreen(root: Element | Document, options: DetectorOptions = {}): Finding[] {
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

    const text = (el.textContent || "").trim();
    if (!text) continue;

    // Check position & negative offsets
    const position = getEffectiveStyle(el, "position");
    const isPositioned = position === "absolute" || position === "fixed";

    const left = getEffectiveStyle(el, "left");
    const top = getEffectiveStyle(el, "top");
    const parsedLeft = parseFloat(left);
    const parsedTop = parseFloat(top);

    const isNegativeLeft = !isNaN(parsedLeft) && parsedLeft <= -900;
    const isNegativeTop = !isNaN(parsedTop) && parsedTop <= -900;

    if (isPositioned && (isNegativeLeft || isNegativeTop)) {
      recordFinding(el, text, "offscreen-position", findings, options);
      continue;
    }

    // Check clip and clip-path
    const clip = getEffectiveStyle(el, "clip");
    const clipPath = getEffectiveStyle(el, "clip-path");

    const isClipped =
      clip.includes("rect(0") ||
      clip.includes("rect(1px") ||
      clipPath.includes("inset(50%)") ||
      clipPath.includes("polygon(0");

    if (isClipped) {
      recordFinding(el, text, "clipped-content", findings, options);
      continue;
    }
  }

  return findings;
}

function recordFinding(
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
