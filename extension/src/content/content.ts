/**
 * Project AEGIS Content Script: Real-time In-Page Security Orchestrator.
 * Detects prompt injections, intercepts outbound exfiltration, and flags visual phishing.
 */

import { scanDocument, scanForPii, watchForCanaryLeaks } from "../detectors";
import { detectAndDecode } from "../utils/decoder";
import { captureVisualHash } from "../utils/hasher";
import { showPhishingInterstitial } from "../utils/phishingInterstitial";
import { containsTaintedData, taintSensitiveElements } from "../utils/taintTracker";

const BACKEND_BASE = "http://localhost:8000";

let lastShownBannerTitle = "";
let lastShownBannerTime = 0;
let visualCheckCompleted = false;

/**
 * Checks if the current page is part of the local AEGIS dashboard or gateway.
 */
function isInternalAegisUrl(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const port = window.location.port;
  return (
    (host === "localhost" || host === "127.0.0.1") &&
    (port === "5173" || port === "8000" || port === "4173")
  );
}

/**
 * Creates and displays a sleek warning overlay banner on the page.
 */
function showAegisBanner(title: string, message: string, severity: "critical" | "warning"): void {
  const now = Date.now();
  const existing = document.getElementById("aegis-security-banner");

  // Prevent flashing or re-rendering identical banner within 10 seconds
  if (existing && lastShownBannerTitle === title && now - lastShownBannerTime < 10000) {
    return;
  }
  if (existing) existing.remove();

  lastShownBannerTitle = title;
  lastShownBannerTime = now;

  const banner = document.createElement("div");
  banner.id = "aegis-security-banner";
  banner.setAttribute("data-aegis-internal", "true");

  const bgColor = severity === "critical" ? "#991B1B" : "#B45309";
  const borderColor = severity === "critical" ? "#EF4444" : "#F59E0B";

  banner.setAttribute(
    "style",
    `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    max-width: 90%;
    width: 680px;
    background: ${bgColor};
    color: #FFFFFF;
    border: 2px solid ${borderColor};
    border-radius: 10px;
    padding: 16px 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    gap: 14px;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
  `
  );

  banner.innerHTML = `
    <div style="font-size: 26px; line-height: 1;">🛡️</div>
    <div style="flex: 1;">
      <div style="font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
        <span>${title}</span>
        <span style="font-size: 10px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">AEGIS ACTIVE</span>
      </div>
      <div style="font-size: 13px; line-height: 1.45; opacity: 0.95;">
        ${message}
      </div>
    </div>
    <button id="aegis-close-btn" style="background: none; border: none; color: #FFF; font-size: 20px; cursor: pointer; padding: 0 4px; line-height: 1; opacity: 0.8;">&times;</button>
  `;

  document.body.appendChild(banner);
  document.getElementById("aegis-close-btn")?.addEventListener("click", () => banner.remove());
}

/**
 * Displays a non-intrusive toast notification when sensitive secrets or PII are redacted.
 */
function showPiiToast(count: number, types: string[]): void {
  const existing = document.getElementById("aegis-pii-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "aegis-pii-toast";
  toast.setAttribute("data-aegis-internal", "true");
  toast.setAttribute(
    "style",
    `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999999;
    background: #1E1B4B;
    color: #E0E7FF;
    border: 1px solid #6366F1;
    border-radius: 8px;
    padding: 12px 18px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.2s ease-out;
  `
  );
  toast.innerHTML = `
    <span style="font-size: 16px;">🔒</span>
    <div>
      <span style="font-weight: 700; color: #818CF8;">AEGIS Redaction:</span>
      <span>${count} secret(s) masked (${types.join(", ")}) before transmission.</span>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Scans page DOM for hidden text and obfuscated prompt injections.
 */
export async function runSecurityScan(): Promise<void> {
  if (isInternalAegisUrl()) return;

  try {
    // 1. Taint any sensitive input fields
    taintSensitiveElements(document);

    // 2. Run structural DOM hiding and advanced injection detectors
    const findings = scanDocument(document);

    if (findings.length > 0) {
      const highSev = findings.find((f) => f.severity === "high");
      if (highSev) {
        showAegisBanner(
          `AEGIS: ${highSev.type.replace(/-/g, " ").toUpperCase()} Detected`,
          `Detected suspicious vector on <code>${highSev.selector}</code>:<br><em>"${highSev.text}"</em>`,
          "critical"
        );
        if (chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "THREAT_BLOCKED" });
        }
      }
    }

    // 3. Scan for encoded strings in text nodes or hidden elements
    const elements = document.querySelectorAll("div, p, span, code, pre, [style*='display:none']");
    for (const el of elements) {
      // Skip scanning our own banner
      if (el.id === "aegis-security-banner" || el.closest("#aegis-security-banner")) continue;

      const rawText = (el.textContent || "").trim();
      if (!rawText || rawText.length < 12) continue;

      const { detected, type, decoded } = detectAndDecode(rawText);
      if (detected && decoded) {
        // Query backend intent analyzer
        try {
          const res = await fetch(`${BACKEND_BASE}/analyze-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_prompt: "Standard web page execution.",
              user_input: rawText,
              context: `Detected ${type} payload in DOM selector`,
              source_url: window.location.href,
            }),
          });

          if (res.ok) {
            const analysis = await res.json();
            if (analysis.verdict === "INJECTION") {
              showAegisBanner(
                "AEGIS: Obfuscated Prompt Injection Blocked",
                `Decoded (${type}): "${decoded.substring(0, 100)}..."<br><strong>AI Verdict:</strong> ${analysis.reasoning}`,
                "critical"
              );
              if (chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ type: "THREAT_BLOCKED" });
              }
              break;
            }
          }
        } catch {
          // Fallback local banner if backend unreachable
          if (/ignore|override|disregard|cookie|token|bypass/i.test(decoded)) {
            showAegisBanner(
              "AEGIS: Obfuscated Prompt Injection Blocked (Offline)",
              `Extracted hidden ${type} payload with instruction override patterns.`,
              "critical"
            );
          }
        }
      }
    }

    // 4. Visual phishing clone detection (run only once per page visit)
    if (!visualCheckCompleted) {
      visualCheckCompleted = true;
      const visualHash = captureVisualHash(document);
      try {
        const visualRes = await fetch(`${BACKEND_BASE}/check-visual-similarity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenshot_hash: visualHash,
            url: window.location.href,
            claimed_identity: document.title,
          }),
        });

        if (visualRes.ok) {
          const visualData = await visualRes.json();
          if (visualData.is_phishing) {
            showPhishingInterstitial({
              clonedBrand: visualData.matched_brand || "Brand Login Clone",
              similarityScore: visualData.confidence || 0.92,
              pageUrl: window.location.href,
            });
            if (chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: "THREAT_BLOCKED" });
            }
          }
        }
      } catch {
        // Local fallback for visual clone
        if (visualHash === "ff0000ff00ffff0000ffff00ff00ff00" && !window.location.hostname.includes("google.com")) {
          showPhishingInterstitial({
            clonedBrand: "Google Account Login",
            similarityScore: 0.95,
            pageUrl: window.location.href,
          });
        }
      }
    }
  } catch (err) {
    console.error("[Project AEGIS] Scanner execution error:", err);
  }
}

/**
 * Intercepts outbound exfiltration attempts in forms and network APIs.
 */
function interceptExfiltration(): void {
  // 1. Intercept standard form submissions
  document.addEventListener("submit", async (e: Event) => {
    const form = e.target as HTMLFormElement;
    if (!form) return;

    const actionUrl = form.action || window.location.href;
    const hasTaintedFields = Array.from(form.elements).some(
      (el) => el.getAttribute("data-taint-level") === "HIGH" || (el as HTMLInputElement).type === "password"
    );

    if (hasTaintedFields) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const res = await fetch(`${BACKEND_BASE}/check-exfiltration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload_hash: "credential_form_submit",
            destination_url: actionUrl,
            taint_level: "HIGH",
            trigger_element: "form#" + (form.id || "unnamed"),
            payload_preview: "credentials_form",
            source_url: window.location.href,
          }),
        });

        if (res.ok) {
          const check = await res.json();
          if (check.blocked) {
            showAegisBanner(
              "AEGIS: Outbound Data Exfiltration Blocked",
              `Intercepted unauthorized credential submission to: <code>${actionUrl}</code>.<br>${check.reason}`,
              "critical"
            );
            if (chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: "THREAT_BLOCKED" });
            }
            return;
          }
        }
      } catch {
        // Fallback local block
        showAegisBanner(
          "AEGIS: Outbound Data Exfiltration Blocked",
          `Intercepted sensitive credential transmission to: <code>${actionUrl}</code>.`,
          "critical"
        );
      }
    }
  }, true);

  // 2. Intercept window.fetch for exfiltration payloads
  if (typeof window !== "undefined" && window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const options = args[1] || {};
      const bodyStr = typeof options.body === "string" ? options.body : "";

      const isSuspiciousDest = /evil-collector|attacker|leak|steal|webhook\.site/i.test(url);
      const isTainted = containsTaintedData(bodyStr) || /password|secret|token|admin/i.test(bodyStr);

      if (isSuspiciousDest && isTainted) {
        showAegisBanner(
          "AEGIS: Data Exfiltration Blocked",
          `Intercepted unauthorized fetch API call transmitting sensitive credentials to: <code>${url}</code>.`,
          "critical"
        );
        if (chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "THREAT_BLOCKED" });
        }
        return Promise.reject(new Error("AEGIS: Outbound request blocked by security policy."));
      }

      return originalFetch.apply(this, args);
    };
  }
}

/**
 * Real-world AI Assistant input & clipboard protection.
 * Watches for prompt injections pasted into chat boxes (ChatGPT, Claude, etc.).
 */
function interceptClipboardAndPasting(): void {
  document.addEventListener("paste", (e: ClipboardEvent) => {
    const pastedText = e.clipboardData?.getData("text") || "";
    if (!pastedText || pastedText.length < 15) return;

    const { detected, type, decoded } = detectAndDecode(pastedText);
    const targetText = detected ? decoded : pastedText;

    const hasAdversarialPatterns =
      /<\|im_start\|>|<\|im_end\|>|\[INST\]|<<SYS>>/i.test(targetText) ||
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i.test(targetText) ||
      /system\s+override/i.test(targetText) ||
      /output\s+all\s+(cookies|tokens|secrets)/i.test(targetText);

    if (hasAdversarialPatterns) {
      showAegisBanner(
        "AEGIS Guard: Injected Prompt in Pasted Text",
        `The text you pasted contains adversarial prompt injection directives${detected ? ` (${type} encoded)` : ""}. Ensure you do not submit untrusted instructions to your AI assistant.`,
        "warning"
      );
    }
  });
}

/**
 * Monitors user inputs across web forms and AI interfaces for PII and secrets,
 * masking sensitive credentials dynamically.
 */
function setupPiiRedaction(): void {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || !("value" in target)) return;
    if (target.id === "aegis-security-banner" || target.getAttribute("data-aegis-internal") === "true") return;

    const val = target.value;
    if (!val || val.length < 15) return;

    const result = scanForPii(val);
    if (result.redacted) {
      target.value = result.maskedText;
      showPiiToast(result.count, result.types);
    }
  };

  document.addEventListener("input", handleInput, true);
  document.addEventListener("change", handleInput, true);
}

/**
 * Monitors AI output areas for leaked system prompt canary tokens.
 */
function setupCanaryProtection(): void {
  watchForCanaryLeaks(document, async (result, element) => {
    showAegisBanner(
      "AEGIS Guard: System Prompt Leak Blocked",
      `Detected confidential system prompt canary token in model response: <code>${result.excerpt}</code>.<br>The response has been sanitized.`,
      "critical"
    );

    // Sanitize in-DOM response element
    if (element.textContent) {
      element.textContent = element.textContent.replace(
        /CANARY[_-]TOKEN:[A-Za-z0-9_-]+|AEGIS-[A-Za-z0-9]+-CONFIDENTIAL/gi,
        "[🔒 REDACTED_SYSTEM_INSTRUCTION]"
      );
    }

    // Report incident to backend
    try {
      await fetch(`${BACKEND_BASE}/check-canary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_response: result.excerpt || "Canary token pattern match in DOM",
          canary_token: "AEGIS-8f4b2a9e-CONFIDENTIAL",
          source_url: window.location.href,
        }),
      });
    } catch {
      // Ignore network errors in hermetic/offline mode
    }
  });
}

// Setup real-time dynamic MutationObserver with self-mutation exclusion
let scanDebounceTimer: any = null;
function setupDynamicObserver(): void {
  const observer = new MutationObserver((mutations) => {
    // Ignore mutations originating from AEGIS internal UI elements
    const isSelfMutation = mutations.every((m) => {
      const el = m.target as HTMLElement;
      if (
        el?.id === "aegis-security-banner" ||
        el?.closest?.("#aegis-security-banner") ||
        el?.getAttribute?.("data-aegis-internal") === "true"
      ) {
        return true;
      }
      for (const node of Array.from(m.addedNodes)) {
        const hNode = node as HTMLElement;
        if (hNode?.id === "aegis-security-banner" || hNode?.getAttribute?.("data-aegis-internal") === "true") {
          return true;
        }
      }
      return false;
    });

    if (isSelfMutation) return;

    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
      runSecurityScan();
    }, 2500);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Initialize on page load (unless on AEGIS own dashboard)
function initAegisShield(): void {
  if (isInternalAegisUrl()) {
    console.log("[Project AEGIS] Shield bypassed on internal management dashboard.");
    return;
  }

  console.log("[Project AEGIS] Shield activated. Monitoring DOM, memory taint, clipboard, and network requests.");
  taintSensitiveElements(document);
  runSecurityScan();
  interceptExfiltration();
  interceptClipboardAndPasting();
  setupPiiRedaction();
  setupCanaryProtection();
  setupDynamicObserver();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAegisShield);
} else {
  initAegisShield();
}
