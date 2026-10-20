// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { showPhishingInterstitial } from "../src/utils/phishingInterstitial";

describe("Phishing Interstitial UI", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  it("injects full-screen overlay into the document", () => {
    showPhishingInterstitial(
      {
        clonedBrand: "Google Account Login",
        similarityScore: 0.94,
        pageUrl: "http://malicious-site.com/login",
      },
      document
    );

    const overlay = document.getElementById("aegis-phishing-interstitial");
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("Google Account Login");
    expect(overlay?.textContent).toContain("94% similarity");
  });

  it("is idempotent and replaces existing overlay instead of duplicating", () => {
    showPhishingInterstitial(
      {
        clonedBrand: "Google Account Login",
        similarityScore: 0.94,
        pageUrl: "http://malicious-site.com/login",
      },
      document
    );

    showPhishingInterstitial(
      {
        clonedBrand: "Microsoft 365",
        similarityScore: 0.98,
        pageUrl: "http://malicious-site.com/ms-login",
      },
      document
    );

    const overlays = document.querySelectorAll("#aegis-phishing-interstitial");
    expect(overlays.length).toBe(1);
    expect(overlays[0].textContent).toContain("Microsoft 365");
  });

  it("removes overlay and style when proceed anyway is clicked", () => {
    showPhishingInterstitial(
      {
        clonedBrand: "Google Account Login",
        similarityScore: 0.94,
        pageUrl: "http://malicious-site.com/login",
      },
      document
    );

    const dismissBtn = document.getElementById("aegis-btn-dismiss");
    expect(dismissBtn).not.toBeNull();
    dismissBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.getElementById("aegis-phishing-interstitial")).toBeNull();
    expect(document.getElementById("aegis-interstitial-styles")).toBeNull();
  });
});
