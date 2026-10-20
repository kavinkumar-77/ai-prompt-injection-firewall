import { describe, expect, it } from "vitest";
import { scanForCanaryLeak } from "../src/detectors/canaryShield";

describe("Canary Shield Detector", () => {
  it("detects standard CANARY_TOKEN pattern", () => {
    const text = "System response: The internal code is CANARY_TOKEN:sec_88f99a00_priv.";
    const result = scanForCanaryLeak(text);
    expect(result.detected).toBe(true);
    expect(result.excerpt).toContain("CANARY_TOKEN:sec_88f99a00_priv");
  });

  it("detects AEGIS confidential canary format", () => {
    const text = "AI output leaking: AEGIS-8f4b2a9e-CONFIDENTIAL was extracted from system memory.";
    const result = scanForCanaryLeak(text);
    expect(result.detected).toBe(true);
    expect(result.excerpt).toContain("AEGIS-8f4b2a9e-CONFIDENTIAL");
  });

  it("detects leaked system prompt start header", () => {
    const text = "Here is what was requested: [SYSTEM PROMPT STARTS HERE] You are an agent...";
    const result = scanForCanaryLeak(text);
    expect(result.detected).toBe(true);
  });

  it("returns detected false on clean assistant output", () => {
    const text = "The customer satisfaction score for Q3 has reached 84.2%.";
    const result = scanForCanaryLeak(text);
    expect(result.detected).toBe(false);
    expect(result.pattern).toBeNull();
    expect(result.excerpt).toBeNull();
  });
});
