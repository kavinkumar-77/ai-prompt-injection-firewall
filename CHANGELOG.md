# Changelog

All notable changes to Project AEGIS will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20

### Fixed
- **Hermetic CI & Test Parity**: Updated `test_classifier_sliding_window` and `test_redteam_in_process_execution` to gracefully verify fallback and degraded pipeline paths in CI environments where large ONNX binary weights are uncommitted (Rule 3/7 compliance). Registered `model` marker in `pyproject.toml`.
- **Dependabot & PR Hygiene**: Tuned `.github/dependabot.yml` with monthly schedules, PR limits, and semver-major ignores for breaking ecosystem packages. Closed obsolete pull requests (#21, #22) whose contributions were merged into `main` and dismissed unpinned Dependabot PRs (#23–#49).

### Added
- **Production Documentation & Technical Architecture Suite (`docs/`, `README.md`)**:
  - Completely rewritten `README.md` featuring problem statement, Mermaid architecture diagram, 30-second quickstart, empirical benchmark tables, and code snippets.
  - `docs/architecture.md`: Component descriptions, data flow, and Mermaid sequence diagrams for text scanning, SSE streaming, and tool-call capability guards.
  - `docs/threat-model.md`: STRIDE threat model, adversary capability profiles, trust boundaries, and residual risk assessment.
  - `docs/api.md`: Comprehensive OpenAPI v1 reference with schemas and runnable cURL / Python examples for all endpoints.
  - `docs/evaluation.md`: Empirical benchmark report compiling holdout classifier metrics (1.0000 precision, 0/2,550 FPR), confusion matrix, operating points, Attack Lab results, and red-team benchmark metrics.
  - `docs/owasp-mapping.md`: Comprehensive compliance matrix mapping OWASP Top 10 for LLMs (2025) against AEGIS defense layers and automated test suites.
  - `docs/limitations.md`: Transparent forensic review of the 27 red-team false negatives, language boundaries, and streaming lookahead trade-offs.
  - `docs/faq.md`: Frequently asked questions addressing local-first execution, trust levels, zero-data storage guarantees, and latency.
  - `docs/demo-script.md`: 3-minute structured presentation walkthrough script with timecodes and expected UI states.
  - `docs/case-study.md`: Production case study documenting attack and defense of an autonomous email agent against indirect prompt injection.
  - `docs/interview-notes.md`: Technical interview kit with 10 deep architectural questions/answers and 5 verified resume bullet points.
- **Repository Governance & Community Health**:
  - `LICENSE`: MIT License.
  - `SECURITY.md`: Security policy, responsible disclosure contact, and zero-raw-user-data guarantee.
  - `CONTRIBUTING.md`: Contribution guidelines, development environment setup, and quality gates.
  - `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1.
  - Issue and pull request templates (`.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`).

## [0.8.0] - 2026-10-20

### Added
- **Production Containerization & Orchestration (`Dockerfile`, `dashboard/Dockerfile`, `docker-compose.yml`)**:
  - Multi-stage, unprivileged runner Dockerfiles for Gateway backend (`python:3.11-slim-bookworm`) and Operator Console (`node:20-alpine` + `nginx:1.27-alpine-slim`).
  - Production Nginx configuration (`dashboard/nginx.conf`) with static caching, reverse proxying for `/v1/` and `/health`, and security headers.
  - Multi-service `docker-compose.yml` supporting core services (`gateway`, `dashboard`) and optional profiles (`ollama`, `postgres`, `monitoring` with Prometheus and Grafana).
  - Provisioned Grafana dashboard (`deploy/monitoring/grafana/dashboards/aegis-overview.json`) and Prometheus scrape configuration (`deploy/monitoring/prometheus.yml`).
- **Local Development Supervisor (`scripts/dev_up.py`, `start_aegis.py`)**:
  - Preflight validation: Python $\ge 3.11$, Node.js $\ge 18$, port availability (`8000`, `5173`), ML model asset SHA-256 verification, and upstream Ollama reachability probe.
  - Subprocess supervisor with clean signal handling (`SIGINT` / `Ctrl+C`).
  - Backwards-compatible `start_aegis.py` entrypoint.
- **Security Hardening**:
  - `SecurityHeadersMiddleware`: Injects CSP, HSTS, X-Frame-Options, X-Content-Type-Options nosniff, and Referrer-Policy headers.
  - `RequestSizeLimitMiddleware`: Enforces 5 MB payload limit (HTTP 413) to protect against memory exhaustion.
  - Configurable CORS filtering via `AEGIS_CORS_ORIGINS`.
  - Input length ceiling (`50,000` chars) and sliding-window chunk limit (`max_chunks = 12`) in ML Classifier and Pipeline.
  - ReDoS vulnerability mitigations across chat template delimiters (`R-DELIM-001`), image exfiltration (`R-EXFIL-001`), email address PII regex, and CSS hidden elements.
  - Pathological input and ReDoS fuzzing test suite in `backend/tests/test_redos.py` (4 tests, all passing with bounded runtime).
- **Concurrency & Load Testing Benchmark (`scripts/load_test.py`, `docs/deployment.md`)**:
  - Self-contained async HTTP load test harness measuring throughput (RPS) and latency percentiles (P50, P90, P95, P99).
  - Empirical load test documentation recording performance on development hardware (up to 762 RPS with P95 under 4.1 ms).
  - Comprehensive operational deployment guide (`docs/deployment.md`) detailing Docker procedures, environment configuration reference table, backup and retention policies, and salt rotation protocols.
- **CI/CD & Automation (`.github/workflows/release.yml`, `.github/dependabot.yml`, `Makefile`)**:
  - Release workflow building Python SDK wheels, Docker images, and publishing release assets with SHA-256 checksums on git tags.
  - Dependabot configuration for pip, npm, and GitHub Actions dependencies.
  - Extended root `Makefile` with `docker-build`, `docker-up`, `docker-down`, `audit`, and `bench` targets.

## [0.7.0] - 2026-10-20

### Added
- **AEGIS Red-Team Evaluation Harness (`redteam/`)**:
  - `aegis-redteam` CLI evaluating 205 test cases (160 attacks across OWASP LLM01/02/06 and 45 benign control hard negatives).
  - Corpus suites: `direct_injections.yaml`, `indirect_injections.yaml`, `delimiter_smuggling.yaml`, `credential_exfil.yaml`, `jailbreaks.yaml`, `benign_controls.yaml`.
  - Obfuscation mutators (`mutators.py`): Base64 encoding, Cyrillic homoglyph substitution, HTML comment wrapping, hidden CSS wrapping, split concatenation, casing, whitespace.
  - Automated reporting in Markdown (`report.md`), JSON (`report.json`), and HTML (`report.html`) with an auto-generated "Known Bypasses" appendix.
  - Measured Benchmark: **83.12% Attack Detection Rate**, **0.00% False Positive Rate**, **P95 Latency 1.48 ms**.
  - Configurable CLI quality gate (`--min-detection-rate`, `--max-fpr`) returning non-zero exit code on security regression.
- **Official `aegis-client` Python SDK (`aegis_client/`)**:
  - Publish-ready wheel and sdist package (`pyproject.toml`) verified with `python -m build`.
  - Synchronous (`AegisClient`) and Asynchronous (`AsyncAegisClient`) HTTP clients.
  - Drop-in OpenAI client wrapper (`wrap_openai`) redirecting chat completions to the gateway.
  - FastAPI / Starlette firewall middleware (`AegisFirewallMiddleware`).
  - LangChain-compatible security callback handler (`AegisSecurityCallbackHandler`).
- **Integration Examples (`examples/`)**:
  - `01_openai_sdk_gateway.py`: Drop-in OpenAI SDK integration.
  - `02_fastapi_middleware.py`: FastAPI security middleware.
  - `03_tool_call_guard.py`: Autonomous agent tool-calling capability guard.
- **Test Suite Expansion**:
  - Added 6 new integration tests in `backend/tests/test_redteam.py` and `backend/tests/test_sdk.py`, bringing total tests to 122.

## [0.6.0] - 2026-10-20

### Added
- **Operator Dashboard Overhaul (`dashboard/`, `backend/app/api/v1/eval.py`, `scripts/seed_demo_data.py`)**:
  - Rebuilt the security operator console in React 18, TypeScript (strict), Vite, and Tailwind CSS.
  - Replaced legacy simulation badges and hardcoded mock data with 7 production-grade views powered exclusively by real backend telemetry:
    - **OverviewPage**: Real-time request volumes, containment rate, P95 latency (&lt; 1.5 ms), live engine status (ONNX CPU inference, circuit breaker), interactive verdict distribution, and live threat feed.
    - **PlaygroundPage**: Interactive text scanner with trust-level boundary configuration (`system`, `user`, `retrieved`, `tool_output`), side-by-side policy compare mode (evaluating strict vs balanced/lenient), evidence span highlighter for exact character offsets, and 6-layer forensic breakdown.
    - **AttackLabPage**: Multi-turn agent arena running side-by-side live execution (Without AEGIS vs With AEGIS) across 12 scenarios, automated oracle verification, honeytoken status, and sandbox outbox inspection.
    - **EventsPage**: Paginated, searchable cryptographic audit log (`GET /v1/events`). Masked SHA-256 payload digests, verdict filtering, event detail drawer, and CSV/JSON export.
    - **PoliciesPage**: Dynamic threshold management, one-click preset switching (`strict`, `balanced`, `lenient`), policy audit trail (`GET /v1/policies/audit/history`), and agent capability YAML policy viewer.
    - **EvaluationPage**: High-precision evaluation dashboard rendering measured numbers from `ml/reports/metrics.json` and `lab/reports/summary.json` (Holdout precision 100%, 0/600 hard-negative FPR, 2,550 TN confusion matrix, operating points table, CPU latency benchmark, and 12-scenario attack lab results).
    - **AuditReportPage**: Executive compliance report with print stylesheet (`@media print`), OWASP Top 10 for LLM Applications (2025) compliance matrix, and cryptographically verified sign-off.
  - Added `scripts/seed_demo_data.py` and `POST /v1/events/seed` providing a one-click seed of 5 representative security events explicitly tagged with `is_demo_seed: True` and `source: demo_seed`.
  - Added `GET /v1/eval/metrics` and `GET /v1/eval/lab` endpoints in `backend/app/api/v1/eval.py`.
- **Cleanup**:
  - Purged all legacy hardcoded components (`AttackMatrix`, `DocsAndReasoning`, `GuardrailsMatrix`, `LiveAttackStudio`, `SandboxInspector`, `ThreatFeed`) and obsolete hooks.

## [0.5.0] - 2026-10-20

### Added
- **The Attack Lab (`lab/`, `backend/app/api/v1/lab.py`)**:
  - Sandboxed environment (`lab/sandbox/`) seeded with realistic honeytoken secrets (`credentials.env`, `customers.csv`, `internal_policy.md`).
  - Audited sandbox tools (`lab/tools/sandbox_tools.py`): `read_file` (with directory jail protection), `send_email` (writing to simulated outbox log), `write_note`, and `http_get`, with execution auditing to `tool_audit.jsonl`.
  - Autonomous tool-using agent (`lab/agent/core_agent.py`) communicating with any OpenAI-compatible gateway and checking tool execution against AEGIS policies.
  - 12 comprehensive scenarios (`lab/scenarios/`): direct override, indirect email exfiltration, hidden CSS injection, HTML comment smuggling, markdown image leak, canary extraction, tool abuse path traversal, chat delimiter smuggling, multilingual injection, base64 payload execution, roleplay escalation, and benign customer support control.
  - Scenario runner (`lab/runner.py`) and batch evaluator (`lab/batch_run.py`) evaluating automated, objective success oracles with side-by-side comparison (AEGIS OFF vs AEGIS ON).
  - Attack Lab REST API endpoints: `GET /v1/lab/scenarios`, `GET /v1/lab/scenarios/{id}`, `POST /v1/lab/run`, `GET /v1/lab/report`.
  - Batch evaluation report (`lab/reports/summary.json`, `lab/reports/summary.md`):
    - Attack Success Rate without AEGIS: 100.0% (11/11 attacks succeeded).
    - Attack Success Rate with AEGIS: 0.0% (0/11 attacks succeeded).
    - False positive rate on benign controls: 0.0% (1/1 allowed).
    - Measured Risk Reduction: -100.0%.
- **Integration Tests**:
  - Added 7 Attack Lab integration tests in `backend/tests/test_lab.py`, bringing test suite to 116 tests.

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
