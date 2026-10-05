#!/usr/bin/env bash
# setup_github.sh: Configure labels, milestones, and issues for AI Defense Gateway
set -euo pipefail

# Ensure GitHub CLI is available
if command -v gh >/dev/null 2>&1; then
  GH_CMD="gh"
elif [ -f "C:/Program Files/GitHub CLI/gh.exe" ]; then
  GH_CMD="C:/Program Files/GitHub CLI/gh.exe"
else
  echo "Error: gh CLI not found." >&2
  exit 1
fi

REPO="kavinkumar-77/ai-prompt-injection-firewall"
echo "Target repository: $REPO"

# ---------------------------------------------------------------------------
# 1. Create Labels
# ---------------------------------------------------------------------------
echo "Creating/Verifying labels..."
"$GH_CMD" label create research --repo "$REPO" --color "7057ff" --description "Research, modeling experiments, and probing" --force || true
"$GH_CMD" label create eval --repo "$REPO" --color "d4c5f9" --description "Evaluation benchmarks and metrics" --force || true
"$GH_CMD" label create data --repo "$REPO" --color "bfdadc" --description "Dataset curation, schema, and splits" --force || true
"$GH_CMD" label create security --repo "$REPO" --color "e11d48" --description "Security controls, threat modeling, and policies" --force || true

# ---------------------------------------------------------------------------
# 2. Create Milestones via GitHub API
# ---------------------------------------------------------------------------
echo "Creating milestones..."
"$GH_CMD" api "repos/$REPO/milestones" -f title="M1 Foundation and Baselines" -f description="Gateway skeleton, dataset curation & schema, evaluation harness & initial baselines" || true
"$GH_CMD" api "repos/$REPO/milestones" -f title="M2 Advanced Detection" -f description="Transformer fine-tuning, intent alignment, tool/RAG chunk scanners, architectural containment, basic events dashboard" || true
"$GH_CMD" api "repos/$REPO/milestones" -f title="M3 Research Layer" -f description="Model-internal probes (activations/attention), multi-turn & memory poisoning, image OCR injections, adaptive red-team loop" || true
"$GH_CMD" api "repos/$REPO/milestones" -f title="M4 Evaluation and Report" -f description="Full ablation studies, adaptive-attack evaluations, latency benchmarking, final project report, model card, polished dashboard, and demo" || true

# ---------------------------------------------------------------------------
# 3. Update Existing Issues (#1 to #4)
# ---------------------------------------------------------------------------
echo "Updating existing issues..."
"$GH_CMD" issue edit 1 --repo "$REPO" \
  --title "Content extractor: HTML/PDF/DOCX/image-OCR to text with trust labels" \
  --milestone "M1 Foundation and Baselines"

"$GH_CMD" issue edit 2 --repo "$REPO" \
  --milestone "M1 Foundation and Baselines"

"$GH_CMD" issue edit 3 --repo "$REPO" \
  --title "Gateway skeleton with pluggable detector interface" \
  --milestone "M1 Foundation and Baselines"

# Issue #4 moved to M2 as requested
"$GH_CMD" issue edit 4 --repo "$REPO" \
  --title "Basic events dashboard (dashboard)" \
  --milestone "M2 Advanced Detection"

# ---------------------------------------------------------------------------
# 4. Create New Issues
# ---------------------------------------------------------------------------
echo "Creating new issues..."

# --- M1 Foundation and Baselines ---
"$GH_CMD" issue create --repo "$REPO" \
  --title "Dataset v1: public datasets, schema, family-based splits, and hard negatives" \
  --label "data,security,research" \
  --milestone "M1 Foundation and Baselines" \
  --body "## Goal
Curate and standardize the foundational prompt injection dataset adhering to docs/DATA.md.

## Acceptance Criteria
- [ ] Implement JSONL schema with fields: id, text, label, attack_family, source, split, provenance.
- [ ] Aggregate public research datasets (BIPIA, JailbreakBench) and verify licenses.
- [ ] Synthesize technical and security hard negatives (words like ignore, override, command in benign contexts).
- [ ] Partition into strict train/val/test splits isolated by attack family and time.
- [ ] Verify zero personal data or live secrets exist in dataset files."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Evaluation harness and baseline models (TF-IDF, off-the-shelf, LLM judge)" \
  --label "eval,research" \
  --milestone "M1 Foundation and Baselines" \
  --body "## Goal
Implement the standardized evaluation harness and baseline benchmark models according to docs/EVALUATION.md.

## Acceptance Criteria
- [ ] Build automated evaluation runner calculating ASR (raw vs defended), utility under attack, FPR, and latency.
- [ ] Implement statistical TF-IDF + Logistic Regression baseline.
- [ ] Integrate lightweight open-source off-the-shelf detector baseline (Prompt-Guard).
- [ ] Implement zero-shot LLM judge baseline with local 1-2B model.
- [ ] Log baseline benchmark metrics with fixed random seeds."

# --- M2 Advanced Detection ---
"$GH_CMD" issue create --repo "$REPO" \
  --title "Fine-tune DeBERTa/ModernBERT detector with data augmentation" \
  --label "ml,research" \
  --milestone "M2 Advanced Detection" \
  --body "## Goal
Fine-tune a lightweight sequence classification transformer (DeBERTa-v3-small or ModernBERT-base <= 150M params) hardened with adversarial data augmentation.

## Acceptance Criteria
- [ ] Pipeline for augmentations: paraphrasing, translation, leetspeak/base64 encoding, chunk-splitting, role-play wrappers.
- [ ] Train classifier on RTX 4050 (FP16, small batches) with fixed random seed.
- [ ] Evaluate on validation split and verify FPR <= 1.0%.
- [ ] Export optimized weights and log experiment configuration under ml/experiments/."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Intent/task alignment checker for proposed agent actions" \
  --label "backend,security" \
  --milestone "M2 Advanced Detection" \
  --body "## Goal
Build the intent alignment verification engine for the POST /check-action gateway endpoint.

## Acceptance Criteria
- [ ] Compare proposed agent tool calls (name and arguments) against the original user prompt.
- [ ] Flag semantic divergence and destructive or high-privilege action attempts.
- [ ] Return structured response with allowed flag, risk level, and violation reason.
- [ ] Unit tests with mocked agent tool executions and intent mismatch fixtures."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Architectural containment: taint tracking, quarantined model, and policy engine" \
  --label "backend,security" \
  --milestone "M2 Advanced Detection" \
  --body "## Goal
Implement runtime architectural containment and capability policies in the gateway.

## Acceptance Criteria
- [ ] Track untrusted data provenance across request contexts (taint tracking).
- [ ] Restrict high-impact capabilities (outbound network, shell, file writes) when session is tainted.
- [ ] Implement Quarantined-LLM execution boundary for untrusted data summarization.
- [ ] Comprehensive unit tests verifying capability enforcement under taint conditions."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Tool/MCP description and RAG chunk security scanner" \
  --label "backend,security" \
  --milestone "M2 Advanced Detection" \
  --body "## Goal
Implement security scanning specifically tailored for external MCP tool descriptions and retrieved RAG context chunks.

## Acceptance Criteria
- [ ] Scan MCP server tool definitions and docstrings for embedded override instructions.
- [ ] Ingest multi-chunk RAG retrieval results and scan individual chunks before prompt assembly.
- [ ] Emit audit warnings and sanitize or quarantine flagged context chunks.
- [ ] Test fixtures with poisoned tool schemas and malicious RAG context passages."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Benchmark evaluation against AgentDojo, BIPIA, and InjecAgent" \
  --label "eval,research" \
  --milestone "M2 Advanced Detection" \
  --body "## Goal
Execute standardized evaluation of Layer 1 and Layer 2 defenses against established academic benchmarks.

## Acceptance Criteria
- [ ] Run benchmark evaluation on BIPIA, InjecAgent, and AgentDojo suites.
- [ ] Verify license compliance and availability for each benchmark suite.
- [ ] Compute ASR reduction and utility preservation metrics.
- [ ] Record results in docs/EVALUATION.md and log run metadata."

# --- M3 Research Layer ---
"$GH_CMD" issue create --repo "$REPO" \
  --title "Model-internal signals: hidden-state and attention-shift probes on 1-2B LLM" \
  --label "ml,research" \
  --milestone "M3 Research Layer" \
  --body "## Goal
Implement Layer 2 model-internal activation probes and attention-shift detectors on a local 1-2B LLM in FP16.

## Acceptance Criteria
- [ ] Run local 1-2B model (Qwen2.5-1.5B or SmolLM2-1.7B) in FP16 within 6 GB VRAM envelope.
- [ ] Extract attention weights to detect concentration shifts away from user instruction to untrusted text.
- [ ] Measure hidden-state residual stream activation deltas for task-drift classification.
- [ ] Combine internal signal score with Layer 1 semantic score in cascade pipeline."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Multi-turn and memory-poisoning detection" \
  --label "backend,research" \
  --milestone "M3 Research Layer" \
  --body "## Goal
Detect incremental prompt injections decomposed across multi-turn sessions or stored in agent long-term memory.

## Acceptance Criteria
- [ ] Analyze cumulative conversation context across turns for gradual adversarial escalation.
- [ ] Scan memory store entries before retrieval injection into active agent context.
- [ ] Maintain session risk accumulator that triggers defense when aggregate risk crosses threshold.
- [ ] Unit tests with multi-turn escalation attack scenarios."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Image and screenshot injection pipeline (OCR + vision)" \
  --label "backend,research" \
  --milestone "M3 Research Layer" \
  --body "## Goal
Build input extractor and scanner for adversarial instructions embedded in images, screenshots, and visual documents.

## Acceptance Criteria
- [ ] Integrate local OCR extractor to pull text and spatial coordinates from uploaded images.
- [ ] Forward extracted OCR text with image trust provenance to POST /analyze-content.
- [ ] Detect rendered text injections designed to exploit vision-language models.
- [ ] Test fixtures with synthetic screenshot injections and visual memes."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Adaptive red-team loop: automated adversarial evasion generator" \
  --label "ml,security,research" \
  --milestone "M3 Research Layer" \
  --body "## Goal
Implement the Layer 5 offline adaptive red-teaming loop with a local quantized attacker model.

## Acceptance Criteria
- [ ] Deploy local 1-2B attacker model using 4-bit quantization (INT4, ~1.5 GB VRAM).
- [ ] Enforce VRAM invariant: attacker model and FP16 probing model are never loaded simultaneously.
- [ ] Automatically generate evasion attempts against Layer 1 detector (mutations, obfuscations, framing).
- [ ] Harvest successful evasions, append to dataset v2, and trigger detector retraining."

# --- M4 Evaluation and Report ---
"$GH_CMD" issue create --repo "$REPO" \
  --title "Ablation and adaptive-attack evaluation plus latency benchmarks" \
  --label "eval,research" \
  --milestone "M4 Evaluation and Report" \
  --body "## Goal
Perform comprehensive ablation study and adaptive attacker evaluation across all system layers.

## Acceptance Criteria
- [ ] Measure ASR, utility, FPR, and latency across all configurations (C0 through C6).
- [ ] Measure iterations-to-bypass against the adaptive red-team loop.
- [ ] Benchmark latency on RTX 4050 (p50, p95, p99) under realistic token budgets.
- [ ] Compile comparative tables against baselines."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Polished monitoring dashboard for events, risk scores, and telemetry" \
  --label "dashboard,feature" \
  --milestone "M4 Evaluation and Report" \
  --body "## Goal
Refine the React + Tailwind monitoring interface into a presentation-ready security operations dashboard.

## Acceptance Criteria
- [ ] Visual telemetry for multi-layer detection breakdown (Layer 1 semantic vs Layer 2 internal signals).
- [ ] Interactive audit event inspector showing detected text snippets, trust provenance, and policy verdicts.
- [ ] Live metrics charts for ASR reduction, inspection latency, and taint status.
- [ ] Polished responsive UI with dark mode."

"$GH_CMD" issue create --repo "$REPO" \
  --title "Final report, model cards, and demo script" \
  --label "docs,research" \
  --milestone "M4 Evaluation and Report" \
  --body "## Goal
Produce the complete academic documentation package, model cards, and evaluation report for the final-year project.

## Acceptance Criteria
- [ ] Comprehensive final report document detailing methodology, architecture, and empirical findings.
- [ ] HuggingFace-style model card for fine-tuned DeBERTa/ModernBERT weights.
- [ ] Step-by-step reproducible demonstration script showcasing live attack interception.
- [ ] Archival and artifact documentation."

echo "All labels, milestones, and issues have been processed."
