# Project AEGIS — OWASP Top 10 for LLM Applications Mapping

This document details how Project AEGIS aligns with the **OWASP Top 10 for Large Language Model Applications (2025)**.

---

| OWASP Vulnerability | Severity | AEGIS Defense Component | Technical Mechanism |
| :--- | :--- | :--- | :--- |
| **LLM01: Prompt Injection** | **Critical** | `NormalizerLayer`<br>`RulesLayer`<br>`ContextLayer`<br>`ClassifierLayer` | Multi-scheme decoding (Base64/Hex/Tags), delimiter blocking (`R-DELIM-001`), direct override signatures (`R-OVERRIDE-001`), trust level multiplier on retrieved/tool data, and semantic classification. |
| **LLM02: Sensitive Information Disclosure** | **High** | `RulesLayer`<br>`CanaryFilter`<br>`PIIRedactor` | Regular expressions for API keys and JWTs (`R-SECRET-001`), markdown exfiltration link suppression (`R-EXFIL-001`), client-side PII redactor, and canary token output scrubbing. |
| **LLM03: Supply Chain Vulnerabilities** | **Medium** | Asset Fetcher & Manifest | SHA-256 integrity verification (`data/raw/MANIFEST.json`, `models/MANIFEST.json`), no unverified external dependencies during test runs. |
| **LLM04: Data and Model Poisoning** | **High** | Dataset Cleaner & Splitter | Paired-group co-location (`group_id`), exact & near-duplicate MinHash deduplication, strict train/val/test/holdout split isolation in ML pipeline. |
| **LLM05: Improper Output Handling** | **Medium** | Outbound Interceptor<br>`aegis-shield.js` | Suppression of rendered HTML/markdown image tags containing query parameters; client-side output sanitization. |
| **LLM06: Excessive Agency** | **Critical** | `ToolCallLayer` | Dynamic pre-execution inspection of agent tool invocations, blocking high-risk commands (`rm -rf`, `mkfs`, SQL drops) and disallowed system tools. |
| **LLM07: System Prompt Leakage** | **High** | `CanaryFilter`<br>`RulesLayer` | Dynamic canary token injection (`CANARY_TOKEN:...`), automated response inspection, and deterministic suppression of extracted prompts. |
| **LLM08: Vector and Embedding Weaknesses** | **Medium** | `ContextLayer` | Elevates suspicion for instruction-like text appearing in retrieved context chunks ($1.35\times$ risk multiplier). |
| **LLM09: Misinformation** | **Info** | *Out of Scope* | AEGIS is an adversarial security firewall, not a factual truth-checking system. |
| **LLM10: Unbounded Consumption** | **Low** | Rate Limiter & Token Scrubber | Enforces request length bounds and payload size gating. |
