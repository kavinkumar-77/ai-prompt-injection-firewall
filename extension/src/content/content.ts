// Content script injected into host pages
import { scanDocument } from "../detectors";

console.log("[AI Prompt Firewall] Content script initialized and actively monitoring DOM.");

/**
 * Runs the hidden-text and indirect prompt injection scanner on the current page.
 */
function runScanner(): void {
  try {
    const findings = scanDocument(document);

    if (findings.length > 0) {
      console.warn(
        `[AI Prompt Firewall] ⚠️ Flagged ${findings.length} hidden or suspicious element(s) on this page:`,
        findings
      );
    } else {
      console.log("[AI Prompt Firewall] ✅ Page scan complete: No hidden prompt injections detected.");
    }
  } catch (error) {
    console.error("[AI Prompt Firewall] Error running DOM scan:", error);
  }
}

// Run scanner when document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runScanner);
} else {
  runScanner();
}
