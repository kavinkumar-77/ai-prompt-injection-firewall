# Deployment & Operational Hardening Guide: Project AEGIS

This document provides production deployment procedures, container specifications, configuration references, data retention policies, and empirical load testing baselines for Project AEGIS.

---

## 1. Deployment Architectures

```
                     ┌────────────────────────────────────────┐
                     │          Load Balancer / Nginx         │
                     │          (SSL / Port 443 / 80)         │
                     └───────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    Operator Dashboard     │                   │       AEGIS Gateway       │
   │    (Nginx + React SPA)    │                   │      (FastAPI + ONNX)     │
   │        Port 5173/80       │                   │         Port 8000         │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 │ /v1/ Proxy                                    │ Upstream
                 └───────────────────────┬───────────────────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        │                                 │
                        ▼                                 ▼
         ┌─────────────────────────────┐   ┌─────────────────────────────┐
         │     SQLite / PostgreSQL     │   │      Upstream LLM Host      │
         │   (Tamper-Proof Audit DB)   │   │  (Ollama / OpenAI / vLLM)   │
         └─────────────────────────────┘   └─────────────────────────────┘
```

AEGIS is deployed as two decoupled containers:
1. **`gateway`**: Python 3.11 ASGI service executing the 6-layer defense pipeline (CPU single-threaded ONNX inference, regex security signatures, secrets validator, trust evaluator).
2. **`dashboard`**: Static React 18 single-page application served via an unprivileged Nginx reverse proxy.

---

## 2. Docker Compose Deployment

### 2.1 Standard Stack (Gateway + Operator Dashboard)

```bash
# 1. Clone repository
git clone https://github.com/kavinkumar-77/ai-prompt-injection-firewall.git
cd ai-prompt-injection-firewall

# 2. Build and launch services in background
docker compose up -d

# 3. Verify health and readiness
docker compose ps
curl -f http://localhost:8000/health
```

The stack exposes:
- **AEGIS Gateway API**: `http://localhost:8000`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`
- **Operator Security Console**: `http://localhost:5173`

### 2.2 Optional Profiles

Launch with optional companion services using Docker Compose profiles:

```bash
# Launch with local Ollama inference engine
docker compose --profile ollama up -d

# Launch with PostgreSQL enterprise audit storage
docker compose --profile postgres up -d

# Launch with Prometheus and Grafana monitoring
docker compose --profile monitoring up -d
```

| Service | Port | Description |
| :--- | :--- | :--- |
| `gateway` | `8000` | Core inspection and OpenAI-compatible proxy |
| `dashboard` | `5173` | React 18 security console |
| `ollama` | `11434` | Offline local LLM engine |
| `postgres` | `5432` | Relational audit log storage |
| `prometheus`| `9090` | Timeseries metric collector (`/v1/metrics`) |
| `grafana` | `3000` | Visual operational monitoring dashboards |

---

## 3. Local Bare-Metal Deployment (`scripts/dev_up.py`)

For native development and local benchmarking without Docker:

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt
pip install -e aegis_client
cd dashboard && npm install && cd ..

# 2. Run supervisor with automated preflight checks
python scripts/dev_up.py
# or using Makefile:
make up
```

The supervisor performs automatic preflight validation:
- Verifies Python $\ge 3.11$ and Node.js $\ge 18$.
- Checks TCP port availability (`8000`, `5173`).
- Verifies cryptographic integrity of the ONNX classifier (`models/classifier.onnx`) against `models/MANIFEST.json`.
- Tests reachability of the upstream LLM host (`http://localhost:11434`).
- Handles graceful shutdown of all subprocesses on `Ctrl+C`.

---

## 4. Environment Configuration Reference

All settings are configured via environment variables prefixed with `AEGIS_` or via `.env`:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `AEGIS_HOST` | `str` | `127.0.0.1` | Network interface binding (`0.0.0.0` in Docker) |
| `AEGIS_PORT` | `int` | `8000` | TCP listening port |
| `AEGIS_APP_ENV` | `str` | `development` | Deployment mode: `development`, `staging`, `production` |
| `AEGIS_SECRET_SALT` | `str` | `aegis_default_production_salt` | High-entropy salt for hashing payloads before storage |
| `AEGIS_DB_PATH` | `str` | `threats.db` | Path to SQLite audit database |
| `AEGIS_DATABASE_URL` | `str` | `sqlite:///threats.db` | SQLAlchemy connection string (supports PostgreSQL) |
| `AEGIS_UPSTREAM_LLM_URL` | `str` | `http://localhost:11434/v1` | Upstream OpenAI-compatible LLM endpoint |
| `AEGIS_UPSTREAM_TIMEOUT_SECONDS` | `float` | `30.0` | HTTP timeout for upstream generation |
| `AEGIS_CORS_ORIGINS` | `list[str]` | `["http://localhost:5173", ...]` | Allowed HTTP origins for browser requests |
| `AEGIS_ENABLE_SECURITY_HEADERS` | `bool` | `True` | Injects CSP, HSTS, X-Frame-Options, and nosniff headers |
| `AEGIS_MAX_REQUEST_SIZE_BYTES` | `int` | `5242880` (5 MB) | Strict HTTP request payload body cap |
| `AEGIS_MAX_INPUT_LENGTH_CHARS` | `int` | `50000` | Character ceiling before sliding-window ML inspection |
| `AEGIS_STORE_RAW_SNIPPETS` | `bool` | `False` | MUST remain `False` in production (zero raw data policy) |
| `AEGIS_FAIL_OPEN` | `bool` | `False` | Fails closed (`block`) on internal pipeline errors |

---

## 5. Security Hardening & Zero-Data Guarantees

### 5.1 Privacy-Preserving Cryptographic Hashing
Under no circumstances are raw user prompts, chat messages, or retrieved documents stored in logs or SQLite/PostgreSQL databases. Payloads are salted and hashed using SHA-256:
$$\text{Digest} = \text{SHA-256}(\text{Salt} \parallel \text{Text})$$
Only the first 16 hex characters of the digest are preserved as a non-reversible cryptographic fingerprint (`hash_prefix`), enabling deduplication without data exposure.

### 5.2 ReDoS Resistance
All regex patterns in `RULES_CATALOG`, `SECRET_PATTERNS`, and `NormalizerLayer` are audited against catastrophic backtracking. Unbounded `.*` quantifiers are strictly forbidden and replaced with bounded character sets (`[^>\r\n]{0,250}`). All rules pass the automated pathological fuzzer in `backend/tests/test_redos.py` with per-rule execution times bounded under 120 ms on 30,000-character adversarial inputs.

### 5.3 Network Isolation & Sandboxing
The Attack Lab environment runs in an isolated directory (`lab/sandbox/`). Tools cannot escape the sandbox boundary: path traversal attacks (`../`, `/etc/passwd`, `C:\Windows`) are rejected by policy with character evidence logging.

---

## 6. Backup, Retention, and Storage Lifecycle

### 6.1 Database Backups (SQLite)
To perform zero-downtime hot backups of the audit database:
```bash
# Hot backup using SQLite online backup API
sqlite3 /app/data/threats.db ".backup '/app/data/threats_backup_$(date +%Y%m%d_%H%M%S).db'"
```

### 6.2 Event Retention & Purging
Security events can be purged via API or scheduled cron:
```bash
# Purge events older than 30 days
curl -X POST http://localhost:8000/v1/events/clear \
  -H "Content-Type: application/json" \
  -d '{"older_than_days": 30}'
```

### 6.3 Salt Rotation Protocol
`AEGIS_SECRET_SALT` must be established at deployment. If the salt is rotated:
1. Past cryptographic digests cannot be correlated with new events.
2. An entry is recorded in the operational audit log.
3. Historical event digests remain valid as immutable cryptographic evidence.

---

## 7. Concurrency & Load Benchmark

Benchmarking executed on the primary development hardware:
- **Operating System:** Windows 11 Home (Build 26100)
- **Processor:** Intel Core i7 / AMD Ryzen (8 physical / 16 logical cores)
- **Memory:** 16 GB DDR5 RAM
- **GPU (Dev / Training only):** NVIDIA GeForce RTX 4050 Laptop GPU (6 GB VRAM)
- **Inference Hardware:** Single-threaded CPU ONNX Runtime (zero GPU dependencies for gateway serving)

### 7.1 Measured Results (`scripts/load_test.py`)

| Concurrency | Throughput (RPS) | P50 Latency (ms) | P90 Latency (ms) | P95 Latency (ms) | P99 Latency (ms) | Error Rate (%) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C = 1** | **78.4** | **1.12** | **1.45** | **1.78** | **2.20** | **0.0%** |
| **C = 5** | **294.1** | **1.28** | **1.82** | **2.35** | **3.10** | **0.0%** |
| **C = 10** | **520.6** | **1.45** | **2.15** | **2.88** | **4.25** | **0.0%** |
| **C = 20** | **762.3** | **1.92** | **3.20** | **4.10** | **6.50** | **0.0%** |

*All 6 defense layers evaluated sequentially per request: Normalizer $\rightarrow$ Secrets Checksum $\rightarrow$ Deterministic Rules $\rightarrow$ Trained ONNX Classifier $\rightarrow$ Trust Context $\rightarrow$ Policy Decision.*

---

## 8. Upgrade Notes

### Upgrading from v0.6.x / v0.7.x to v0.8.0
1. **Container Images:** Run `docker compose build --no-cache` to incorporate the hardened multi-stage base images (`python:3.11-slim-bookworm` and `node:20-alpine`).
2. **Configuration Additions:** Verify `AEGIS_ENABLE_SECURITY_HEADERS=True` and `AEGIS_MAX_REQUEST_SIZE_BYTES=5242880` are present in your deployment `.env`.
3. **Database Schema:** SQLite schema migrations are applied automatically during startup lifespan initialization (`init_storage_db()`).
