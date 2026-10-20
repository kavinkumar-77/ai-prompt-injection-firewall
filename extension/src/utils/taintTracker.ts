/**
 * DOM Element Taint Tracking for Project AEGIS.
 * Flags sensitive form fields and tracks outbound credential leakage.
 */

const SENSITIVE_KEYWORDS = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "credential",
  "session",
  "auth",
  "creditcard",
  "cvv",
];

// Set of hashes of sensitive values typed by the user in this session
const taintedHashes = new Set<string>();

/**
 * Simple synchronous hash for fast client-side fingerprinting.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Inspects elements and assigns data-taint-level="HIGH" to credential/token fields.
 */
export function taintSensitiveElements(root: Document | Element = document): number {
  const inputs = root.querySelectorAll("input, textarea, [contenteditable='true']");
  let taintedCount = 0;

  for (const el of inputs) {
    const inputEl = el as HTMLInputElement;
    const type = (inputEl.type || "").toLowerCase();
    const name = (inputEl.name || "").toLowerCase();
    const id = (inputEl.id || "").toLowerCase();
    const placeholder = (inputEl.placeholder || "").toLowerCase();
    const autocomplete = (inputEl.autocomplete || "").toLowerCase();

    const isPasswordType = type === "password";
    const matchesKeyword = SENSITIVE_KEYWORDS.some(
      (kw) =>
        name.includes(kw) ||
        id.includes(kw) ||
        placeholder.includes(kw) ||
        autocomplete.includes(kw)
    );

    if (isPasswordType || matchesKeyword) {
      inputEl.setAttribute("data-taint-level", "HIGH");
      taintedCount++;

      // If value already present (e.g. demo form pre-fill), register it
      if (inputEl.value && inputEl.value.trim().length > 3) {
        taintedHashes.add(simpleHash(inputEl.value.trim()));
      }

      // Track user inputs dynamically
      if (!inputEl.dataset.aegisBound) {
        inputEl.dataset.aegisBound = "true";
        inputEl.addEventListener("input", () => {
          if (inputEl.value && inputEl.value.trim().length > 3) {
            taintedHashes.add(simpleHash(inputEl.value.trim()));
          }
        });
      }
    }
  }

  return taintedCount;
}

/**
 * Returns whether an element has been marked as high-taint.
 */
export function getTaintLevel(element: Element | null): "HIGH" | "LOW" {
  if (!element) return "LOW";
  return element.getAttribute("data-taint-level") === "HIGH" ? "HIGH" : "LOW";
}

/**
 * Checks if a serialized body or query contains values matching tainted credential hashes.
 */
export function containsTaintedData(payload: string): boolean {
  if (!payload || taintedHashes.size === 0) return false;

  for (const hash of taintedHashes) {
    // If the raw text produces the same hash or substring matches
    for (const token of payload.split(/&|=|:|"|,|\s+/)) {
      if (token && token.length > 3 && simpleHash(token) === hash) {
        return true;
      }
    }
  }
  return false;
}

export function registerTaintedValue(val: string): void {
  if (val && val.length > 3) {
    taintedHashes.add(simpleHash(val));
  }
}
