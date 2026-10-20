<USER_REQUEST>
# Project AEGIS — Production-Grade Upgrade Plan

> **For the coding agent (Antigravity):** Read this whole document first. Then execute **one phase at a time**, in order. After each phase: run all quality gates, commit with a conventional commit message, update `CHANGELOG.md`, and stop with a short report (what changed, test results, anything that deviated from this plan). Do not start the next phase until told to. Never claim a capability in code, comments, README or docs that is not implemented and measured.

---

## 0. Goal and positioning

**One-sentence pitch:** AEGIS is a local-first security gateway that sits between applications and LLMs, detects and blocks prompt injection (direct and indirect), secret and PII leakage, and unsafe agent tool calls, and proves its effectiveness with a reproducible evaluation.

**What changes from today:**
1. Detection becomes a real, trained, measured model (not TF-IDF over ~15 sentences and keyword counts).
2. The scripted "DocuMind" demo is replaced by a real LLM agent with real (sandboxed) tools that is genuinely attacked with the firewall OFF and genuinely protected with it ON.
3. The system becomes deployable (Docker, auth, metrics, CI) and documented like a real product (architecture, threat model, API, evaluation, security policy).
4. Scope is narrowed: the core story is **prompt injection + data leak + agent tool abuse**. Visual phishing moves to `modules/phishing/` and is documented as an optional module, not the headline.

**Target audience for the repo:** a hiring manager or senior engineer who will spend 5 minutes skimming. They must see: a clear problem, an architecture diagram, real numbers, a working demo, and honest limitations.

---

## 1. Non-negotiable rules (put these in `AGENTS.md`, extend existing ones)

1. **Honesty:** no marketing claims without a measurement. Heuristics are called heuristics. Remove or rename anything that "simulates" a technique (e.g. the current "attention-shift probe" is a lexical divergence heuristic, not model attention).
2. **No raw user data in logs or DB:** prompts, pages and identifiers are SHA-256 hashed or masked before storage (existing rule, keep and test it).
3. **Offline-first / hermetic tests:** tests must never touch the network or require model downloads. Use tiny fixtures and a `FakeModel` test double. Real-model tests are marked `@pytest.mark.model` and skipped by default in CI.
4. **Network is unreliable on the dev machine** (huggingface.co and github.com have timed out). All downloads go through `scripts/fetch_assets.py`, which retries with backoff, supports a local mirror directory (`AEGIS_ASSET_DIR`), verifies SHA-256 against `data/raw/MANIFEST.json` and `models/MANIFEST.json`, and fails with a clear message. Nothing else downloads anything.
5. **Hardware budget:** 16 GB RAM, RTX 4050 6 GB VRAM, Windows 11 primary, Linux/macOS must also work. Training must fit in 6 GB VRAM (small models, small batch, fp16) and inference must run on CPU.
6. **No secrets in git.** `.env` ignored, `.env.example` complete. Pre-commit includes `detect-secrets` or `gitleaks`.
7. **No binaries in git:** model weights and datasets are gitignored and fetched or built by scripts. Only manifests, configs and small test fixtures are committed.
8. **Typed and linted:** `ruff` (lint + format), `mypy` on `backend/` and `aegis_client/`, `tsc --noEmit` on TypeScript packages. All must pass in CI.
9. **Every phase ends green:** lint, type-check, tests, builds. If a gate cannot pass, stop and report instead of disabling it.
10. **Conventional commits** (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `refactor:`, `chore:`), small focused commits, one GitHub issue per task where practical (existing issues may be reused).

---

## 2. Target architecture

```
┌────────────────────────────┐        ┌─────────────────────────────────────────────┐
│ Client apps / agents       │        │ AEGIS Gateway (FastAPI)                      │
│  - Attack Lab agent app    │  HTTP  │                                              │
│  - any OpenAI-compatible   ├───────►│  /v1/chat/completions  (OpenAI-compatible)   │
│    client (base_url swap)  │        │  /v1/scan              (scan any text)       │
│  - Chrome extension        │        │  /v1/scan/tool-call    (agent action check)  │
│  - aegis_client SDK        │        │  /v1/policies, /v1/events, /v1/metrics ...   │
└────────────────────────────┘        │                                              │
                                      │  Pipeline (ordered, each layer returns a     │
                                      │  LayerResult with score, label, evidence):   │
                                      │   1 Normalizer / Deobfuscator                │
                                      │   2 Rule layer (delimiters, exfil, secrets)  │
                                      │   3 ML classifier (ONNX, trained by us)      │
                                      │   4 Context layer (trust-aware, RAG chunks)  │
                                      │   5 Tool-call policy engine                  │
                                      │   6 Decision engine (policy → action)        │
                                      │                                              │
                                      │  Upstream: Ollama / OpenAI-compatible LLM    │
                                      │  Storage: SQLite (default), Postgres (opt.)  │
                                      └──────────────────────┬──────────────────────┘
                                                             │
                                      ┌──────────────────────▼──────────────────────┐
                                      │ Dashboard (React + TS + Vite)                │
                                      │  Overview · Playground · Attack Lab ·        │
                                      │  Events · Policies · Evaluation · Audit      │
                                      └──────────────────────────────────────────────┘
```

**Key design decisions to record as ADRs (`docs/adr/`):**
- ADR-001 Local-first, no third-party cloud calls for detection.
- ADR-002 Layered pipeline with per-layer evidence (explainability over a single black-box score).
- ADR-003 ONNX Runtime for CPU inference of the trained classifier.
- ADR-004 OpenAI-compatible gateway as the integration surface.
- ADR-005 Trust levels for content (system / user / retrieved / tool-output) as a first-class concept.
- ADR-006 SQLite default, Postgres optional via SQLAlchemy.

**Core domain concept — trust levels.** Every piece of text entering the pipeline carries a `source` of `system | user | retrieved | tool_output`. Instruction-like content from `retrieved` or `tool_output` is far more suspicious than the same content from `user`. This is the heart of *indirect* prompt injection defense and must be visible in the API, the pipeline and the dashboard.

---

## 3. Target repository structure

```
ai-prompt-injection-firewall/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE                      # MIT (verify it exists)
├── Makefile                     # make setup | lint | test | eval | up | down | demo
├── docker-compose.yml
├── pyproject.toml
├── .env.example
├── .github/
│   ├── workflows/ci.yml, release.yml
│   ├── ISSUE_TEMPLATE/ (bug, feature)
│   └── pull_request_template.md
├── backend/
│   └── app/
│       ├── main.py
│       ├── config.py            # pydantic-settings
│       ├── api/v1/              # routers: scan, gateway, events, policies, health, metrics
│       ├── core/                # pipeline.py, decision.py, trust.py, models.py (pydantic schemas)
│       ├── layers/              # normalizer.py, rules.py, classifier.py, context.py, toolcall.py
│       ├── gateway/             # openai_compat.py, upstream.py (Ollama/OpenAI clients), streaming.py
│       ├── storage/             # db.py, repositories.py, migrations/ (alembic)
│       ├── security/            # auth.py (API keys), ratelimit.py, hashing.py
│       └── observability/       # logging.py, metrics.py
├── ml/
│   ├── README.md
│   ├── configs/                 # train_*.yaml
│   ├── data/                    # build_dataset.py, splits.py, schema.md
│   ├── train.py, export_onnx.py, evaluate.py, ablate.py, benchmark_latency.py
│   └── reports/                 # committed: metrics.json, confusion matrix PNG, curves (small)
├── aegis_client/                # pip-installable SDK + FastAPI/Starlette middleware + LangChain-style wrapper
├── lab/                         # "Attack Lab": real agent app + sandboxed tools + attack scenarios
│   ├── agent/, tools/, scenarios/, fixtures/ (PDFs, HTML, emails with embedded attacks)
├── redteam/                     # CLI `aegis-redteam`: attack corpus, runner, reports
│   ├── corpus/ (yaml, one attack per file with category, OWASP mapping, expected verdict)
│   └── report/ (markdown + JSON + HTML)
├── dashboard/                   # React 18 + TS + Vite + Tailwind
├── extension/                   # Chrome MV3 (kept, trimmed to the core story)
├── modules/phishing/            # moved visual-phishing module (optional)
├── scripts/                     # fetch_assets.py, seed_demo_data.py, dev_up.py (replaces start_aegis.py)
├── data/raw/MANIFEST.json
├── models/MANIFEST.json
├── docs/
│   ├── index.md, architecture.md, threat-model.md, api.md, deployment.md,
│   ├── evaluation.md, limitations.md, owasp-mapping.md, demo-script.md, faq.md
│   └── adr/ ADR-001..006
└── tests/                       # backend unit + integration + e2e; fixtures/
```

Migrate existing code into this layout incrementally (Phase 1), keeping `start_aegis.py` working until `scripts/dev_up.py` replaces it.

---

## 4. Phases

Each phase has: **Goal → Tasks → Done when**. Estimated effort assumes an agent working fast; adjust freely.

### Phase 1 — Foundation and cleanup (≈ half a day)

**Goal:** a clean, honest, well-structured base that every later phase builds on.

**Tasks**
1. Audit the current repo and write `docs/audit.md`: what exists, what is a heuristic, what is simulated, what is dead code. Be blunt.
2. Restructure the backend into the layout in §3 (routers under `api/v1/`, pipeline under `core/`, detectors under `layers/`). Keep behavior and keep existing tests passing; move tests into `tests/`.
3. Introduce the pipeline abstraction:
   - `LayerResult(layer, score: float 0..1, label: str, evidence: list[Evidence], latency_ms: float)`
   - `Evidence(kind, span: (start, end) | None, detail: str)` — spans enable highlighting in the UI.
   - `ScanRequest(text, source: Literal["system","user","retrieved","tool_output"], metadata)` and `ScanResponse(verdict: allow|warn|block|redact, risk_score, layers: list[LayerResult], request_id, policy_id, latency_ms)`.
4. Port the existing regex detectors (delimiters, markdown exfil, jailbreak phrases) into `layers/rules.py` as rule objects with ids (`R-DELIM-001`, ...), severity, OWASP mapping, and per-rule unit tests (positive + negative cases).
5. Move existing TF-IDF engine to `layers/legacy_tfidf.py`, mark deprecated, keep it only as the "v1 baseline" for the evaluation. Rename the attention probe to `lexical_divergence` and document it honestly.
6. Add `pydantic-settings` config, structured JSON logging (request id on every line), `/health` and `/ready`.
7. Tooling: `Makefile`, `mypy` config, `ruff format`, pre-commit with gitleaks/detect-secrets, GitHub Actions `ci.yml` (lint, mypy, pytest with coverage, extension tests, dashboard build) on push and PR, Python 3.11 and 3.12 matrix.
8. Fix README issues now: remove the hardcoded `c:/finalYearProject/...` path, replace hardcoded test badge with the CI badge, and add the repo description and topics (`prompt-injection`, `llm-security`, `ai-security`, `fastapi`, `owasp-llm-top-10`, `onnx`, `chrome-extension`).

**Done when:** CI is green, `make lint test` passes locally, the API serves the same results as before through the new layout, `docs/audit.md` exists, and no module claims something it does not do.

---

### Phase 2 — Real detector: data, training, evaluation (≈ 2–3 days) ★ most important

**Goal:** replace TF-IDF with a trained classifier and prove it with honest metrics.

**Tasks**
1. **Dataset build (`ml/data/build_dataset.py`).** Fetch via `scripts/fetch_assets.py` (hashes in `data/raw/MANIFEST.json`). Candidate public sources — *verify availability and license of each; record license in `docs/datasets.md`; skip any with an incompatible license*:
   - `deepset/prompt-injections`
   - `xTRam1/safe-guard-prompt-injection`
   - `jackhhao/jailbreak-classification`
   - Lakera Gandalf ignore-instructions style datasets (if license permits)
   - Benign counterparts: general instruction/chat data, plus **hard negatives** we generate ourselves: code snippets, config files, security blog text, README excerpts, legitimate "ignore warnings"/"override settings" docs, translations, quoted attack text in educational context.
2. **Schema:** `{id, text, label: injection|benign, subtype, source_dataset, language, split}`. Deduplicate (exact + near-duplicate via MinHash), normalize, and **split by source group and by near-duplicate cluster to avoid leakage**. Produce `train / val / test`, plus a separate **`holdout_unseen`** set from a dataset *never* used in training, to measure generalization.
3. **Synthetic augmentation (clearly marked `synthetic=true`, never in test splits):** templated indirect-injection payloads embedded inside realistic documents (emails, HTML pages, PDFs-as-text, README files, tool outputs), plus obfuscations (base64, leetspeak, zero-width chars, homoglyphs, split-token, multilingual). Test splits contain only non-synthetic data plus a separate, clearly labeled `synthetic_obfuscation` eval set.
4. **Models to train and compare** (all must be trainable within 6 GB VRAM with fp16, gradient accumulation, max length 256–512):
   - Baseline A: current TF-IDF prototype matcher (legacy).
   - Baseline B: TF-IDF + Logistic Regression.
   - Model C: `sentence-transformers/all-MiniLM-L6-v2` embeddings + Logistic Regression/MLP head (fast).
   - Model D: fine-tuned small transformer (`microsoft/deberta-v3-small` or `distilbert-base-uncased`) — primary candidate.
   - Reference (not shipped): an existing public prompt-injection classifier evaluated zero-shot on our test split, for context only.
5. **Training script** `ml/train.py` driven by YAML config; fixed seeds; logs to `ml/runs/` (gitignored); early stopping; class-weighting; calibration (temperature scaling or isotonic) so scores are meaningful probabilities.
6. **Export** `ml/export_onnx.py` to ONNX (+ int8 dynamic quantization). Verify numerical parity vs PyTorch on a fixture set. Record SHA-256 in `models/MANIFEST.json`. Weights are not committed; `fetch_assets.py` supports downloading from a GitHub Release asset or a local directory.
7. **Evaluation (`ml/evaluate.py`)** producing `ml/reports/metrics.json` and figures:
   - Precision, recall, F1, ROC-AUC, PR-AUC on `test` and `holdout_unseen`.
   - **False-positive rate on hard negatives** (report separately; this is what makes a firewall usable).
   - Threshold selection: choose operating points (e.g. recall-first "strict", balanced "default", FPR ≤ 1% "lenient") and expose them as policy presets.
   - Confusion matrix, reliability diagram, per-subtype recall (direct / indirect / jailbreak / obfuscated / multilingual).
   - Error analysis: top 25 false negatives and false positives with commentary in `docs/evaluation.md`.
8. **Ablation (`ml/ablate.py`):** rules only → rules+TF-IDF → rules+ML → full pipeline. Show what each layer adds.
9. **Latency benchmark (`ml/benchmark_latency.py`):** p50/p95/p99 on CPU for 1, 8 and 32 concurrent requests, text lengths 50/500/2000 chars, with and without int8. Report hardware used.
10. **Integrate** `layers/classifier.py` (ONNX Runtime, lazy-loaded, warm-up on startup, graceful fallback to rules-only with a `degraded=true` flag in responses if the model file is missing). Long inputs: sliding-window chunking with max-pool aggregation, and return the highest-scoring window span as evidence.
11. Write `docs/evaluation.md`: methodology, datasets, splits, leakage controls, metrics tables, plots, ablation, latency, error analysis, and a **"What this does not prove"** section.

**Done when:** `make eval` reproduces `metrics.json` from scratch (given assets), the shipped model beats both baselines on `holdout_unseen` F1 or the plan documents honestly why not, FPR on hard negatives is reported, ONNX int8 p95 latency is documented, and the README quotes only numbers present in `metrics.json`.

---

### Phase 3 — Trust-aware pipeline and tool-call policy (≈ 1–2 days)

**Goal:** make AEGIS handle *indirect* injection and *agent* abuse, which are the differentiators.

**Tasks**
1. **Normalizer** (`layers/normalizer.py`): Unicode NFKC, strip zero-width and bidi control chars, homoglyph folding, safe decoding of base64/hex/URL-encoding/ROT13 segments (depth-limited, size-limited, no execution), HTML/Markdown/PDF-text extraction that preserves hidden-text signals (CSS `display:none`, white-on-white, tiny fonts, HTML comments, alt text), and language detection. Record each transformation as evidence (`kind="deobfuscation"`).
2. **Context layer** (`layers/context.py`): apply different thresholds by `source`. Detect *instruction-like* content in `retrieved`/`tool_output` (imperatives addressed to the assistant, "ignore/forget/instead", role markers, tool-invocation syntax). Add an "instruction-in-data" feature to the classifier input or as a separate small score.
3. **Secrets and PII layer** (inside `rules.py` or `layers/secrets.py`): provider-aware secret patterns with checksum/entropy validation to reduce false positives (OpenAI/Anthropic-style keys, GitHub tokens, AWS keys, JWTs, DB URLs, private keys, Indian PII such as Aadhaar/PAN with checksum validation, emails, phone numbers, card numbers via Luhn). Actions: `redact` (replace with typed placeholders like `[SECRET:aws_access_key]`) or `block`.
4. **Canary tokens:** the gateway can inject a per-session canary into the system prompt and detect it in model output (`/v1/chat/completions` response path) to catch system-prompt leakage. Hash canaries at rest.
5. **Tool-call policy engine** (`layers/toolcall.py`, `POST /v1/scan/tool-call`): policy-as-code (YAML) with rules like:
   - allowlist/denylist of tools per agent,
   - argument constraints (e.g. `send_email.to` must match allowed domains; `read_file.path` must be inside the sandbox),
   - **taint tracking**: if any text from a `retrieved`/`tool_output` source influenced the conversation and the model then requests a high-risk tool (send, write, delete, execute, network), require `block` or `human_approval` according to policy,
   - exfiltration checks on arguments (URLs with query data, encoded blobs, secrets in args).
6. **Decision engine** (`core/decision.py`): combine layer results via explicit, documented, unit-tested logic (no magic constants buried in code; all thresholds in config/policy). Output a verdict plus a human-readable **explanation** list ("Blocked: retrieved content contained an instruction directing the assistant to call `send_email` to an external domain").
7. **Policies API:** CRUD for policy documents (`/v1/policies`), validation with clear errors, presets `strict | balanced | lenient`, and per-API-key policy assignment. Policy change audit trail.

**Done when:** a test suite with ≥ 60 targeted cases (including obfuscated, hidden-HTML, multi-step agent scenarios) passes, every verdict contains an explanation and span evidence where applicable, and policy changes alter behavior in tests.

---

### Phase 4 — OpenAI-compatible gateway (≈ 1–2 days)

**Goal:** a drop-in integration surface — change `base_url` and any app is protected.

**Tasks**
1. Implement `POST /v1/chat/completions` (non-streaming and SSE streaming) and `GET /v1/models` forwarding to a configurable upstream (default: local **Ollama** at `http://localhost:11434/v1`; also generic OpenAI-compatible upstreams).
2. **Request path:** scan system/user messages and any message marked with a metadata `aegis_source` (or role `tool` → `tool_output`). Apply `redact`/`block`/`warn`. Block returns an OpenAI-shaped error with `error.type = "aegis_policy_violation"` and the explanation.
3. **Response path:** scan model output (secrets/PII leakage, canary leakage, markdown-image exfiltration links, dangerous tool calls in `tool_calls`). For streaming, buffer-and-scan with a small lookahead window; if a violation appears, terminate the stream with a structured error chunk.
4. **Headers/metadata:** respond with `X-Aegis-Request-Id`, `X-Aegis-Verdict`, `X-Aegis-Risk`. Optional `aegis` extension field in the JSON body with layer details when the caller asks for it.
5. **Auth and limits:** API keys (hashed at rest, prefix shown in UI), per-key rate limiting (token bucket), request size limits, timeouts, circuit breaker for upstream failures. Admin key vs client key.
6. **Fail modes:** configurable `fail_open | fail_closed` for internal errors, default fail-closed for blocks, and recorded in events.
7. **Persistence:** store events (hashed content, verdict, layers, latency, source, policy id, api key id) via SQLAlchemy + Alembic migrations; SQLite default, Postgres via `DATABASE_URL`. Retention setting.
8. **Metrics:** Prometheus `/metrics` (requests, verdicts by layer, latency histograms, model load state, upstream errors).
9. Integration tests with a fake upstream (hermetic) covering allow, block, redact, streaming block, upstream failure, auth failure, rate limit.

**Done when:** `openai` Python SDK pointed at AEGIS and a local Ollama model produces normal answers for benign prompts and structured blocks for attacks; streaming works; tests cover all paths.

---

### Phase 5 — The Attack Lab: a real agent, really attacked (≈ 2 days) ★ the demo

**Goal:** replace the scripted DocuMind demo with a demonstrably real before/after.

**Tasks**
1. **Agent app** (`lab/agent/`): a small, readable tool-using assistant (plain Python + OpenAI-compatible client; no heavy frameworks) with three personas/use cases:
   - **Email assistant** (reads inbox fixtures, summarizes, drafts, can `send_email`),
   - **Document Q&A / RAG** over uploaded PDFs/HTML/Markdown (local embedding model + simple vector store),
   - **Web research agent** that fetches pages from a local fixture web server (no real internet).
2. **Sandboxed tools** (`lab/tools/`): `read_file` (jail to `lab/sandbox/`), `send_email` (writes to a local "outbox" log; nothing is sent), `http_get` (only to the fixture server), `write_note`. Each tool logs every call so the UI can show exactly what the agent did. Include honeytoken secrets in the sandbox (fake API keys, fake customer records) so exfiltration is observable.
3. **Scenario library** (`lab/scenarios/*.yaml`): ≥ 12 scenarios across: direct override, indirect via email, hidden HTML text, PDF with white-on-white text, markdown image exfiltration, system-prompt extraction, tool abuse (send honeytoken to external address), delimiter smuggling, multilingual, base64-wrapped payload, multi-turn escalation, a benign-but-scary-looking control (e.g., security article quoting an attack) to demonstrate low false positives. Each scenario defines: fixtures, user task, attack goal, **success oracle** (e.g. "honeytoken appears in outbox to attacker@evil.test"), and expected AEGIS verdict.
4. **Run modes:** the same scenario runs with **AEGIS OFF** (agent talks directly to Ollama) and **AEGIS ON** (agent talks to the gateway). A runner records both, evaluates the oracle automatically, and stores a trace.
5. **Lab UI** in the dashboard (`/lab`): choose a scenario or **upload your own document/paste your own payload**, choose model and policy preset, hit run, and see side-by-side: (left) agent without protection, (right) with AEGIS — messages, tool calls, outbox, honeytoken status, and AEGIS's per-layer explanation with highlighted spans. Show an "Attack succeeded / blocked" badge computed from the oracle, not hand-set.
6. **Batch mode:** `make lab-run` runs all scenarios ×  N trials (LLMs are stochastic; default N=5, temperature 0.7) and writes `lab/reports/summary.md` with attack success rate OFF vs ON per scenario and overall, plus false-positive count on controls. This is the headline number for the README.
7. Pre-recorded fallback: store one real trace per scenario so the dashboard can replay it when Ollama is unavailable, **clearly labeled "recorded trace"** (never presented as live).

**Done when:** on the dev machine, a fresh clone → `make up` → open `/lab` → run a scenario live; the OFF side actually leaks the honeytoken in at least a majority of attack scenarios with the chosen local model, and ON blocks them; the batch report is generated and reproducible.

---

### Phase 6 — Dashboard rebuild (≈ 1–2 days)

**Goal:** an operator console that looks and behaves like a real security product, driven only by real data.

**Tasks**
1. Stack: React 18 + TypeScript (strict) + Vite + Tailwind + TanStack Query + a small chart lib; generated API client from the OpenAPI schema (`openapi-typescript`) so types never drift.
2. Pages:
   - **Overview:** requests, block rate, top attack categories, p95 latency, model/degraded status, upstream health.
   - **Playground:** paste or upload text/file/URL-fixture, choose `source` and policy, see verdict, per-layer scores, highlighted evidence spans, deobfuscation steps, and the explanation. Side-by-side compare of two policies.
   - **Attack Lab:** from Phase 5.
   - **Events:** filterable, paginated table (verdict, layer, source, time, key); event detail drawer; export CSV/JSON. Show hashed content only.
   - **Policies:** view/edit YAML with validation and diff, presets, change history.
   - **Evaluation:** renders `ml/reports/metrics.json` and `lab/reports/summary.md` data (ROC/PR curves, confusion matrix, latency, ablation, lab ASR OFF vs ON). Static, versioned with the model.
   - **Audit report:** keep the existing printable report, regenerate from real event data, with OWASP LLM Top 10 mapping.
3. Remove every hardcoded/simulated number and "simulate attack" button. Empty states and error states must be designed. If no data, offer a one-click `seed_demo_data.py` that clearly labels seeded events as `demo_seed`.
4. Accessibility and quality: keyboard navigation, dark/light, responsive, Lighthouse ≥ 90 on performance/accessibility for built output, vitest + React Testing Library for key components, Playwright smoke test for Playground and Lab pages.

**Done when:** no page renders fabricated data, Playwright smoke tests pass in CI, and screenshots are committed to `docs/img/`.

---

### Phase 7 — Red-team harness and SDK (≈ 1 day)

**Goal:** a repeatable security test CLI and an easy-to-adopt client.

**Tasks**
1. `aegis-redteam` CLI (`redteam/`): `aegis-redteam run --target http://localhost:8000 --suite all --policy balanced --out report/`. Attack corpus as YAML files with fields `{id, category, owasp, technique, payload|template, source, expected, severity, references}`; ≥ 150 attacks, ≥ 40 benign controls; mutators (base64, homoglyph, split, translate-stub, casing, whitespace, markdown/HTML wrapping) to expand coverage. Output: detection rate and false-positive rate by category, OWASP LLM01/02/06 mapping, markdown + JSON + HTML report, and a **"known bypasses"** appendix auto-generated from misses (feeds `docs/limitations.md`).
2. Exit code non-zero if detection rate falls below a configurable threshold — runs in CI as a regression gate against a model-less rules-only config and (optionally, nightly) with the model.
3. `aegis_client` SDK: sync/async clients, typed responses, `scan()`, `scan_tool_call()`, an OpenAI-client wrapper, FastAPI/Starlette middleware example, LangChain-style callback example (keep optional dependencies optional). Publish-ready `pyproject` (build verified with `python -m build`; do not upload to PyPI unless told).
4. `examples/` with 3 runnable examples (OpenAI SDK via gateway, FastAPI middleware, tool-call check).

**Done when:** `aegis-redteam` produces a report from a clean checkout, CI fails if detection regresses, and examples run against a local gateway.

---

### Phase 8 — Deployment and hardening (≈ 1 day)

**Tasks**
1. `Dockerfile` for backend (multi-stage, non-root user, healthcheck, pinned base image) and for dashboard (static build served by nginx or by FastAPI). `docker-compose.yml` with services: `gateway`, `dashboard`, optional `ollama`, optional `postgres`, optional `prometheus` + `grafana` profile with a provisioned dashboard JSON.
2. `scripts/dev_up.py` replaces `start_aegis.py`: preflight checks (ports, Python/Node versions, model file present or degraded notice, Ollama reachable), start/supervise, clear messages. Keep `make up` as the canonical entry.
3. Security hardening: strict CORS config, security headers, request-size limits, input length caps before ML, regex timeouts/ReDoS review of all rules (add a test that fuzzes rules with pathological inputs), dependency audit (`pip-audit`, `npm audit`) in CI, Dependabot config, SBOM generation in release workflow.
4. Backup/retention docs, config reference table, upgrade notes.
5. Load test (`locust` or `k6`) documented in `docs/deployment.md`: throughput and p95 at N concurrent clients on the dev machine; state hardware.
6. `release.yml`: on tag, build wheel for `aegis_client`, build Docker images, attach `metrics.json`, model asset (ONNX int8) and its SHA-256 to the GitHub Release.

**Done when:** `docker compose up` works from a clean clone with a documented one-time asset fetch, security scans are in CI, and a `v0.1.0` release can be cut.

---

### Phase 9 — Documentation, demo and polish (≈ 1–2 days)

**Tasks**
1. **README (rewrite):** problem statement (2 short paragraphs), one architecture diagram (Mermaid), a 30-second quickstart (`docker compose up` or `make up`), a **results table pulled from the real reports** (detector F1 / FPR / p95 latency; lab attack success OFF vs ON), a feature list that only includes implemented features, screenshots/GIF, links to docs, limitations summary, roadmap, license, citation.
2. `docs/architecture.md` (components, data flow, sequence diagrams for scan, gateway streaming, tool-call check), `docs/threat-model.md` (assets, adversaries, trust boundaries, STRIDE table, in-scope/out-of-scope, residual risk), `docs/api.md` (generated from OpenAPI plus curl and Python examples), `docs/deployment.md`, `docs/evaluation.md`, `docs/owasp-mapping.md` (LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM06 Excessive Agency, etc. → which layer mitigates, how it was tested), `docs/limitations.md` (known bypasses, language coverage, adversarial adaptivity, latency/streaming trade-offs, what a determined attacker can still do), `docs/faq.md`.
3. `SECURITY.md` (responsible disclosure contact, supported versions), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue and PR templates, `CHANGELOG.md` in Keep a Changelog format.
4. **Demo assets:** `docs/demo-script.md` — a 3-minute walkthrough script (problem → Attack Lab OFF leak → ON block → Playground explanation → Evaluation page → red-team report → Docker one-liner). Record a screen capture (README GIF + a longer video link). Write a short blog-style `docs/case-study.md` ("Defending an email agent from indirect prompt injection") suitable for LinkedIn/Medium.
5. **Resume/interview kit** (`docs/interview-notes.md`, not linked in README): 10 likely technical questions with answers grounded in this codebase (why trust levels, why ONNX, how you avoided train/test leakage, what the FPR is and why it matters, what the system cannot stop), and 5 bullet lines for a resume with real numbers.
6. Final QA pass: fresh-clone test on Windows and Linux (CI job for Linux, manual note for Windows), link checker for docs, spell-check, remove dead code, ensure every claim in README maps to a file, test or report.

**Done when:** a stranger can clone, run, understand and verify the project in 15 minutes using only the README and docs.

---

## 5. Cross-cutting specifications

### 5.1 API surface (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/scan` | Scan text with `source`, policy; returns verdict, layers, evidence, explanation |
| POST | `/v1/scan/tool-call` | Check a proposed agent tool call with conversation taint context |
| POST | `/v1/chat/completions` | OpenAI-compatible protected proxy (stream + non-stream) |
| GET | `/v1/models` | Proxy to upstream models |
| GET/POST/PUT/DELETE | `/v1/policies` | Policy management |
| GET | `/v1/events`, `/v1/events/{id}` | Event query (hashed content only) |
| GET | `/v1/stats` | Aggregates for dashboard |
| GET | `/health`, `/ready`, `/metrics` | Ops |

Every response includes `request_id`. Errors follow one schema (`{error: {type, message, request_id}}`). Version the API; keep unversioned legacy routes only until Phase 1 completes, then remove with a changelog note.

### 5.2 Verdict semantics

- `allow`: no action. `warn`: allow but flag. `redact`: forward with sensitive spans replaced. `block`: do not forward; return policy error. `require_approval` (tool calls only): returned to caller, never auto-approved.
- Every non-allow verdict must carry ≥ 1 human-readable explanation and the contributing layer ids.

### 5.3 Testing strategy

- **Unit:** each rule, normalizer transform, decision rule, policy validation.
- **Property/fuzz:** normalizer never crashes or explodes in size; regex timeouts; Hypothesis on policy parsing.
- **Integration:** gateway with fake upstream; DB with SQLite in-memory.
- **E2E:** Playwright for dashboard; `lab` scenario run with a scripted fake LLM (hermetic) in CI, real-LLM lab runs are manual/nightly.
- **Regression gate:** red-team detection threshold, coverage ≥ 85% on `backend/app/core` and `layers`.
- **Model tests** marked `model`, skipped by default, run in a nightly/manual workflow.

### 5.4 Performance targets (state results honestly; adjust if hardware says otherwise)

- Rules + normalizer: p95 < 10 ms for 2k chars.
- Full pipeline with int8 ONNX on CPU: p95 < 80 ms for ≤ 512 tokens.
- Gateway overhead (excluding upstream): p95 < 120 ms non-streaming.
- Memory: gateway < 1.5 GB RSS with model loaded.

### 5.5 Privacy

- Store `sha256(salted)` of content plus length, language, and span offsets; never raw text. Optional `AEGIS_STORE_SNIPPETS=false` default.
- Salt per deployment, in `.env`.
- Document exactly what is stored in `docs/threat-model.md`.

---

## 6. Claims policy (what the README may and may not say)

**May say (once true and measured):** local-first; trained classifier with the reported F1/FPR on named datasets and splits; OpenAI-compatible gateway; trust-aware indirect-injection defense; tool-call policy engine; reproducible lab with attack success rates OFF vs ON; red-team harness.

**Must not say:** "unbreakable", "100% detection", "production-ready for any workload", "attention-based" (unless an actual model-internal attention method is implemented), "zero false positives", or any number not in a committed report. Always link to `docs/limitations.md`.

---

## 7. Suggested execution order and prompts for Antigravity

Feed Antigravity this file as context (e.g. save as `docs/PLAN.md` in the repo and reference it in `AGENTS.md`). Then run one prompt per phase:

- **Prompt 1:** "Read `docs/PLAN.md` fully. Execute **Phase 1 only**. Follow §1 rules strictly. When done, run all gates, commit, update CHANGELOG, and report. Do not start Phase 2."
- **Prompt 2:** "Execute **Phase 2 only**. Assets: use `scripts/fetch_assets.py`; if network fails, stop and tell me exactly which files to download manually and where to place them. Report the metrics table."
- **Prompt 3–9:** same pattern for Phases 3–9.

If time is short, the **minimum impressive subset** is Phases 1, 2, 4, 5, 9 (clean base → real measured detector → gateway → real attack lab → docs and demo). Phases 3, 6, 7, 8 deepen it; do them in that order of value if time remains: 3 (trust-aware + tool-call) → 6 (dashboard) → 7 (red-team) → 8 (deploy).

---

## 8. Final definition of done (checklist)

- [ ] CI green on main (lint, types, tests, builds, security scans)
- [ ] Trained ONNX classifier shipped via release asset; `metrics.json` committed; README numbers match it
- [ ] Attack Lab runs live; batch report shows attack success OFF vs ON and false positives on controls
- [ ] OpenAI SDK works against the gateway (stream and non-stream) with a local model
- [ ] Dashboard shows only real data; Playwright smoke tests pass
- [ ] `aegis-redteam` report generated; detection regression gate in CI
- [ ] `docker compose up` works from a clean clone
- [ ] Full docs set present (architecture, threat model, API, evaluation, limitations, OWASP mapping, deployment, ADRs, SECURITY, CONTRIBUTING, CHANGELOG)
- [ ] README rewritten with architecture diagram, quickstart, real results, GIF, limitations
- [ ] Repo description + topics set; `v0.1.0` release tagged
- [ ] No simulated numbers, no unimplemented claims, no raw user data stored



do this completely
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-20T18:15:26+05:30.
</ADDITIONAL_METADATA>