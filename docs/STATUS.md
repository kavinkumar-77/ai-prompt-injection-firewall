# Project Status: Project AEGIS

## Honest Current State (Phase 2 Complete)

### What Works (Completed & Operational)
* **Real Trained ML Detector & ONNX Runtime Pipeline (`ml/`, `backend/app/layers/classifier.py`)**:
  - Sublinear TF-IDF + Calibrated Logistic Regression trained on 5,380 samples, validated on 750 samples (Val F1: 0.9899, AUC: 0.9999).
  - Exported to ONNX (`models/classifier.onnx`, 982 KB) with verified numerical parity (< 2e-3 difference against float64).
  - Tracked in `models/MANIFEST.json` with SHA-256 integrity hash (`d791e94c10958619bc21d6598b69765eb5ec4ba8934d8638101309cbbe993485`).
  - Single-threaded CPU inference with sliding window chunking (window 500, stride 250) and max-pool aggregation.
  - Test set performance: Precision 1.0000, 0 false positives out of 2,550 negatives, Hard-Negative FPR: 0.0000%.
* **Modular Pipeline Architecture (`backend/app/core/`)**:
  - `AegisPipeline`: Sequential multi-layer execution pipeline (`normalizer` -> `rules` -> `classifier` -> `context` -> `decision`).
  - Structured `LayerResult` with normalized risk scores, labels, and character `Evidence` spans for forensic UI rendering.
  - `TrustSource` evaluation distinguishing `system`, `user`, `retrieved`, and `tool_output` with trust multipliers.
  - `DecisionEngine` compiling layer results into `allow`, `warn`, `block`, and `redact` verdicts.
* **Deterministic Security Rules Catalog (`backend/app/layers/rules.py`)**:
  - `R-DELIM-001`: Chat template delimiter smuggling (`<|im_start|>`, `[INST]`, `<<SYS>>`, `Human/Assistant`).
  - `R-EXFIL-001`: Covert markdown/HTML image link exfiltration with credentials or webhooks.
  - `R-JAIL-001`: Roleplay jailbreak framing (DAN, Developer Mode, ethical filter bypass).
  - `R-OVERRIDE-001`: Direct instruction overrides (`ignore previous instructions`, `system override:`).
  - `R-SECRET-001`: High-entropy API keys (OpenAI `sk-...`, Anthropic `sk-ant-...`, AWS `AKIA...`, RSA private keys, JWT tokens).
* **Text Normalization & Deobfuscation Layer (`backend/app/layers/normalizer.py`)**:
  - Unicode NFKC normalization.
  - Zero-width character stripping (U+200B-U+200D, U+FEFF, directional markers).
  - Unicode tag character unwrap (U+E0000 - U+E007F).
  - Base64, Hex, and URL percent-decoding with span tracking.
* **Tool-Call Policy Engine (`backend/app/layers/toolcall.py`)**:
  - Agent tool invocation validation intercepting dangerous shell commands (`rm -rf`, `curl | bash`, SQL drop) and forbidden tools.
* **Modular API v1 Routers (`backend/app/api/v1/`)**:
  - `POST /v1/scan`: Text payload scanning.
  - `POST /v1/scan/tool-call`: Agent tool call scanning.
  - `GET /health` and `GET /ready`: Operational and configuration readiness probes.
  - `GET /v1/events`, `POST /v1/events/clear`, `GET /v1/events/stats`: Threat audit logs.
  - `GET /v1/metrics`: Telemetry, uptime, latency percentiles, and verdict distribution.
  - `GET /v1/policies`: Active security policies and gating thresholds.
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
  - 100% passing hermetic backend tests (77/77) in `backend/tests/`.
  - 100% passing Chrome extension tests (37/37) in `extension/tests/`.
  - Clean production build of React 18 dashboard (`tsc && vite build`).
  - Strict linting and formatting with `ruff check .` (0 errors) and `ruff format .`.
  - Type-checking with `mypy backend` (0 errors).
  - Root `Makefile` with targets (`setup`, `lint`, `format`, `test`, `eval`, `up`, `demo`).
  - Pre-commit with `detect-secrets`.
  - GitHub Actions CI matrix for Python 3.11/3.12, Node 20, Ruff, Mypy, Pytest with coverage, Extension tests, and Dashboard build.

---

### What is a Placeholder (`placeholder_*`)
* `placeholder_qwen_gguf_weights`: Optional heavy LLM checkpoint for local offline inference.

---

### What is Missing
* **Phase 3**: Capability policy YAML schema and fine-grained context trust calibration.
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
