# AI Defense Gateway: System Architecture

## 1. Overview
The **AI Defense Gateway** is a modular, multi-layer proxy that sits between clients (users, autonomous agents) and LLM inference endpoints. It eliminates prompt injection vulnerabilities by verifying input semantics, probing internal model activations, enforcing capability policies, and containing untrusted execution flows.

---

## 2. Component Architecture

```text
+-----------------------------------------------------------------------------------+
|                              INGESTION & EXTRACTION                               |
|   +-------------------+   +--------------------+   +--------------------------+   |
|   | HTML Extractor    |   | PDF/DOCX Extractor |   | Image OCR / Vision Prep  |   |
|   +-------------------+   +--------------------+   +--------------------------+   |
|                     \               |               /                             |
|                      v              v              v                              |
|                         Normalized Text Chunks + Provenance                       |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                        AI DEFENSE GATEWAY (FastAPI / PyTorch)                      |
|                                                                                   |
|  [FAST PATH]                                                                      |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 1: Semantic Classifier (DeBERTa-v3-small / ModernBERT, ~100-150M params)  |
|  | -> Inference latency: < 15ms | Checks: Adversarial patterns, hard negatives |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                              \ (If flagged High Risk)   |
|         v (If Ambiguous / High Trust Risk)              v                         |
|  [DEEP PATH]                                         [BLOCK / SANITIZE]           |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 2: Model-Internal Signals (1.5B LLM, FP16)                             |  |
|  | -> Probes: Attention shifts on instruction tokens, activation deltas        |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                                                         |
|         v                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 4: Architectural Containment & Taint Engine                           |  |
|  | -> Tracks untrusted data provenance; enforces Quarantined-LLM boundaries   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                            TARGET LLM EXECUTION                                   |
|   Target Model receives sanitized prompt and generates response / tool calls      |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                         INTENT & POLICY VERIFICATION                              |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 3: Intent/Task Alignment Checker                                       |  |
|  | -> Compares proposed tool calls (e.g. MCP actions) against original goal    |  |
|  +-----------------------------------------------------------------------------+  |
|  +-----------------------------------------------------------------------------+  |
|  | Policy Engine: Capability Matrix (Permit / Confirm / Deny)                   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
                               Action Executed / Blocked
```

---

## 3. How the Layers Combine

To deliver high detection accuracy without incurring severe latency on every request, the gateway operates a **cascaded decision pipeline**:

1. **Fast-Path Screening (Layer 1)**:
   - Every input chunk passes through the fine-tuned DeBERTa/ModernBERT classifier.
   - If confidence is decisively benign ($score < 0.20$), it passes immediately.
   - If confidence is decisively malicious ($score > 0.85$), the chunk is blocked or scrubbed with an audit event emitted.

2. **Deep-Path Activation Probing (Layer 2)**:
   - If Layer 1 returns borderline uncertainty ($0.20 \le score \le 0.85$) or if the text originates from high-risk untrusted sources (unverified web RAG chunks), Layer 2 is engaged.
   - A local 1–2B model runs forward-pass inference in FP16 to measure attention concentration shifts away from the system task toward the untrusted segment.

3. **Taint Tracking & Containment (Layer 4)**:
   - When untrusted data enters the context, the session is marked as **tainted**.
   - Tainted sessions cannot execute high-impact capabilities (writing to disk, outbound HTTP requests, invoking terminal commands) without explicit human confirmation.

4. **Action & Tool Alignment (Layer 3)**:
   - When the target model proposes a tool invocation (e.g. via MCP), the action checker calculates semantic alignment against the original user prompt. Any divergence triggers an immediate block.

5. **Adaptive Red-Team Loop (Layer 5 - Offline)**:
   - An offline local 4-bit quantized attacker LLM attempts automated evasion against Layer 1. Successful bypasses are added to the training set for iterative model retraining.

---

## 4. Hardware Budget & Resource Allocation (Laptop Constraints)

| Component | Target Architecture | Parameter Count | Precision | VRAM Footprint |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Semantic Classifier** | DeBERTa-v3-small / ModernBERT | 100M–149M | FP16 / INT8 | $\approx$ 300 MB |
| **Layer 2: Probing Model** | Qwen2.5-1.5B / SmolLM2-1.7B | 1.5B–1.7B | FP16 | $\approx$ 3.5 GB |
| **Layer 3: Alignment Checker** | Embeddings / Light cross-encoder | $\le$ 100M | FP16 | $\approx$ 250 MB |
| **Layer 5: Attacker Generator (Offline)** | Quantized 1–2B LLM | 1.5B | INT4 | $\approx$ 1.5 GB |
| **Total Concurrently Active** | **Layers 1, 2, 3, 4** | — | — | **$\le$ 4.2 GB VRAM (Fits in 6 GB RTX 4050)** |

> **VRAM Scheduling Invariant**: Layer 2 (FP16 Prober) and Layer 5 (INT4 Attacker) are **never** loaded in GPU memory concurrently. Layer 5 runs offline during model development and red-teaming cycles.
