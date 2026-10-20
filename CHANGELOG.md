# Changelog

All notable changes to Project AEGIS will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-20

### Added
- **OpenAI-Compatible Drop-In Gateway Router (`backend/app/api/v1/gateway.py`, `backend/app/gateway/`)**:
  - Implemented `POST /v1/chat/completions` supporting non-streaming and Server-Sent Events (SSE) streaming (`stream=true`).
  - Implemented `GET /v1/models` listing upstream available checkpoints.
  - Added pre-flight request inspection checking all conversation messages against the 6-layer AEGIS pipeline; returns OpenAI-shaped error payloads (`error.type = "aegis_policy_violation"`, `code = "prompt_injection_blocked"`) on block.
  - Added post-flight response inspection scanning assistant output for confidential canary leakage (`aegis-canary-...`), exposed API keys/credentials, and markdown image data exfiltration links.
  - Real-time streaming lookahead buffer (`backend/app/gateway/streaming.py`) terminating compromised token streams mid-flight with structured error chunks.
  - Upstream connector (`backend/app/gateway/upstream.py`) routing to local Ollama (`http://localhost:11434/v1`) with circuit breaker protection and offline hermetic fake mode.
- **Database & Privacy-Preserving Event Persistence (`backend/app/storage/`)**:
  - Added SQLAlchemy 2.0 schema (`SecurityEventModel`, `ApiKeyModel`) with SQLite default and PostgreSQL compatibility.
  - Salted SHA-256 text hashing guaranteeing zero raw user prompt text is logged or stored in the database.
  - `EventRepository` and `ApiKeyRepository` for event auditing and key management.
- **Security & Rate Limiting (`backend/app/security/`)**:
  - Added API key authentication (`X-API-Key` or `Authorization: Bearer <key>`) with SHA-256 key hashing at rest.
  - Implemented token bucket rate limiter (`ratelimit.py`) with HTTP 429 and `Retry-After` headers.
- **Integration Test Suite**:
  - Added hermetic gateway test suite `backend/tests/test_gateway.py` (109 total passing tests) covering benign completions, prompt injection blocking, SSE streaming, and canary leak prevention.

## [0.3.0] - 2026-10-20

### Added
- **Secrets & PII Detection and In-Place Redaction Layer (`backend/app/layers/secrets.py`)**:
  - Implemented provider-aware patterns for OpenAI, Anthropic, AWS, GitHub, Google, JWT, private keys, and database connection strings.
  - Added Shannon entropy estimation (> 3.2 bits/char) to eliminate false positives on short strings.
  - Algorithmic validation: Luhn checksum validator for credit card numbers and Verhoeff algorithm validator for 12-digit Indian Aadhaar numbers.
  - Safe redaction mode substituting sensitive fragments with typed placeholders (`[SECRET:openai_api_key]`, `[PII:credit_card]`, `[PII:aadhaar_number]`).
- **Canary Token Generation & Output Leakage Detection (`backend/app/core/canary.py`)**:
  - Per-session high-entropy nonces (`aegis-canary-<hex24>`).
  - Salted HMAC-SHA-256 digests stored at rest.
  - System prompt directive injection and model output leakage scanning with instant 1.0 risk escalation.
- **Enhanced Normalization and Deobfuscation (`backend/app/layers/normalizer.py`)**:
  - Homoglyph and confusable character translation (Cyrillic and Greek lookalikes `а`, `е`, `о`, `р`, `с`, etc.).
  - Covert HTML comment extraction (`<!-- ... -->`) and hidden CSS element extraction (`display:none`, `visibility:hidden`, `opacity:0`, `font-size:0`, white-on-white text) appended for downstream layer inspection.
  - ROT13 candidate decoding with injection keyword heuristics.
- **Context & Indirect Prompt Injection Layer (`backend/app/layers/context.py`)**:
  - Fine-grained trust boundaries separating `system`, `user`, `retrieved`, and `tool_output`.
  - Detection of instruction-in-data imperatives, role marker smuggling (`<|im_start|>`, `[INST]`, `<<SYS>>`), persona manipulation, and stealth directives.
- **Agent Capability Policy Engine (`backend/app/layers/toolcall.py`)**:
  - Policy-as-code YAML configurations (`policies/default_capabilities.yaml`, `policies/strict_capabilities.yaml`, `policies/lenient_capabilities.yaml`).
  - Tool allowlists, denylists, and recipient email domain enforcement.
  - Path traversal checks (`..`, `/etc/`, `C:\Windows`) on file arguments and shell command validation.
  - Context taint tracking blocking high-risk tools when external untrusted data has influenced conversation history.
- **Decision Engine & Policies API (`backend/app/core/decision.py`, `backend/app/api/v1/policies.py`)**:
  - Added policy presets (`strict`, `balanced`, `lenient`).
  - Multi-layer forensic explanation generation (`explanations: list[str]`).
  - Dynamic preset switching API (`PUT /v1/policies/active`) with in-memory audit history (`GET /v1/policies/audit/history`).
- **Test Suite**:
  - Added 27 new hermetic tests (104 total in `backend/tests/`) covering normalizer obfuscations, secrets/PII checksums, canary tokens, context trust, and tool-call capability policies.

## [0.2.0] - 2026-10-20

### Added
- **Machine Learning Detector & ONNX Pipeline (`ml/`, `backend/app/layers/classifier.py`)**:
  - Implemented `ml/train.py` training calibrated sublinear TF-IDF + Logistic Regression on 5,380 samples with 5-fold cross-validation (Val F1: 0.9899, ROC-AUC: 0.9999).
  - Implemented `ml/export_onnx.py` exporting trained pipeline to `models/classifier.onnx` (982 KB) with automated numerical parity checks (< 2e-3 absolute error tolerance).
  - Integrated `models/classifier.onnx` into `ClassifierLayer` with CPU single-thread execution, sliding window chunking (window: 500, stride: 250), max-pool aggregation, and graceful fallback.
  - Added unit test suite `backend/tests/test_classifier.py` verifying benign scoring, sliding windows, direct injection, and degraded fallback handling.
- **Evaluation, Ablation & Benchmark Suite (`ml/`)**:
  - `ml/evaluate.py`: Generates `ml/reports/metrics.json`, confusion matrix (`ml/reports/confusion_matrix.png`), and PR curves (`ml/reports/pr_curve.png`).
  - Achieved **1.0000 Precision** (0 false positives on 2,550 test negatives) and **0.0000% False Positive Rate on hard negatives** (0 / 600).
  - `ml/ablate.py`: Evaluated 4 progressive defense configurations (Rules Only, Rules + Legacy TF-IDF, Rules + Trained ML, Full Pipeline) into `ml/reports/ablation.json`.
  - `ml/benchmark_latency.py`: Benchmarked CPU latency across payload lengths (50, 500, 2000 chars) and concurrency levels (1, 8, 32 threads) into `ml/reports/latency.json` (p50: 0.29-0.44 ms, p95: < 2.5 ms under 32 threads).
- **Data Provenance & Asset Management**:
  - Added `scripts/fetch_assets.py` with exponential backoff retries, `AEGIS_ASSET_DIR` mirror support, and SHA-256 integrity verification.
  - Registered asset manifests in `data/raw/MANIFEST.json` and `models/MANIFEST.json`.
  - Authored `docs/datasets.md` documenting dataset provenance and splits.
  - Authored `docs/EVALUATION.md` documenting methodology, operating points, ablation findings, and error analysis.

## [0.1.0] - 2026-10-20

### Added
- **Core Pipeline Abstraction (`backend/app/core/`)**:
  - `AegisPipeline`: Multi-layer sequential execution pipeline (`normalizer` -> `rules` -> `classifier` -> `context` -> `decision`).
  - `LayerResult` with character `Evidence` spans for live forensic UI highlighting.
  - `TrustSource` evaluation supporting `system`, `user`, `retrieved`, and `tool_output` with trust multipliers.
  - `DecisionEngine` compiling multi-layer findings into `allow`, `warn`, `block`, and `redact` verdicts.
- **Deterministic Rules Catalog (`backend/app/layers/rules.py`)**:
  - `R-DELIM-001`: Chat template delimiter smuggling detection (`<|im_start|>`, `[INST]`, `<<SYS>>`).
  - `R-EXFIL-001`: Covert markdown and HTML image data exfiltration.
  - `R-JAIL-001`: Roleplay jailbreak framing (DAN, Developer Mode).
  - `R-OVERRIDE-001`: Direct instruction overrides.
  - `R-SECRET-001`: High-entropy API keys (OpenAI, Anthropic, AWS, RSA private keys, JWTs).
- **Text Normalizer Layer (`backend/app/layers/normalizer.py`)**:
  - Unicode NFKC normalization, zero-width steganography stripping, Unicode tag decoding, Base64/Hex/URL decoding with span tracking.
- **Agent Tool-Call Policy Engine (`backend/app/layers/toolcall.py`)**:
  - Validation of agent tool invocations against dangerous commands (`rm -rf`, `curl | bash`, SQL drops) and disallowed tools.
- **Modular API v1 Routers (`backend/app/api/v1/`)**:
  - `POST /v1/scan` (Text payload scanning).
  - `POST /v1/scan/tool-call` (Agent tool call safety scanning).
  - `GET /health` and `GET /ready` (Operational and readiness probes).
  - `GET /v1/events`, `POST /v1/events/clear`, `GET /v1/events/stats` (Threat audit logs).
  - `GET /v1/metrics` (Operational telemetry and latency metrics).
  - `GET /v1/policies` (Active security inspection policies).
- **Observability & Logging (`backend/app/observability/`)**:
  - Structured JSON logging to stdout with request ID context variable (`X-Request-ID`).
  - Salted SHA-256 payload masking ensuring zero raw sensitive data in logs.
- **Tooling & CI**:
  - Root `Makefile` with targets (`setup`, `lint`, `format`, `test`, `eval`, `up`, `demo`).
  - `.github/workflows/ci.yml` matrix workflow (Python 3.11/3.12, Node 20, Ruff, Mypy, Pytest with coverage, Extension tests, Dashboard build).
  - `pyproject.toml` mypy configuration and pre-commit `detect-secrets` hook.
  - 45 new hermetic unit tests in `backend/tests/` (73 total passing).

### Changed
- Refactored monolithic `backend/app/main.py` into modular v1 routers while maintaining 100% backward compatibility for all legacy endpoints (`/analyze-intent`, `/check-exfiltration`, `/check-canary`, `/check-visual-similarity`, `/threat-intel`, `/aegis-shield.js`, `/demo`).
- Moved legacy prototype matcher to `backend/app/layers/legacy_tfidf.py` (deprecated as v1 evaluation baseline).
- Renamed attention-shift probe to `lexical_divergence` and updated documentation honestly.
- Updated `README.md` to remove hardcoded machine paths, add CI badges, and document architecture accurately.
