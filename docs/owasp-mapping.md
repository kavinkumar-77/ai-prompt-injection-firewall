# OWASP Top 10 for LLM Applications (2025) Compliance Matrix

This document maps the **OWASP Top 10 for Large Language Model Applications (2025)** risks against Project AEGIS defensive layers and test suites.

| OWASP Identifier | Vulnerability Name | Risk Severity | Primary Mitigation Layer in AEGIS | Automated Test Coverage |
| :--- | :--- | :---: | :--- | :--- |
| **LLM01:2025** | **Prompt Injection** | **CRITICAL** | `RulesLayer` (`R-OVERRIDE-001`, `R-DELIM-001`), `NormalizerLayer` (homoglyph/base64 deobfuscation), `ClassifierLayer` (ONNX detector), `ContextLayer` (trust source multipliers) | `test_ai_engine.py`, `test_classifier.py`, `test_context_trust.py`, `test_redteam.py` |
| **LLM02:2025** | **Sensitive Information Disclosure** | **CRITICAL** | `SecretsLayer` (entropy analysis, Luhn/Verhoeff validators, in-place typed redaction), `RulesLayer` (`R-EXFIL-001` image leak detection) | `test_secrets_pii.py`, `test_rules.py` |
| **LLM03:2025** | **Supply Chain Vulnerabilities** | **HIGH** | Hermetic asset fetching (`scripts/fetch_assets.py`) with SHA-256 manifest integrity pinning; automated Dependabot alerts and `pip-audit` scans | `ci.yml`, `dependabot.yml` |
| **LLM04:2025** | **Data and Model Poisoning** | **MEDIUM** | Strict dataset provenance enforcement in `data/raw/MANIFEST.json`; training pipeline rejects unmanifested samples | `ml/data/build_dataset.py`, `models/MANIFEST.json` |
| **LLM05:2025** | **Improper Output Handling** | **HIGH** | Post-flight response streaming scanner in `streaming.py` intercepting canary token leakage and covert exfiltration links mid-flight | `test_gateway.py`, `test_canary.py` |
| **LLM06:2025** | **Excessive Agency** | **CRITICAL** | `ToolCallLayer` capability policy engine enforcing tool allowlists, email recipient restrictions, and context taint tracking | `test_toolcall_policies.py`, `test_lab.py` |
| **LLM07:2025** | **System Prompt Leakage** | **HIGH** | `CanaryLayer` generating session nonces (`aegis-canary-<hex24>`) injected into system directives; response scanner catches leaks | `test_canary.py`, `test_gateway.py` |
| **LLM08:2025** | **Vector and Embedding Weaknesses** | **MEDIUM** | `ContextLayer` assigning untrusted status to retrieved RAG vector store chunks, applying a $1.35\times$ risk multiplier | `test_context_trust.py` |
| **LLM09:2025** | **Misinformation & Hallucination** | **LOW** | Out-of-scope for gateway inspection; mitigated through upstream model selection and RAG grounding validation | Documented in `docs/threat-model.md` |
| **LLM10:2025** | **Unbounded Consumption** | **HIGH** | `RequestSizeLimitMiddleware` (5 MB cap), `ClassifierLayer` sliding window cap (12 chunks), ReDoS-audited regexes, and token bucket rate limiter | `test_redos.py`, `test_v1_api.py` |

---

## Detailed Layer Mitigations

### 1. LLM01: Prompt Injection (Direct & Indirect)
- **Normalizer:** Strips zero-width steganography (U+200B-U+200D), unescapes Unicode tags (U+E0000-U+E007F), folds Cyrillic/Greek homoglyphs, and unpacks hidden HTML comments and CSS `display:none` payloads.
- **Rules:** Identifies chat template delimiters (`<|im_start|>`, `[INST]`, `<<SYS>>`, `<s>[SYSTEM]`, `Human:... Assistant:...`).
- **ML Classifier:** Scans payloads with sublinear TF-IDF and calibrated logistic regression, outputting continuous risk scores ($0.0 \le p \le 1.0$).
- **Context Multipliers:** Multiplies suspicion scores by $1.35\times$ for `retrieved` chunks and $1.45\times$ for `tool_output` containing imperative instructions.

### 2. LLM02: Sensitive Information Disclosure
- **API Keys & Credentials:** Detects provider-specific token formats (OpenAI `sk-...`, Anthropic `sk-ant-...`, AWS `AKIA...`, GitHub tokens, Google API keys, RSA private keys, JWTs, DB URLs).
- **Algorithmic Validation:** Computes Shannon entropy ($> 3.2\text{ bits/char}$) to eliminate random false positives.
- **PII Validation:** Validates credit card numbers using Luhn checksum; validates 12-digit Indian Aadhaar numbers using the Verhoeff algorithm.
- **Typed In-Place Redaction:** Replaces matched secrets with `[SECRET:openai_api_key]`, `[PII:credit_card]`, or `[PII:aadhaar_number]`.

### 3. LLM06: Excessive Agency
- **Capability Policy:** YAML policies define tool allowlists, parameter constraints, and path traversal guards.
- **Taint Tracking:** If an agent's context window contains untrusted data from retrieved documents or web scraping, high-risk tools (`send_email`, `execute_bash`, `write_file`) are blocked unconditionally.
