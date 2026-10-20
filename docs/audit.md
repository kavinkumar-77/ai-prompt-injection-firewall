# Project AEGIS — System Audit & Technical Debt Register

**Audit Date:** October 2026  
**Auditor:** AEGIS Engineering Team  
**Scope:** Architecture, Detection Engines, Evaluation, and Codebase Integrity

---

## 1. Executive Summary

Project AEGIS is designed as a local-first security gateway protecting LLM applications from prompt injection, credential leaks, and agent tool abuse. While the architectural intent and client-side integration patterns are strong, several core capabilities currently rely on hand-crafted heuristics and simulations rather than trained models or live LLM interactions.

This audit provides a blunt, unvarnished accounting of what actually works, what is heuristic, what is simulated, and what must be refactored in the Production-Grade Upgrade.

---

## 2. Component-by-Component Audit

### 2.1 Backend Detection Engine (`backend/app/`)

| File / Component | Current Implementation | Truth / Limitations | Classification | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **TF-IDF Prototype Matcher** (`ai_engine.py`) | Scikit-learn `TfidfVectorizer` fitted on ~15 hardcoded attack sentences and 5 hard negatives. | Not a real ML classifier. Extremely fragile to paraphrasing, synonyms, and out-of-vocabulary words. Cannot generalize. | **Heuristic / Prototype Baseline** | Deprecate to `layers/legacy_tfidf.py` as baseline; train real ONNX transformer in Phase 2. |
| **Attention-Shift Divergence Probe** (`ai_engine.py`) | Set intersection between words and a 12-word set (`ignore`, `disregard`, `override`...) plus Jaccard-like overlap. | **Not model attention.** It is a lexical keyword overlap heuristic. Calling it an "attention probe" is inaccurate. | **Misnamed Lexical Heuristic** | Rename to `lexical_divergence`. Document honestly as a syntactic signal. |
| **Obfuscation Unwrapper** (`model_manager.py`) | Base64 regex chunk decoder, Hex decoder, zero-width char stripper, Unicode tag offset stripper. | Works for simple single-layer encodings. Does not handle nested encodings, token splitting, or markdown comment tricks. | **Deterministic Rule** | Refactor into `layers/normalizer.py` with span tracking. |
| **Regex Attack Signatures** (`model_manager.py`, `ai_engine.py`) | Python `re.compile` patterns for delimiters (`<\|im_start\|>`), markdown images (`![...](...)`), roleplay keywords (`DAN`). | Fast and deterministic (< 1ms). High precision on known delimiters, zero coverage on novel semantic attacks. | **Rule Layer** | Formalize into `layers/rules.py` with Rule IDs (`R-DELIM-001`, etc.) and positive/negative test cases. |
| **Unprotected Simulation** (`model_manager.py`) | Dictionary of hardcoded strings representing "what an unprotected model would output". | Fake simulation. It does not execute against an LLM. Evaluators can easily inspect code and see hardcoded text. | **Hardcoded Simulation** | Remove hardcoded strings. In Phase 5, run a real sandboxed LLM agent (Ollama) with firewall OFF vs ON. |
| **Perceptual Blockhash Matcher** (`model_manager.py`) | 32-hex bitwise Hamming distance against 3 brand hashes (Google, Microsoft, PayPal). | Works for pre-computed blockhashes, but visual phishing is secondary to prompt injection and data leaks. | **Auxiliary Module** | Move to `modules/phishing/` as an optional module to narrow core gateway focus. |
| **Canary Token Scrubber** (`main.py`) | Checks response text for `CANARY_TOKEN:...` and replaces with `[REDACTED_SYSTEM_INSTRUCTION]`. | Effective deterministic string matching. Needs salted hashing at rest and session-level tracking. | **Operational Feature** | Keep and integrate into gateway response path. |
| **Data Exfiltration Policy** (`main.py`) | Domain check against an allowlist and a list of 7 suspicious substrings (`evil-collector.xyz`). | Trivial to bypass with unlisted domains or IP addresses. Needs formal CIDR/domain policy-as-code. | **Basic Heuristic** | Upgrade to structured YAML capability policy in Phase 3. |

### 2.2 Client-Side & Demos (`demo/`, `extension/`)

| File / Component | Current Implementation | Truth / Limitations | Classification | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **DocuMind AI Demo** (`demo/documind/`) | Web app using `setTimeout(..., 1500)` to render 3 hardcoded bullet points and append a 1px image. | Completely scripted toy demo. No actual LLM inference occurs. | **Scripted Mockup** | Replace with Phase 5 Attack Lab (real local agent with real sandboxed tools). |
| **Attack Simulator** (`demo/attack-simulator.html`) | HTML page with 6 buttons calling backend API endpoints via `fetch()`. | Useful for basic API sanity testing, but merely displays raw JSON responses. | **Test Harness** | Incorporate scenarios into Phase 5 & Phase 7 red-team runner. |
| **Standalone Web SDK** (`demo/aegis-shield.js`) | Drop-in JS script monkey-patching `fetch` and inputs for PII masking. | Functional for browser DOM inputs. Good zero-extension client option. | **Functional Utility** | Package cleanly alongside `aegis_client/` SDK. |
| **Chrome Extension** (`extension/`) | MV3 content script, background worker, popup UI. 37 Vitest tests passing. | Working client extension, but broad scope distracts from the core gateway story. | **Working Client** | Keep extension; scope gateway as the primary integration surface. |

### 2.3 ML Pipeline & Datasets (`ml/`)

| File / Component | Current Implementation | Truth / Limitations | Classification | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Data Ingestion** (`ml/data/sources.py`) | Ingestion logic for BIPIA, deepset, jackhhao, and OASST1. | Good schema and paired-group splitting logic. However, no model has been trained or evaluated yet. | **Infrastructure Ready** | Use as basis for Phase 2 dataset build (`ml/data/build_dataset.py`). |
| **Manifest** (`data/raw/MANIFEST.json`) | SHA-256 hashes for raw fixtures. | Adheres to integrity rules (no unmanifested real datasets). | **Compliant** | Expand with asset fetcher (`scripts/fetch_assets.py`). |
| **Trained Classifier** | None (`placeholder_qwen_gguf_weights`). | The repo currently does not ship a real trained classifier. | **Missing Artifact** | Train DeBERTa / MiniLM, export quantized ONNX int8 model in Phase 2. |

---

## 3. Dead Code and Technical Debt

1. **Hardcoded Machine Paths in Docs/README:** References to local paths like `c:/finalYearProject` exist in README or comments. Must use relative paths.
2. **Hardcoded Test Badges:** Badges in README claiming "72 passing" without CI tracking. Must be replaced with real GitHub Actions status badges.
3. **Redundant Sandbox Inspector:** Legacy `SandboxInspector.tsx` is superseded by `LiveAttackStudio.tsx` and should be cleanly archived or integrated.
4. **Monolithic API Structure:** `backend/app/main.py` contains all route definitions, static mounts, and middleware in a single 350-line file. Must be refactored into modular `api/v1/` routers.

---

## 4. Remediation Roadmap

- **Phase 1:** Refactor backend to clean modular layout (`api/v1/`, `core/`, `layers/`), introduce `LayerResult`/`Evidence` pipeline abstractions, rename attention probe to `lexical_divergence`, and establish hermetic CI.
- **Phase 2:** Build unified dataset, train transformer classifier within 6 GB VRAM budget, export to quantized ONNX int8, and commit verified `metrics.json`.
- **Phase 3:** Introduce trust-aware context layers (`system`, `user`, `retrieved`, `tool_output`) and policy-driven tool-call checking.
- **Phase 4:** Deploy OpenAI-compatible `/v1/chat/completions` proxy gateway.
- **Phase 5:** Build real Attack Lab with sandboxed Python tools and measurable Attack Success Rate (ASR) with firewall OFF vs ON.
