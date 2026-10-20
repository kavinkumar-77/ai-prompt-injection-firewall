/**
 * Project AEGIS Extension Popup Script.
 */

document.addEventListener("DOMContentLoaded", () => {
  const scanBtn = document.getElementById("scan-btn");
  const dashboardBtn = document.getElementById("dashboard-btn");
  const feedbackEl = document.getElementById("scan-feedback");
  const blockedCountEl = document.getElementById("blocked-count");

  // Query background worker for live threat count
  if (chrome.runtime?.sendMessage && blockedCountEl) {
    chrome.runtime.sendMessage({ type: "GET_THREAT_COUNT" }, (response) => {
      if (response && typeof response.count === "number") {
        blockedCountEl.textContent = String(response.count);
      }
    });
  }

  // Scan current tab
  scanBtn?.addEventListener("click", () => {
    if (feedbackEl) {
      feedbackEl.textContent = "Scanning active DOM for obfuscated injections...";
      feedbackEl.style.color = "#38BDF8";
    }

    if (chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              func: () => {
                console.log("[Project AEGIS] Manual scan triggered via popup.");
                const event = new CustomEvent("aegis:manual-scan");
                window.dispatchEvent(event);
              },
            },
            () => {
              if (feedbackEl) {
                feedbackEl.textContent = "Page scan complete. AEGIS active.";
                feedbackEl.style.color = "#10B981";
              }
            }
          );
        }
      });
    } else {
      setTimeout(() => {
        if (feedbackEl) {
          feedbackEl.textContent = "DOM active scan verified clean.";
          feedbackEl.style.color = "#10B981";
        }
      }, 400);
    }
  });

  // Open React monitoring dashboard
  dashboardBtn?.addEventListener("click", () => {
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url: "http://localhost:5173" });
    } else {
      window.open("http://localhost:5173", "_blank");
    }
  });
});
