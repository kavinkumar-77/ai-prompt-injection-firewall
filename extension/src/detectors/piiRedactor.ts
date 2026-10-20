/**
 * PII & Secret Redactor for Project AEGIS.
 * Detects and masks sensitive credentials, tokens, and PII before transmission.
 */

export interface RedactionResult {
  redacted: boolean;
  count: number;
  types: string[];
  maskedText: string;
}

export interface PiiPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export const PII_PATTERNS: PiiPattern[] = [
  // API Keys & Tokens
  { name: "OpenAI Project Key", pattern: /sk-proj-[a-zA-Z0-9_-]{20,}/g, replacement: "[🔒 REDACTED_OPENAI_KEY]" },
  { name: "OpenAI Key", pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: "[🔒 REDACTED_OPENAI_KEY]" },
  { name: "Anthropic Key", pattern: /sk-ant-[a-zA-Z0-9_-]{30,}/g, replacement: "[🔒 REDACTED_ANTHROPIC_KEY]" },
  { name: "Google API Key", pattern: /AIza[0-9A-Za-z_-]{35}/g, replacement: "[🔒 REDACTED_GOOGLE_KEY]" },
  { name: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9_]{36}/g, replacement: "[🔒 REDACTED_GITHUB_TOKEN]" },
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/g, replacement: "[🔒 REDACTED_AWS_KEY]" },
  { name: "AWS Secret", pattern: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/gi, replacement: "[🔒 REDACTED_AWS_SECRET]" },
  { name: "JWT Token", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, replacement: "[🔒 REDACTED_JWT]" },
  // Database Connection Strings
  { name: "Database URL", pattern: /(postgres|postgresql|mysql|mongodb|redis):\/\/[^:]+:[^@\s]+@[^\s]+/gi, replacement: "[🔒 REDACTED_DB_URL]" },
  // Financial & PII
  { name: "Credit Card", pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, replacement: "[🔒 REDACTED_CARD]" },
  { name: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[🔒 REDACTED_SSN]" },
  // Cryptographic Private Keys
  { name: "Private Key", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, replacement: "[🔒 REDACTED_PRIVATE_KEY]" },
];

/**
 * Scans string for sensitive secrets, credentials, and PII and replaces them with masked tokens.
 */
export function scanForPii(text: string): RedactionResult {
  if (!text || typeof text !== "string") {
    return { redacted: false, count: 0, types: [], maskedText: text || "" };
  }

  let maskedText = text;
  let count = 0;
  const types: string[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    // Reset regex state if global
    pattern.lastIndex = 0;
    const matches = maskedText.match(pattern);
    if (matches && matches.length > 0) {
      maskedText = maskedText.replace(pattern, replacement);
      count += matches.length;
      if (!types.includes(name)) {
        types.push(name);
      }
    }
  }

  return {
    redacted: count > 0,
    count,
    types,
    maskedText,
  };
}
