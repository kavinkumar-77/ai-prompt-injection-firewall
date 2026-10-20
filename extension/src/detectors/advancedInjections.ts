/**
 * Advanced real-world prompt injection detectors for Project AEGIS.
 * Detects Markdown image exfiltration, chat template delimiters, and indirect RAG poisoning.
 */

import { DetectorOptions, Finding } from "./types";
import { getSelector } from "./utils";

const CHAT_DELIMITERS = [
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<<\/SYS>>/i,
  /<s>\[SYSTEM\]/i,
];

const MARKDOWN_IMAGE_EXFIL = /!\[.*?\]\(https?:\/\/[^\s)]+?(?:cookie|token|auth|key|secret|leak|exfil|data|session)=.*?\)/i;
const SUSPICIOUS_IMG_SRC = /https?:\/\/[^\s'"]+?(?:leak|steal|exfil|webhook\.site)[^\s'"]*?(?:cookie|token|key|data)=/i;

const INDIRECT_RAG_PATTERNS = [
  /(?:note\s+to|attention|instructions?\s+for)\s+(?:the\s+)?(?:ai|assistant|model|agent|llm)\s*:/i,
  /when\s+(?:an?\s+)?(?:ai|assistant|model|agent|summary\s+tool)\s+reads\s+this/i,
  /\[SYSTEM\s+(?:NOTE|INSTRUCTION|OVERRIDE)\]/i,
  /do\s+not\s+(?:mention|summarize|reveal)\s+this\s+to\s+the\s+user/i,
];

export function detectAdvancedInjections(
  root: Document | Element,
  options: DetectorOptions = {}
): Finding[] {
  const findings: Finding[] = [];
  const targetRoot = "body" in root && root.body ? root.body : (root as Element);

  // 1. Check all text-bearing elements
  const elements = targetRoot.querySelectorAll("p, div, span, li, blockquote, pre, code, article");

  for (const el of elements) {
    const text = (el.textContent || "").trim();
    if (!text || text.length < 8) continue;

    // Check Chat Template Delimiters
    for (const pattern of CHAT_DELIMITERS) {
      if (pattern.test(text)) {
        findings.push({
          type: "chat-template-delimiter",
          selector: getSelector(el),
          text: `Chat delimiter found: "${text.substring(0, 150)}"`,
          severity: "high",
        });
        break;
      }
    }

    // Check Markdown image exfiltration
    if (MARKDOWN_IMAGE_EXFIL.test(text)) {
      findings.push({
        type: "markdown-image-exfiltration",
        selector: getSelector(el),
        text: `Markdown image exfiltration directive found: "${text.substring(0, 150)}"`,
        severity: "high",
      });
    }

    // Check Indirect RAG prompt injection directives
    for (const ragPat of INDIRECT_RAG_PATTERNS) {
      if (ragPat.test(text)) {
        findings.push({
          type: "indirect-rag-poison",
          selector: getSelector(el),
          text: `Indirect RAG poisoning instruction detected: "${text.substring(0, 150)}"`,
          severity: "high",
        });
        break;
      }
    }
  }

  // 2. Check <img> tags for exfiltration URLs
  const images = targetRoot.querySelectorAll("img[src]");
  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (SUSPICIOUS_IMG_SRC.test(src)) {
      findings.push({
        type: "markdown-image-exfiltration",
        selector: getSelector(img),
        text: `Suspicious tracking/exfiltration image source: "${src.substring(0, 100)}"`,
        severity: "high",
      });
    }
  }

  return findings;
}
