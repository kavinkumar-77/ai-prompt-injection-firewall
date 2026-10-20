import { describe, expect, it } from "vitest";
import { scanForPii } from "../src/detectors/piiRedactor";

describe("PII & Secret Redactor", () => {
  it("detects and redacts standard OpenAI API key", () => {
    const raw = "Here is my key: sk-abcdef1234567890abcdef1234567890 for testing.";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.count).toBe(1);
    expect(result.types).toContain("OpenAI Key");
    expect(result.maskedText).toContain("[🔒 REDACTED_OPENAI_KEY]");
    expect(result.maskedText).not.toContain("sk-abcdef");
  });

  it("detects and redacts OpenAI Project API key", () => {
    const raw = "OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.types).toContain("OpenAI Project Key");
    expect(result.maskedText).toContain("[🔒 REDACTED_OPENAI_KEY]");
  });

  it("detects and redacts GitHub Personal Access Token", () => {
    const raw = "token: ghp_123456789012345678901234567890123456";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.types).toContain("GitHub Token");
    expect(result.maskedText).toContain("[🔒 REDACTED_GITHUB_TOKEN]");
  });

  it("detects and redacts AWS Access Key", () => {
    const raw = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.types).toContain("AWS Access Key");
    expect(result.maskedText).toContain("[🔒 REDACTED_AWS_KEY]");
  });

  it("detects and redacts JWT bearer token", () => {
    const raw = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.types).toContain("JWT Token");
    expect(result.maskedText).toContain("[🔒 REDACTED_JWT]");
  });

  it("detects and redacts Database connection strings", () => {
    const raw = "DATABASE_URL=postgres://admin:SuperSecretPass!@db.internal:5432/prod";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.types).toContain("Database URL");
    expect(result.maskedText).toContain("[🔒 REDACTED_DB_URL]");
    expect(result.maskedText).not.toContain("SuperSecretPass!");
  });

  it("detects and redacts Credit Cards and Social Security Numbers", () => {
    const raw = "Card: 4111111111111111 and SSN: 123-45-6789";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(true);
    expect(result.count).toBe(2);
    expect(result.types).toContain("Credit Card");
    expect(result.types).toContain("SSN");
    expect(result.maskedText).toContain("[🔒 REDACTED_CARD]");
    expect(result.maskedText).toContain("[🔒 REDACTED_SSN]");
  });

  it("leaves clean benign text unchanged", () => {
    const raw = "This is a standard document review about enterprise customer satisfaction.";
    const result = scanForPii(raw);
    expect(result.redacted).toBe(false);
    expect(result.count).toBe(0);
    expect(result.types.length).toBe(0);
    expect(result.maskedText).toBe(raw);
  });
});
