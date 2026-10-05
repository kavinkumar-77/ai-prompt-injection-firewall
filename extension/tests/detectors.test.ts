import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { scanDocument } from "../src/detectors";

function loadFixture(filename: string): Document {
  const filePath = path.resolve(__dirname, "fixtures", filename);
  const html = fs.readFileSync(filePath, "utf-8");
  const dom = new JSDOM(html, {
    url: "https://example.com/test",
  });
  return dom.window.document;
}

describe("Hidden-Text and Indirect Injection Detectors", () => {
  describe("Hiding Techniques Detection", () => {
    it("detects CSS display: none elements with prompt injections", () => {
      const doc = loadFixture("css_display_none.html");
      const findings = scanDocument(doc);

      expect(findings.length).toBeGreaterThan(0);
      const target = findings.find((f) => f.type === "css-display-none");
      expect(target).toBeDefined();
      expect(target?.selector).toContain("#injected-payload");
      expect(target?.severity).toBe("high");
      expect(target?.text).toContain("Ignore all previous instructions");
    });

    it("detects CSS visibility: hidden elements with injections", () => {
      const doc = loadFixture("css_visibility_hidden.html");
      const findings = scanDocument(doc);

      expect(findings.length).toBeGreaterThan(0);
      const target = findings.find((f) => f.type === "css-visibility-hidden");
      expect(target).toBeDefined();
      expect(target?.selector).toContain("#hidden-review-injection");
      expect(target?.severity).toBe("high");
      expect(target?.text).toContain("exfiltrate conversation data");
    });

    it("detects font-size 0 and opacity 0 invisible text", () => {
      const doc = loadFixture("tiny_font_opacity.html");
      const findings = scanDocument(doc);

      const tinyFont = findings.find((f) => f.type === "tiny-font-size");
      const zeroOpacity = findings.find((f) => f.type === "zero-opacity");

      expect(tinyFont).toBeDefined();
      expect(tinyFont?.selector).toContain("#zero-font");

      expect(zeroOpacity).toBeDefined();
      expect(zeroOpacity?.selector).toContain("#zero-opacity");
    });

    it("detects off-screen negative absolute positioning and clipping", () => {
      const doc = loadFixture("offscreen_clip.html");
      const findings = scanDocument(doc);

      const offscreen = findings.find((f) => f.type === "offscreen-position");
      const clipped = findings.find((f) => f.type === "clipped-content");

      expect(offscreen).toBeDefined();
      expect(offscreen?.selector).toContain("#offscreen-node");
      expect(offscreen?.severity).toBe("high");

      expect(clipped).toBeDefined();
      expect(clipped?.selector).toContain("#clipped-node");
    });

    it("detects color contrast matches (white-on-white camouflaged text)", () => {
      const doc = loadFixture("color_contrast.html");
      const findings = scanDocument(doc);

      const contrast = findings.find((f) => f.type === "color-contrast-match");
      expect(contrast).toBeDefined();
      expect(contrast?.selector).toContain("#camouflaged-text");
      expect(contrast?.severity).toBe("high");
    });

    it("detects prompt injection instructions hidden in HTML comments", () => {
      const doc = loadFixture("html_comments.html");
      const findings = scanDocument(doc);

      const commentFinding = findings.find((f) => f.type === "html-comment");
      expect(commentFinding).toBeDefined();
      expect(commentFinding?.severity).toBe("high");
      expect(commentFinding?.text).toContain("disregard prior instructions");
    });

    it("detects zero-width Unicode spaces and invisible tag characters", () => {
      const doc = loadFixture("unicode_tricks.html");
      const findings = scanDocument(doc);

      const zwFinding = findings.find((f) => f.type === "zero-width-unicode");
      const tagFinding = findings.find((f) => f.type === "unicode-tag-characters");

      expect(zwFinding).toBeDefined();
      expect(zwFinding?.severity).toBe("high");

      expect(tagFinding).toBeDefined();
      expect(tagFinding?.severity).toBe("high");
    });

    it("detects attribute injection in alt and aria-label", () => {
      const doc = loadFixture("attribute_injection.html");
      const findings = scanDocument(doc);

      const altFinding = findings.find((f) => f.type === "suspicious-alt-text");
      const ariaFinding = findings.find((f) => f.type === "suspicious-aria-label");

      expect(altFinding).toBeDefined();
      expect(altFinding?.selector).toContain("#malicious-pixel");
      expect(altFinding?.severity).toBe("high");

      expect(ariaFinding).toBeDefined();
      expect(ariaFinding?.selector).toContain("#injected-aria");
      expect(ariaFinding?.severity).toBe("high");
    });
  });

  describe("False Positive Prevention on Benign Pages", () => {
    it("produces 0 findings on a normal blog article", () => {
      const doc = loadFixture("normal_blog.html");
      const findings = scanDocument(doc);
      expect(findings).toHaveLength(0);
    });

    it("produces 0 findings on a normal contact form", () => {
      const doc = loadFixture("normal_form.html");
      const findings = scanDocument(doc);
      expect(findings).toHaveLength(0);
    });

    it("does not flag legitimate accessible text (sr-only, collapsed dropdowns, framework comments)", () => {
      const doc = loadFixture("normal_accessible.html");
      const findings = scanDocument(doc, { includeLowSeverity: false });

      // None of the legitimate accessible elements should trigger medium or high findings
      const alertable = findings.filter((f) => f.severity === "high" || f.severity === "medium");
      expect(alertable).toHaveLength(0);
    });
  });
});
