import { DetectorOptions, Finding } from "./types";
import {
  getEffectiveStyle,
  getSelector,
  hasPromptInjectionPattern,
} from "./utils";

/**
 * Checks for prompt injection payloads hidden inside alt, title, and aria-label attributes.
 */
export function detectAttributeInjections(root: Element | Document, options: DetectorOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const targetRoot = "body" in root && root.body ? root.body : (root as Element);
  const elements = targetRoot.querySelectorAll("[alt], [title], [aria-label]");

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

    // 1. Inspect alt attribute
    const alt = el.getAttribute("alt");
    if (alt) {
      inspectAttribute(el, "alt", alt, "suspicious-alt-text", findings);
    }

    // 2. Inspect title attribute
    const title = el.getAttribute("title");
    if (title) {
      inspectAttribute(el, "title", title, "suspicious-title-attribute", findings);
    }

    // 3. Inspect aria-label attribute
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) {
      inspectAttribute(el, "aria-label", ariaLabel, "suspicious-aria-label", findings);
    }
  }

  return findings;
}

function inspectAttribute(
  el: Element,
  attrName: string,
  value: string,
  type: Finding["type"],
  findings: Finding[]
): void {
  const val = value.trim();
  if (val.length < 10) return;

  const isExplicitInjection = hasPromptInjectionPattern(val);

  // Check if the host element is effectively hidden or a 1x1 tracking pixel
  const display = getEffectiveStyle(el, "display");
  const visibility = getEffectiveStyle(el, "visibility");
  const widthAttr = el.getAttribute("width");
  const heightAttr = el.getAttribute("height");
  const isPixel =
    (widthAttr === "1" || widthAttr === "0") && (heightAttr === "1" || heightAttr === "0");
  const isHiddenElement = display === "none" || visibility === "hidden" || isPixel;

  const hasDirectives = /\b(instructions?|prompt|system|assistant|override|bypass)\b/i.test(val);

  if (isExplicitInjection) {
    findings.push({
      type,
      selector: getSelector(el),
      text: `[${attrName}]: ${val.length > 200 ? val.substring(0, 200) + "..." : val}`,
      severity: "high",
    });
  } else if (isHiddenElement && hasDirectives) {
    findings.push({
      type,
      selector: getSelector(el),
      text: `[${attrName} on hidden element]: ${val.length > 200 ? val.substring(0, 200) + "..." : val}`,
      severity: "high",
    });
  } else if (val.length > 150 && hasDirectives) {
    findings.push({
      type,
      selector: getSelector(el),
      text: `[unusually long ${attrName}]: ${val.length > 200 ? val.substring(0, 200) + "..." : val}`,
      severity: "medium",
    });
  }
}
