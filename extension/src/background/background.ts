/**
 * Background Service Worker for Project AEGIS.
 * Coordinates security telemetry, badge counters, and network monitoring.
 */

let blockedThreatsCount = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Project AEGIS] Background service worker initialized.");
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "THREAT_BLOCKED") {
    blockedThreatsCount++;
    chrome.action.setBadgeText({ text: String(blockedThreatsCount) });
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" }); // Red badge
    sendResponse({ status: "acknowledged", total: blockedThreatsCount });
    return true;
  }

  if (message.type === "GET_THREAT_COUNT") {
    sendResponse({ count: blockedThreatsCount });
    return true;
  }

  if (message.type === "RESET_THREAT_COUNT") {
    blockedThreatsCount = 0;
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ count: 0 });
    return true;
  }
});
