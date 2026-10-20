# Changelog

All notable changes to Project AEGIS will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
