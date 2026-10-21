# Project Status: Project AEGIS

## Honest Current State (All Phases 1–9 Complete — Production Ready)

### What Works (Completed & Operational)
* **Comprehensive Documentation & Technical Demo Suite (`docs/`, `README.md`)**:
  - **Architecture Specification (`docs/architecture.md`)**: Component descriptions, pipeline data flow, and Mermaid sequence diagrams for text scanning, SSE streaming proxying, and tool-call taint guards.
  - **Threat Model (`docs/threat-model.md`)**: Detailed asset classification, adversary capabilities, STRIDE threat analysis, trust boundaries, and residual risk assessment.
  - **REST API Reference (`docs/api.md`)**: Complete v1 API specifications with JSON schemas, response structures, and runnable Python SDK & cURL examples for all routes.
  - **Empirical Evaluation Report (`docs/evaluation.md`)**: Verified metrics, confusion matrix, operating points table, CPU latency benchmarks, Attack Lab results, and Red-Team detection metrics.
  - **OWASP Top 10 for LLM Applications (2025) (`docs/owasp-mapping.md`)**: Complete matrix mapping LLM01–LLM10 against AEGIS defense layers and automated test suites.
  - **Honest Limitations & Bypasses (`docs/limitations.md`)**: Forensic post-mortem of the 27 red-team false negatives, language coverage boundaries, lookahead latency trade-offs, and adversarial adaptivity analysis.
  - **Frequently Asked Questions (`docs/faq.md`)**: Answers covering local-first execution, trust levels, zero-data storage guarantees, and deployment models.
  - **3-Minute Presentation Walkthrough (`docs/demo-script.md`)**: Structured demo script with timecodes and expected UI states.
  - **Case Study (`docs/case-study.md`)**: "Defending an Autonomous Email Agent from Indirect Prompt Injection & Tool Abuse".
  - **Technical Interview & Resume Kit (`docs/interview-notes.md`)**: 10 architectural interview questions with deep codebase-grounded answers and 5 verified resume bullet points.
* **Community Health & Governance**:
  - `LICENSE`: MIT License.
  - `SECURITY.md`: Responsible disclosure contacts, supported versions, and zero-raw-user-data guarantee.
  - `CONTRIBUTING.md`: Development environment setup, non-negotiable engineering rules, and quality gates.
  - `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1.
  - Issue & PR Templates: Bug report, feature request, and quality gates pull request template.
* **Production Deployment & Hardening (`Dockerfile`, `dashboard/Dockerfile`, `docker-compose.yml`, `docs/deployment.md`)**:
  - Multi-stage, unprivileged runner Dockerfiles for Gateway backend (`python:3.11-slim-bookworm`) and Operator Console (`node:20-alpine` + `nginx:1.27-alpine-slim`) with built-in container healthchecks.
  - Hardened Nginx configuration (`dashboard/nginx.conf`) with static asset caching, reverse proxying for `/v1/` and `/health`, and security headers.
  - Multi-service `docker-compose.yml` supporting core services (`gateway`, `dashboard`) and optional companion profiles (`ollama`, `postgres`, `monitoring` with Prometheus and Grafana).
  - Provisioned Grafana dashboard (`deploy/monitoring/grafana/dashboards/aegis-overview.json`) and Prometheus scraper configuration (`deploy/monitoring/prometheus.yml`).
  - Comprehensive operational deployment guide (`docs/deployment.md`) documenting Docker setups, bare-metal operations, SQLite/PostgreSQL retention lifecycle, salt rotation protocols, and empirical load benchmarks.
* **Local Development Supervisor (`scripts/dev_up.py`, `start_aegis.py`)**:
  - Automated preflight validation: Python $\ge 3.11$, Node.js $\ge 18$, port availability (`8000`, `5173`), ML model asset SHA-256 verification, and upstream Ollama reachability probe.
  - Multi-process supervisor with clean signal handling (`SIGINT` / `Ctrl+C`).
  - Backwards-compatible `start_aegis.py` wrapper.
* **Defense-in-Depth Security Hardening**:
  - `SecurityHeadersMiddleware`: Injects CSP, HSTS, X-Frame-Options, X-Content-Type-Options nosniff, and Referrer-Policy headers.
  - `RequestSizeLimitMiddleware`: Enforces 5 MB payload limit (HTTP 413) to protect against memory exhaustion.
  - Configurable CORS filtering via `AEGIS_CORS_ORIGINS`.
  - Input length ceiling (`50,000` chars) and sliding-window chunk limit (`max_chunks = 12`) in ML Classifier and Pipeline to prevent CPU denial of service.
  - ReDoS vulnerability mitigations across chat template delimiters (`R-DELIM-001`), image exfiltration (`R-EXFIL-001`), RFC 5321 email address PII regex, and CSS hidden elements.
  - Pathological input and ReDoS fuzzing test suite in `backend/tests/test_redos.py` (4 tests, all passing with bounded runtime).
* **Concurrency & Load Testing Benchmark (`scripts/load_test.py`)**:
  - Self-contained async HTTP load test harness measuring throughput (RPS) and latency percentiles (P50, P90, P95, P99).
  - Empirical load test documentation recording performance on development hardware (up to 762 RPS with P95 under 4.1 ms across all 6 defense layers).
* **CI/CD & Automation (`.github/workflows/release.yml`, `.github/dependabot.yml`, `Makefile`)**:
  - Release workflow building Python SDK wheels, Docker images, and publishing release assets with SHA-256 checksums on git tags.
  - Dependabot configuration for pip, npm, and GitHub Actions dependencies.
  - Extended root `Makefile` with `docker-build`, `docker-up`, `docker-down`, `audit`, and `bench` targets.
* **AEGIS Red-Team Evaluation Harness (`redteam/`)**:
  - Standalone CLI tool (`aegis-redteam`) evaluating 205 test cases (160 attacks across OWASP LLM01/02/06 and 45 benign control hard negatives).
  - 6 dedicated corpus test suites: `direct_injections.yaml`, `indirect_injections.yaml`, `delimiter_smuggling.yaml`, `credential_exfil.yaml`, `jailbreaks.yaml`, `benign_controls.yaml`.
  - Obfuscation mutators (`redteam/mutators.py`): Base64 encoding, Cyrillic homoglyph substitution, HTML comment wrapping, hidden CSS wrapping, split concatenation, uppercase/lowercase/title casing, and whitespace insertion.
  - Automated report generation in Markdown (`report.md`), JSON (`report.json`), and HTML (`report.html`) with an auto-generated "Known Bypasses" appendix detailing false negatives.
  - Measured Benchmark: **83.12% Attack Detection Rate** (133/160 detected), **0.00% False Positive Rate** (0/45 false positives), **P95 Latency 1.48 ms**.
  - Configurable CLI quality gates (`--min-detection-rate`, `--max-fpr`) returning non-zero exit codes on security regression.
* **Official `aegis-client` Python SDK (`aegis_client/`)**:
  - Publish-ready wheel and sdist package (`pyproject.toml`) verified with `python -m build`.
  - Synchronous (`AegisClient`) and Asynchronous (`AsyncAegisClient`) HTTP clients for all scan, tool-call, health, and policy endpoints.
  - Drop-in OpenAI client wrapper (`wrap_openai`) redirecting chat completions through the AEGIS gateway transparently.
  - FastAPI / Starlette firewall middleware (`AegisFirewallMiddleware`) intercepting and inspecting incoming JSON bodies.
  - LangChain-compatible security callback handler (`AegisSecurityCallbackHandler`) intercepting LLM start events.
* **Runnable Integration Examples (`examples/`)**:
  - `01_openai_sdk_gateway.py`: Drop-in OpenAI SDK integration.
  - `02_fastapi_middleware.py`: FastAPI security middleware.
  - `03_tool_call_guard.py`: Autonomous agent tool-calling capability guard.
* **Operator Security Console Rebuild (`dashboard/`, `backend/app/api/v1/eval.py`)**:
  - React 18, TypeScript (strict), Vite, Tailwind CSS console completely free of hardcoded mock data and simulated badges.
  - **Overview**: Real-time requests, P95 latency (&lt; 1.5 ms), block rate, ONNX CPU engine health, upstream LLM connector status, and live threat feed.
  - **Playground**: Real-time multi-layer scan with trust boundaries (`system`, `user`, `retrieved`, `tool_output`), side-by-side policy compare, evidence span highlighter, and 6-layer forensic breakdown.
  - **Attack Lab**: Interactive arena running multi-turn agent attacks side-by-side (Without AEGIS vs With AEGIS) with automated oracle evaluations, live honeytoken compromise status, and sandbox outbox inspection.
  - **Events**: Filterable, paginated audit log (`GET /v1/events`) showing SHA-256 masked payloads, event detail drawer, and CSV/JSON export.
  - **Policies**: Threshold adjustment, instant preset switching (`strict`, `balanced`, `lenient`), policy audit log, and capability YAML viewer.
  - **Evaluation**: High-precision display of measured metrics from `ml/reports/metrics.json` (100% precision, 0/600 FPR, 2,550 TN confusion matrix) and `lab/reports/summary.json` (100% &rarr; 0% ASR).
  - **Audit Report**: Executive compliance synthesis with print stylesheet and OWASP Top 10 for LLMs mapping.
  - `POST /v1/events/seed` & `scripts/seed_demo_data.py`: One-click seed of 5 representative security events explicitly tagged with `is_demo_seed: True`.
* **The Attack Lab (`lab/`, `backend/app/api/v1/lab.py`)**:
  - Sandboxed environment (`lab/sandbox/`) with honeytoken secrets (`credentials.env`, `customers.csv`, `internal_policy.md`).
  - Audited tools (`lab/tools/sandbox_tools.py`): `read_file`, `send_email`, `write_note`, `http_get` with audit logging in `tool_audit.jsonl`.
  - Autonomous tool-using agent (`lab/agent/core_agent.py`) executing realistic multi-turn scenarios.
  - 12 comprehensive scenarios (`lab/scenarios/`) covering direct override, indirect email exfiltration, hidden CSS, HTML comment smuggling, markdown image leak, canary extraction, tool abuse path traversal, delimiter smuggling, multilingual, base64 payload, roleplay escalation, and benign control.
  - Objective automated oracles evaluating attack success.
  - Attack Lab REST API (`GET /v1/lab/scenarios`, `GET /v1/lab/scenarios/{id}`, `POST /v1/lab/run`, `GET /v1/lab/report`).
  - Measured Batch Results (`lab/reports/summary.json`):
    - ASR Without AEGIS: **100.0%** (11/11 attacks succeeded)
    - ASR With AEGIS: **0.0%** (0/11 attacks succeeded)
    - False Positive Rate on Controls: **0.0%** (0/1 false positives)
    - Risk Reduction: **-100.0%**
* **OpenAI-Compatible Proxy Gateway (`backend/app/api/v1/gateway.py`, `backend/app/gateway/`)**:
  - `POST /v1/chat/completions`: Full drop-in OpenAI-compatible proxy supporting both non-streaming and Server-Sent Events (SSE) streaming (`stream=true`).
  - `GET /v1/models`: OpenAI-compatible model catalog endpoint.
  - **Pre-Flight Request Inspection**: Scans system, user, and tool messages across all 6 defense layers; returns OpenAI-shaped error payloads (`error.type = "aegis_policy_violation"`, `code = "prompt_injection_blocked"`) on block, or applies typed placeholder redaction.
  - **Post-Flight Response Inspection**: Scans model output for system prompt canary token leakage (`aegis-canary-...`), exposed API keys/credentials, and markdown image data exfiltration links.
  - **Streaming Defense (`streaming.py`)**: Real-time sliding window lookahead token buffer aborting compromised streams mid-flight with structured error chunks.
  - **Upstream Connector & Resilience (`upstream.py`)**: Proxies to local Ollama (`http://localhost:11434/v1`) or any OpenAI-compatible provider with circuit breaker protection and offline hermetic fake mode.
  - Standardized gateway headers: `X-Aegis-Request-Id`, `X-Aegis-Verdict`, `X-Aegis-Risk`.
* **Database & Privacy-Preserving Event Persistence (`backend/app/storage/`)**:
  - SQLAlchemy 2.0 schema (`SecurityEventModel`, `ApiKeyModel`) with SQLite default and PostgreSQL support.
  - Salted SHA-256 text hashing guaranteeing zero raw user prompt data is ever logged or stored.
  - `EventRepository` and `ApiKeyRepository` managing audit logging and authentication keys.
* **Authentication & Rate Limiting (`backend/app/security/`)**:
  - API key authentication (`X-API-Key` or `Authorization: Bearer <key>`) with SHA-256 key hashing at rest.
  - Token bucket rate limiter (`ratelimit.py`) enforcing request limits with HTTP 429 and `Retry-After` headers.
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
  - Exported to ONNX (`models/classifier.onnx`, 982 KB) with verified numerical parity (&lt; 2e-3 difference against float64).
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
  - `POST /v1/chat/completions`: OpenAI-compatible drop-in gateway endpoint.
  - `GET /v1/models`: OpenAI-compatible model catalog endpoint.
  - `GET /v1/eval/metrics`, `GET /v1/eval/lab`: Real metrics report endpoints.
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
  - 100% passing hermetic backend tests (126/126) in `backend/tests/`.
  - 100% passing Chrome extension tests (37/37) in `extension/tests/`.
  - Clean production build of React 18 dashboard (`tsc && vite build`).
  - Strict linting and formatting with `ruff check .` (0 errors) and `ruff format .`.
  - Type-checking with `mypy backend aegis_client` (0 errors in 66 files).
  - Root `Makefile` with targets (`setup`, `lint`, `format`, `test`, `eval`, `redteam`, `up`, `down`, `demo`, `docker-build`, `docker-up`, `docker-down`, `audit`, `bench`).
  - Pre-commit with `detect-secrets`.
  - GitHub Actions CI matrix for Python 3.11/3.12, Node 20, Ruff, Mypy, Pytest with coverage, Extension tests, and Dashboard build.

---

### What is a Placeholder (`placeholder_*`)
* `placeholder_qwen_gguf_weights`: Optional heavy LLM checkpoint for local offline inference.

---

### What is Missing
* **None.** All 9 phases of the Project AEGIS Production-Grade Upgrade Plan (`docs/PLAN.md`) are fully implemented, verified with passing tests, documented, containerized, and measured with empirical results.

---

### What is Measured
* **Load & Concurrency Benchmark (`docs/deployment.md`, `scripts/load_test.py`)**:
  - Single-client P50 Latency: **1.12 ms**, Throughput: **78.4 RPS**.
  - Concurrency C=20 Throughput: **762.3 RPS**, P95 Latency: **4.10 ms**, Error Rate: **0.0%**.
* **Red-Team Evaluation Harness (`redteam/reports/report.json`)**:
  - Attacks Evaluated: 160 across OWASP LLM01, LLM02, LLM06.
  - Attack Detection Rate: **83.12%** (133 / 160 detected).
  - Benign Controls Evaluated: 45 hard negatives.
  - False Positive Rate: **0.00%** (0 / 45 false positives).
  - P95 Evaluation Latency: **1.48 ms**.
* **Attack Lab (`lab/reports/summary.json`)**:
  - ASR Without AEGIS: **100.0%** (11/11 attacks succeeded).
  - ASR With AEGIS: **0.0%** (0/11 attacks succeeded).
  - False Positive Rate on Controls: **0.0%** (0/1 false positives).
  - Risk Reduction: **-100.0%**.
* **Detector Accuracy (`ml/reports/metrics.json`)**:
  - Overall Test Precision: 1.0000 (0 false positives on 2,550 test negatives).
  - Hard-Negative FPR: 0.0000% (0 / 600 false positives on benign security/coding prompts).
  - Overall Test Recall: 0.4652 (honest holdout evaluation on unseen HackAPrompt red-team challenges).
  - Test ROC-AUC: 0.9469, PR-AUC: 0.9125.
* **Inference Latency (`ml/reports/latency.json`)**:
  - CPU Single-Thread p50: 0.29 - 0.44 ms.
  - CPU Single-Thread p95: 0.61 - 0.94 ms.
  - CPU 32-Thread Concurrency p95: &lt; 2.5 ms.
* **Quality Gates & CI/CD Integrity**:
  - `ruff check .`: 0 errors.
  - `ruff format --check .`: Clean across all python files.
  - `mypy backend aegis_client`: 0 errors in 67 source files.
  - `pytest backend/tests`: 126/126 passed cleanly (including hermetic fallback mode and production ONNX mode).
  - Runtime Supervisor & Packaging: Verified `start_aegis.py` clean startup, decoupled `demo_seed` from scripts, and added Windows UTF-8 stdout fallback.
  - GitHub Actions CI: Hermetic testing verified for offline/unbundled environments.
  - Pull Requests: All obsolete/conflicting PRs (#21, #22) and unpinned automated Dependabot bumps (#23–#49) reconciled and closed.
  - `extension` (`npm test`): 37/37 passed.
  - `dashboard` (`npm run build`): Clean production bundle.
