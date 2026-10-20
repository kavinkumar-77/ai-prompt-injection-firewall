# Project AEGIS: AI Prompt-Injection, Data-Leak & Security Gateway

[![CI](https://github.com/kavinkumar-77/ai-prompt-injection-firewall/actions/workflows/ci.yml/badge.svg)](https://github.com/kavinkumar-77/ai-prompt-injection-firewall/actions/workflows/ci.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg)](https://vitejs.dev)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-yellow.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![OWASP Top 10 for LLM](https://img.shields.io/badge/OWASP-LLM%20Top%2010%20Aligned-red.svg)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
[![Code Style: Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)

> **Local-first AI defense gateway against prompt injection, secret leakage, and unsafe agent tool calls.**  
> *Topics:* `prompt-injection` · `llm-security` · `ai-security` · `fastapi` · `owasp-llm-top-10` · `onnx` · `chrome-extension`

AEGIS sits between client applications, web agents, and LLMs to detect and block direct and indirect prompt injection, PII and credential exfiltration, and unsafe tool execution with explainable forensic evidence and deterministic rules.

---

## 1. Executive Summary & Core Capabilities

Project AEGIS implements a local-first, zero-cloud-exposure defense-in-depth architecture covering client DOM events, network transport, AI semantic intent, and executive compliance monitoring:

```mermaid
flowchart TD
    subgraph Client ["Client Apps & Agents"]
        Agent[Autonomous Agent / Web App]
        Ext[Chrome MV3 Extension]
        DOM[Web Page / LLM Assistant DOM]
    end

    subgraph Gateway ["Project AEGIS Defense Gateway (FastAPI)"]
        Normalizer[1 Normalizer / Deobfuscator]
        Rules[2 Deterministic Rules Catalog R-DELIM / R-EXFIL / R-JAIL / R-SECRET]
        Classifier[3 ML Classifier Layer]
        Context[4 Trust-Aware Context Layer system / user / retrieved / tool_output]
        ToolPolicy[5 Tool-Call Policy Engine]
        Decision[6 Decision Engine allow | warn | block | redact]
        DB[(Threat Intel SQLite DB)]
    end

    subgraph Executive ["Security Dashboard (React 18 + Vite)"]
        Feed[Real-Time Threat Intel Feed]
        Audit[OWASP LLM Top 10 Audit Report Generator]
        Lab[Live Attack Studio & Reasoning Engine]
    end

    Agent -- "POST /v1/scan" --> Normalizer
    Agent -- "POST /v1/scan/tool-call" --> ToolPolicy
    Ext -- "DOM Intercept" --> Normalizer
    Normalizer --> Rules
    Rules --> Classifier
    Classifier --> Context
    Context --> Decision
    ToolPolicy --> Decision
    Decision --> DB
    DB --> Feed
    DB --> Audit
    DB --> Lab
```

### Key Defense Features
* **Multi-Layered Gateway Pipeline (`backend/app/core/pipeline.py`)**: Executes an ordered chain of inspection layers (Normalizer, Rules, Classifier, Context, Tool-Call Policy) returning structured `LayerResult` objects with character `Evidence` spans for live forensic UI highlighting.
* **Deterministic Rules Catalog (`backend/app/layers/rules.py`)**: Sub-millisecond regex catalog identifying chat template control tokens (`R-DELIM-001`), covert markdown/HTML image exfiltration (`R-EXFIL-001`), roleplay jailbreak framing (`R-JAIL-001`), direct instruction overrides (`R-OVERRIDE-001`), and exposed credentials (`R-SECRET-001`).
* **Trust-Aware Indirect Injection Defense (`backend/app/core/trust.py`)**: Distinguishes between `system`, `user`, `retrieved`, and `tool_output` trust levels. Direct imperatives embedded in retrieved chunks or tool return values receive elevated scrutiny.
* **Agent Tool-Call Policy Guard (`backend/app/layers/toolcall.py`)**: Intercepts LLM tool invocations before execution, evaluating argument strings for dangerous system commands (`rm -rf`, `curl | bash`, SQL drops) and unauthorized actions.
* **Lexical Divergence Metric (`backend/app/layers/legacy_tfidf.py`)**: Evaluates syntactic divergence and directive clash between active system objectives and user input payloads (baseline heuristic).
* **Live PII & Credential Redactor (`extension/src/detectors/piiRedactor.ts`)**: Real-time browser input interception automatically masking OpenAI keys (`sk-...`, `sk-proj-...`), GitHub tokens, AWS credentials, JWT bearer tokens, and sensitive data before transmission.
* **System Prompt Canary Shield (`extension/src/detectors/canaryShield.ts`)**: Real-time DOM observer tracking assistant responses to identify, block, and sanitize leaked system prompts and canary tokens (`CANARY_TOKEN:...`, `AEGIS-...`).

---

## 2. Repository Architecture

```text
├── .github/workflows/ci.yml         # Matrix CI testing (Python 3.11/3.12, Node 20)
├── .env.example                     # Environment configuration template
├── .gitignore                       # Strict isolation for datasets, weights & logs
├── pyproject.toml                   # Python toolchain configuration (Ruff, Pytest, Mypy)
├── Makefile                         # make setup | lint | test | eval | up | demo
├── README.md                        # Master project documentation
├── AGENTS.md                        # Quality gates, security boundaries & integrity rules
├── start_aegis.py                   # Multi-service launcher & supervisor
│
├── backend/                         # FastAPI Gateway, Pipeline & Threat Intel
│   ├── app/
│   │   ├── main.py                  # Gateway app with request ID tracing middleware
│   │   ├── config.py                # Pydantic-settings configuration
│   │   ├── api/v1/                  # Modular v1 routers (/health, /ready, /scan, /events, /metrics, /policies)
│   │   ├── core/                    # Pipeline, DecisionEngine, TrustSource, Pydantic schemas
│   │   ├── layers/                  # Normalizer, Rules, Classifier, Context, ToolCall, LegacyTFIDF
│   │   ├── database.py              # SQLite threat storage with SHA-256 payload masking
│   │   ├── model_manager.py         # Legacy analysis orchestrator & perceptual blockhashes
│   │   └── schemas.py               # Pydantic v2 validation models
│   ├── tests/                       # Hermetic backend unit & integration tests (73 passing)
│   └── requirements.txt             # Gateway dependencies
│
├── extension/                       # Chrome Extension (Manifest V3 + TypeScript)
│   ├── src/                         # Content scripts, background worker, and popup
│   └── tests/                       # Vitest hermetic DOM & detector tests (37 passing)
│
├── dashboard/                       # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/components/              # Live Attack Studio, Docs & Reasoning, Threat Feed
│   └── package.json                 # Dashboard scripts & dependencies
│
├── ml/                              # Training, Evaluation & Dataset Pipeline
│   ├── data/                        # Dataset compilation, cleaning & split isolation
│   └── tests/                       # Data pipeline hermetic integrity tests
│
└── demo/                            # Standalone web defense SDK & live interactive demos
    ├── aegis-shield.js              # Drop-in client protection script (monkey-patches fetch)
    └── attack-simulator.html        # Attack scenarios test harness
```

---

## 3. Quickstart Guide

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* Google Chrome (optional, for browser extension)

### 1. One-Click Launcher
```bash
python start_aegis.py
```
This automatically verifies dependencies, starts the FastAPI Gateway on `http://127.0.0.1:8000`, launches the executive dashboard on `http://localhost:5173`, and opens the demonstration in your browser.

### 2. Manual Development Setup

#### Backend Gateway
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate            # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
* **API Documentation**: `http://localhost:8000/docs`
* **Readiness Probe**: `http://localhost:8000/ready`
* **V1 Scan Endpoint**: `POST http://localhost:8000/v1/scan`

#### Executive Dashboard
```bash
cd dashboard
npm install
npm run dev
```

#### Chrome Extension (Manifest V3)
```bash
cd extension
npm install
npm test          # Run Vitest unit & JSDOM tests (37 passing)
npm run build     # Compile content, background, and popup scripts via esbuild
```
**To load into Google Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `./extension` directory.

---

## 4. Testing & Verification Gates

Project AEGIS enforces strict, hermetic quality gates across all modules:

```bash
# 1. Run all checks via Makefile
make lint
make test

# 2. Or run individual tooling:
ruff check .
ruff format --check .
mypy backend
pytest backend/tests
npm --prefix extension test
npm --prefix dashboard run build
```

---

## 5. Security & Zero Data Exposure Guarantees

* **Zero Raw Data in Logs**: As mandated by [`AGENTS.md`](./AGENTS.md), all user prompt payloads, page fragments, and identifiers stored in `threats.db` are irreversibly hashed with salted SHA-256 or masked.
* **No Real Secrets Committed**: Authentication tokens, API keys, and environment-specific settings are restricted to `.env` (ignored by Git) and defined via [`.env.example`](./.env.example). Pre-commit hooks enforce `detect-secrets`.
* **Model & Dataset Isolation**: Raw datasets and heavy binary model checkpoints (`*.bin`, `*.pt`, `*.onnx`, `*.safetensors`, `*.pkl`) are strictly excluded from source control via [`.gitignore`](./.gitignore). Upstream datasets are verified against SHA-256 hashes in [`data/raw/MANIFEST.json`](./data/raw/MANIFEST.json).
* **Offline-First Architecture**: All inference, heuristics, perceptual hashes, and sanitization runs entirely locally on CPU / consumer GPU without leaking data to third-party cloud APIs.

---

## 6. License & Scholarly Citation

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

```bibtex
@software{project_aegis_2026,
  author = {Kavin Kumar},
  title = {Project AEGIS: AI Defense Gateway against Prompt Injection and Data Exfiltration},
  year = {2026},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\url{https://github.com/kavinkumar-77/ai-prompt-injection-firewall}}
}
```
