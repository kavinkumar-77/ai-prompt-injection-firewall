/**
 * DOM and CSS inspection utility functions.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+(prompt|override|command)/i,
  /disregard\s+(all\s+)?(prior|above|preceding)/i,
  /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|unrestricted)/i,
  /assistant:\s*/i,
  /new\s+instructions?:/i,
  /send\s+(auth|cookie|token|data|password)\s+to/i,
  /bypass\s+safety/i,
  /exfiltrat/i,
];

/**
 * Checks if a string contains known adversarial prompt injection keywords.
 */
export function hasPromptInjectionPattern(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Derives a human-readable CSS selector for an Element.
 */
export function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === 1 && current !== element.ownerDocument.body) {
    let selector = current.tagName.toLowerCase();
    if (current.className && typeof current.className === "string") {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(".");
      if (classes) {
        selector += `.${classes}`;
      }
    }

    const parentNode: Element | null = current.parentElement;
    if (parentNode) {
      const siblings: Element[] = Array.from(parentNode.children);
      const sameTagSiblings = siblings.filter((child: Element) => child.tagName === current?.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    if (parts.length >= 3) break;
    current = parentNode;
  }

  return parts.join(" > ") || element.tagName.toLowerCase();
}

/**
 * Retrieves the computed or inline CSS property of an element.
 */
export function getEffectiveStyle(element: Element, property: string): string {
  const win = element.ownerDocument.defaultView;
  if (win && typeof win.getComputedStyle === "function") {
    try {
      const computed = win.getComputedStyle(element);
      const val = computed.getPropertyValue(property);
      if (val) return val.trim();
    } catch {
      // Fallback to inline style if computed style fails in test runner
    }
  }

  const htmlEl = element as HTMLElement;
  if (htmlEl.style) {
    const inlineVal = htmlEl.style.getPropertyValue(property);
    if (inlineVal) return inlineVal.trim();
  }

  const styleAttr = element.getAttribute("style");
  if (styleAttr) {
    const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, "i");
    const match = styleAttr.match(regex);
    if (match) return match[1].trim();
  }

  return "";
}

/**
 * Determines whether an element represents legitimate accessibility or collapsed UI.
 */
export function isLegitimateAccessibleOrUIContext(element: Element): boolean {
  const classNames = (element.getAttribute("class") || "").toLowerCase();
  const role = (element.getAttribute("role") || "").toLowerCase();
  const ariaExpanded = element.getAttribute("aria-expanded");

  // Screen reader utility classes
  if (
    classNames.includes("sr-only") ||
    classNames.includes("visually-hidden") ||
    classNames.includes("screen-reader-text")
  ) {
    return true;
  }

  // Interactive collapsed components (menus, accordions, dialogs, tabs)
  if (
    ariaExpanded === "false" ||
    role === "menu" ||
    role === "menubar" ||
    role === "tabpanel" ||
    role === "tooltip" ||
    element.closest("nav") !== null ||
    element.closest("details") !== null ||
    element.closest("dialog") !== null ||
    classNames.includes("accordion") ||
    classNames.includes("dropdown") ||
    classNames.includes("collapse")
  ) {
    return true;
  }

  return false;
}

/**
 * Simple color parser converting CSS color strings to RGBA.
 */
export function parseColor(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  if (!colorStr) return null;
  const c = colorStr.trim().toLowerCase();

  // Named basic colors
  if (c === "white" || c === "#fff" || c === "#ffffff") return { r: 255, g: 255, b: 255, a: 1 };
  if (c === "black" || c === "#000" || c === "#000000") return { r: 0, g: 0, b: 0, a: 1 };
  if (c === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  // Hex colors
  if (c.startsWith("#")) {
    const hex = c.substring(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1,
      };
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}
