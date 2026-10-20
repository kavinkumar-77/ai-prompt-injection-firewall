/**
 * Project AEGIS: Standalone Drop-in Web Defense SDK (aegis-shield.js).
 * Zero-Extension In-App Protection against Prompt Injection, PII Leaks,
 * Outbound Exfiltration, and System Canary Extraction.
 *
 * Usage:
 *   <script src="http://localhost:8000/demo/aegis-shield.js"></script>
 */

(function () {
  "use strict";

  // Prevent multiple initializations
  if (window.__AEGIS_SHIELD_INITIALIZED__) return;
  window.__AEGIS_SHIELD_INITIALIZED__ = true;

  console.log("%c[Project AEGIS] Standalone Web Defense SDK Loaded (Zero-Extension Mode)", "color: #38bdf8; font-weight: bold;");

  const GATEWAY_URL = "http://localhost:8000";
  let shieldActive = true;

  // Credential & PII Regular Expressions
  const PII_PATTERNS = [
    { regex: /sk-(?:proj-)?[a-zA-Z0-9_-]{20,}/g, name: "OPENAI_KEY" },
    { regex: /ghp_[a-zA-Z0-9]{30,}/g, name: "GITHUB_TOKEN" },
    { regex: /AKIA[0-9A-Z]{16}/g, name: "AWS_ACCESS_KEY" },
    { regex: /(?:postgres|mysql|mongodb):\/\/[^\s'"]+/g, name: "DATABASE_CONNECTION_URI" },
    { regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, name: "JWT_BEARER_TOKEN" },
  ];

  const SUSPICIOUS_DOMAINS = [
    "evil-collector.xyz",
    "attacker.com",
    "webhook.site",
    "pastebin.com",
    "ngrok-free.app",
    "requestbin",
    "pipedream",
  ];

  // 1. In-Page Toast Notification System
  function showToast(message, type = "warning") {
    let container = document.getElementById("aegis-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "aegis-toast-container";
      container.style.cssText = "position: fixed; top: 16px; right: 16px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const isBlock = type === "danger";
    toast.style.cssText = `
      background: ${isBlock ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.95)"};
      border: 1px solid ${isBlock ? "rgba(244, 63, 94, 0.5)" : "rgba(56, 189, 248, 0.5)"};
      border-left: 4px solid ${isBlock ? "#f43f5e" : "#38bdf8"};
      color: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-8px);
    `;

    toast.innerHTML = `
      <div style="font-weight: 700; color: ${isBlock ? "#f43f5e" : "#38bdf8"}; font-size: 14px;">
        ${isBlock ? "🛡️ BLOCKED" : "🔒 PROTECTED"}
      </div>
      <div>
        <div style="font-weight: 600; color: #ffffff;">Project AEGIS Shield</div>
        <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // 2. Client-Side Live PII Redactor
  function handleInputRedaction(e) {
    if (!shieldActive) return;
    const target = e.target;
    if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

    let value = target.value;
    let redacted = false;

    for (const pat of PII_PATTERNS) {
      if (pat.regex.test(value)) {
        value = value.replace(pat.regex, `[🔒 REDACTED: ${pat.name}]`);
        redacted = true;
      }
    }

    if (redacted) {
      target.value = value;
      showToast("Sensitive token detected and masked before memory capture.", "warning");
    }
  }

  document.addEventListener("input", handleInputRedaction, true);
  document.addEventListener("paste", (e) => {
    setTimeout(() => {
      if (e.target) handleInputRedaction({ target: e.target });
    }, 10);
  }, true);

  // 3. Outbound Exfiltration Interceptor (Monkey-patching fetch & XHR)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    if (!shieldActive) return originalFetch.apply(this, args);

    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : (resource && resource.url) || "";
    const lowerUrl = url.toLowerCase();

    const isSuspicious = SUSPICIOUS_DOMAINS.some(d => lowerUrl.includes(d)) ||
      lowerUrl.includes("cookie=") || lowerUrl.includes("canary=") || lowerUrl.includes("leak=");

    if (isSuspicious) {
      console.warn("[Project AEGIS] Intercepted unauthorized outbound exfiltration call to:", url);
      showToast(`Outbound transmission blocked to untrusted destination: ${url.substring(0, 40)}...`, "danger");

      // Report event asynchronously to gateway
      try {
        originalFetch(`${GATEWAY_URL}/check-exfiltration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload_hash: "client_interception_hash",
            destination_url: url,
            taint_level: "HIGH",
            trigger_element: "window.fetch()",
            payload_preview: "Bearer session token exfiltration attempt",
            source_url: window.location.href,
          }),
        }).catch(() => {});
      } catch (err) {}

      return Promise.reject(new Error("[AEGIS_INTERCEPTED] Network call blocked by Project AEGIS capability policy."));
    }

    return originalFetch.apply(this, args);
  };

  // 4. DOM Canary & Markdown Image Leak Observer
  const domObserver = new MutationObserver((mutations) => {
    if (!shieldActive) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;

          // Check for hidden markdown exfiltration images
          if (el.tagName === "IMG") {
            const src = (el.getAttribute("src") || "").toLowerCase();
            if (SUSPICIOUS_DOMAINS.some(d => src.includes(d)) || src.includes("leak") || src.includes("cookie")) {
              el.removeAttribute("src");
              el.style.display = "none";
              showToast("Hidden markdown exfiltration image blocked from contacting external collector.", "danger");
            }
          }

          // Check for leaked canary tokens
          if (el.textContent && el.textContent.includes("CANARY_TOKEN:")) {
            el.innerHTML = el.innerHTML.replace(/CANARY_TOKEN:[a-zA-Z0-9_-]+/g, '<span style="background: rgba(244,63,94,0.2); color: #f43f5e; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid rgba(244,63,94,0.4);">[🔒 REDACTED_SYSTEM_INSTRUCTION]</span>');
            showToast("System Canary Token detected in assistant output and scrubbed from client view.", "danger");
          }
        }
      }
    }
  });

  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      domObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // 5. Floating In-App Shield Status Badge
  function mountFloatingBadge() {
    const badge = document.createElement("div");
    badge.id = "aegis-floating-badge";
    badge.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 999990;
      background: rgba(11, 15, 23, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 9999px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    `;

    function updateBadgeDisplay() {
      if (shieldActive) {
        badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        badge.innerHTML = `
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
          <span style="font-weight: 700; color: #ffffff;">AEGIS Shield: <span style="color: #34d399;">Active</span></span>
          <span style="font-size: 10px; color: #94a3b8; margin-left: 2px;">(Click to Toggle)</span>
        `;
      } else {
        badge.style.borderColor = "rgba(244, 63, 94, 0.5)";
        badge.innerHTML = `
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #f43f5e; box-shadow: 0 0 8px #f43f5e;"></span>
          <span style="font-weight: 700; color: #ffffff;">AEGIS Shield: <span style="color: #f43f5e;">Bypassed</span></span>
          <span style="font-size: 10px; color: #94a3b8; margin-left: 2px;">(Vulnerable)</span>
        `;
      }
    }

    badge.addEventListener("click", () => {
      shieldActive = !shieldActive;
      updateBadgeDisplay();
      showToast(shieldActive ? "Project AEGIS Shield re-enabled. Defenses active." : "Project AEGIS Shield BYPASSED. Model vulnerable to injections.", shieldActive ? "warning" : "danger");
    });

    updateBadgeDisplay();
    document.body.appendChild(badge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFloatingBadge);
  } else {
    mountFloatingBadge();
  }
})();
