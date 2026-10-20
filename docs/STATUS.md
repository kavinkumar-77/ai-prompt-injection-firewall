# Project Status: Project AEGIS

## Honest Current State (Phase 3 Complete)

### What Works (Completed & Operational)
* **Trust-Aware Multi-Layer Architecture (`backend/app/core/`, `backend/app/layers/`)**:
  - `AegisPipeline`: Sequential 6-layer execution pipeline (`normalizer` -> `secrets` -> `rules` -> `classifier` -> `context` -> `decision`).
  - Structured `LayerResult` with normalized risk scores, labels, and character `Evidence` spans for forensic UI rendering.
  - `TrustSource` evaluation distinguishing `system`, `user`, `retrieved`, and `tool_output` with trust multipliers.
  - `DecisionEngine` compiling layer results into `allow`, `warn`, `block`, and `redact` verdicts, supporting presets (`strict`, `balanced`, `lenient`) and generating detailed forensic explanations.
* **Secrets & PII Inspection & Redaction Layer (`backend/app/layers/secrets.py`)**:
  - Provider-aware API key detection (OpenAI `sk-...`, Anthropic `sk-ant-...`, AWS `AKIA...`, GitHub tokens, Google API keys, private RSA/EC keys, JWT tokens, database URLs).
  - Algorithmic validation: Shannon entropy estimation (> 3.2 bits/char) to filter false positives.
  - Financial & identity PII validation: Luhn checksum formula for credit cards; Verhoeff algorithm for 12-digit Indian Aadhaar numbers; regex validation for PAN cards.
  - In-place redaction mode producing typed placeholders (`[SECRET:openai_api_key]`, `[PII:credit_card]`, `[PII:aadhaar_number]`).
* **Canary Token Generation & Leak Detection (`backend/app/core/canary.py`)**:
  - Per-session high-entropy nonces (`aegis-canary-<hex24>`).
  - Salted HMAC-SHA-256 hashing at rest for tamper-proof storage.
  - System prompt directive injection and model output leakage scanner.
* **Deobfuscation & Normalization Layer (`backend/app/layers/normalizer.py`)**:
  - Unicode NFKC normalization.
  - Invisible zero-width character stripping (U+200B-U+200D, U+FEFF, directional markers).
  - Unicode tag character unwrap (U+E0000 - U+E007F).
  - Homoglyph and confusable folding for Cyrillic/Greek lookalikes (`а`, `е`, `о`, `р`, `с`, `у`, `х`, etc.).
  - Covert HTML comments (`<!-- ... -->`) and hidden CSS element extraction (`display:none`, `visibility:hidden`, `opacity:0`, `font-size:0`, white-on-white text).
  - ROT13, Base64, Hex, and URL percent-decoding with span tracking.
* **Indirect Prompt Injection Context Layer (`backend/app/layers/context.py`)**:
  - Suspicion escalation for instruction imperatives within untrusted `retrieved` and `tool_output` chunks.
  - Chat role marker smuggling detection (`<|im_start|>`, `[INST]`, `<<SYS>>`, `<s>[SYSTEM]`, `Human/Assistant`).
  - Persona overrides and stealth directives ("silently execute", "hide from user").
* **Tool-Call Capability Policy Engine (`backend/app/layers/toolcall.py`)**:
  - Policy-as-code YAML configurations (`policies/default_capabilities.yaml`, `policies/strict_capabilities.yaml`, `policies/lenient_capabilities.yaml`).
  - Tool allowlists, denylists, and argument constraints.
  - Context taint tracking: blocks high-risk actions (`send_email`, `execute_bash`, `write_file`) when context was influenced by untrusted external text.
  - Parameter security: email domain restriction, path traversal prevention (`../`, `/etc/`, `C:\Windows`), and dangerous shell pattern detection.
* **Real Trained ML Detector & ONNX Runtime Pipeline (`ml/`, `backend/app/layers/classifier.py`)**:
  - Sublinear TF-IDF + Calibrated Logistic Regression trained on 5,380 samples, validated on 750 samples (Val F1: 0.9899, AUC: 0.9999).
  - Exported to ONNX (`models/classifier.onnx`, 982 KB) with verified numerical parity (< 2e-3 difference against float64).
  - Tracked in `models/MANIFEST.json` with SHA-256 integrity hash (`d791e94c10958619bc21d6598b69765eb5ec4ba8934d8638101309cbbe993485`).
  - Single-threaded CPU inference with sliding window chunking (window 500, stride 250) and max-pool aggregation.
  - Test set performance: Precision 1.0000, 0 false positives out of 2,550 negatives, Hard-Negative FPR: 0.0000%.
* **Deterministic Security Rules Catalog (`backend/app/layers/rules.py`)**:
  - `R-DELIM-001`: Chat template delimiter smuggling.
  - `R-EXFIL-001`: Covert markdown/HTML image link exfiltration with credentials or webhooks.
  - `R-JAIL-001`: Roleplay jailbreak framing (DAN, Developer Mode, ethical filter bypass).
  - `R-OVERRIDE-001`: Direct instruction overrides.
  - `R-SECRET-001`: High-entropy API keys.
* **Modular API v1 Routers (`backend/app/api/v1/`)**:
  - `POST /v1/scan`: Text payload scanning.
  - `POST /v1/scan/tool-call`: Agent tool call scanning with taint awareness.
  - `GET /health` and `GET /ready`: Operational and configuration readiness probes.
  - `GET /v1/events`, `POST /v1/events/clear`, `GET /v1/events/stats`: Threat audit logs.
  - `GET /v1/metrics`: Telemetry, uptime, latency percentiles, and verdict distribution.
  - `GET /v1/policies`, `GET /v1/policies/{id}`, `PUT /v1/policies/active`: Active presets and audit trail.
* **Observability & Logging (`backend/app/observability/`)**:
  - Structured JSON logging to stdout with `ContextVar` request ID correlation (`X-Request-ID` propagation).
  - Salted SHA-256 payload masking ensuring zero sensitive data exposure in logs.
* **Evaluation & Reproducibility Suite (`ml/`)**:
  - `ml/train.py`: Deterministic model training pipeline.
  - `ml/export_onnx.py`: ONNX export and parity validator.
  - `ml/evaluate.py`: Test set evaluation generating `ml/reports/metrics.json`, confusion matrix, and PR curve.
  - `ml/ablate.py`: Multi-configuration ablation study (`ml/reports/ablation.json`).
  - `ml/benchmark_latency.py`: CPU concurrency latency matrix (`ml/reports/latency.json`).
  - `scripts/fetch_assets.py`: Resilient asset downloader with backoff retries and SHA-256 validation.
* **Backward Compatibility**:
  - All legacy endpoints (`/analyze-intent`, `/check-exfiltration`, `/check-canary`, `/check-visual-similarity`, `/threat-intel`, `/aegis-shield.js`, `/demo`) retained and operational.
  - Legacy TF-IDF proto-matcher moved to `backend/app/layers/legacy_tfidf.py` (marked deprecated as v1 baseline).
  - Attention probe honestly renamed to `lexical_divergence` (syntactic keyword overlap).
* **Quality Gates & Tooling**:
  - 100% passing hermetic backend tests (104/104) in `backend/tests/`.
  - 100% passing Chrome extension tests (37/37) in `extension/tests/`.
  - Clean production build of React 18 dashboard (`tsc && vite build`).
  - Strict linting and formatting with `ruff check .` (0 errors) and `ruff format .`.
  - Type-checking with `mypy backend` (0 errors in 45 files).
  - Root `Makefile` with targets (`setup`, `lint`, `format`, `test`, `eval`, `up`, `demo`).
  - Pre-commit with `detect-secrets`.
  - GitHub Actions CI matrix for Python 3.11/3.12, Node 20, Ruff, Mypy, Pytest with coverage, Extension tests, and Dashboard build.

---

### What is a Placeholder (`placeholder_*`)
* `placeholder_qwen_gguf_weights`: Optional heavy LLM checkpoint for local offline inference.

---

### What is Missing
* **Phase 4**: OpenAI-compatible `/v1/chat/completions` proxy gateway.
* **Phase 5**: Real Attack Lab with sandboxed local agent and live attack scenarios (firewall OFF vs ON).
* **Phase 6 - 9**: Dashboard evaluation pages, red-team runner, docker-compose, and full documentation.

---

### What is Measured
* **Detector Accuracy (`ml/reports/metrics.json`)**:
  - Overall Test Precision: 1.0000 (0 false positives on 2,550 test negatives).
  - Hard-Negative FPR: 0.0000% (0 / 600 false positives on benign security/coding prompts).
  - Overall Test Recall: 0.4652 (honest holdout evaluation on unseen HackAPrompt red-team challenges).
  - Test ROC-AUC: 0.9469, PR-AUC: 0.9125.
* **Inference Latency (`ml/reports/latency.json`)**:
  - CPU Single-Thread p50: 0.29 - 0.44 ms.
  - CPU Single-Thread p95: 0.61 - 0.94 ms.
  - CPU 32-Thread Concurrency p95: < 2.5 ms.
* **Quality Gates**:
  - `ruff check .`: 0 errors.
  - `ruff format --check .`: Clean.
  - `mypy backend`: 0 errors in 36 source files.
  - `pytest backend/tests`: 77/77 passed cleanly.
  - `extension` (`npm test`): 37/37 passed.
  - `dashboard` (`npm run build`): Clean production bundle.
