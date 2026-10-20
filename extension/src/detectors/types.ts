/**
 * Type definitions for hidden-text detector findings.
 */

export type FindingType =
  | "css-display-none"
  | "css-visibility-hidden"
  | "tiny-font-size"
  | "zero-opacity"
  | "offscreen-position"
  | "clipped-content"
  | "color-contrast-match"
  | "html-comment"
  | "zero-width-unicode"
  | "unicode-tag-characters"
  | "suspicious-alt-text"
  | "suspicious-title-attribute"
  | "suspicious-aria-label"
  | "markdown-image-exfiltration"
  | "chat-template-delimiter"
  | "indirect-rag-poison";

export type Severity = "high" | "medium" | "low";

export interface Finding {
  type: FindingType;
  selector: string;
  text: string;
  severity: Severity;
}

export interface DetectorOptions {
  /**
   * Whether to include low-severity accessible or structural findings.
   * Defaults to false to keep false positives minimal.
   */
  includeLowSeverity?: boolean;
}
