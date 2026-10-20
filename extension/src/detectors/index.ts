/**
 * Main entry point for hidden-text detector.
 */

import { detectAdvancedInjections } from "./advancedInjections";
import { detectAttributeInjections } from "./attributeInjections";
import { detectColorContrast } from "./colorContrast";
import { detectCssHidden } from "./cssHidden";
import { detectHtmlComments } from "./htmlComments";
import { detectOffScreen } from "./offScreen";
import { DetectorOptions, Finding, FindingType, Severity } from "./types";
import { detectUnicodeTricks } from "./unicodeTricks";

export * from "./types";
export * from "./piiRedactor";
export * from "./canaryShield";
export {
  detectAdvancedInjections,
  detectAttributeInjections,
  detectColorContrast,
  detectCssHidden,
  detectHtmlComments,
  detectOffScreen,
  detectUnicodeTricks,
};

/**
 * Scans an entire Document or Element subtree for hidden text and prompt injections.
 *
 * @param root The root Document or Element to scan.
 * @param options Configuration options for detection and false-positive tolerance.
 * @returns Array of detected findings.
 */
export function scanDocument(
  root: Document | Element,
  options: DetectorOptions = {}
): Finding[] {
  const findings: Finding[] = [
    ...detectCssHidden(root, options),
    ...detectOffScreen(root, options),
    ...detectColorContrast(root, options),
    ...detectHtmlComments(root, options),
    ...detectUnicodeTricks(root, options),
    ...detectAttributeInjections(root, options),
    ...detectAdvancedInjections(root, options),
  ];

  return findings;
}
