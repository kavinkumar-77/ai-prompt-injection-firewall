# Agent Collaboration Guidelines

These guidelines define operational, architectural, and security boundaries when working on the **AI Defense Gateway against Prompt Injection** project.
See `docs/PLAN.md` for the full Project AEGIS Production-Grade Upgrade Plan.

## Core Non-Negotiable Rules (from docs/PLAN.md §1)

1. **Honesty:** No marketing claims without a measurement. Heuristics are called heuristics. Remove or rename anything that "simulates" a technique (e.g. the attention-shift probe is a lexical divergence heuristic, not model attention).
2. **No Raw User Data in Logs or DB:** Prompts, pages and identifiers are SHA-256 hashed or masked before storage.
3. **Offline-First / Hermetic Tests:** Tests must never touch the network or require model downloads. Use tiny fixtures and test doubles. Real-model tests are marked `@pytest.mark.model` and skipped by default in CI.
4. **Resilient Asset Management:** Network is unreliable on dev machine. All downloads go through `scripts/fetch_assets.py` with backoff retries, support for `AEGIS_ASSET_DIR`, and SHA-256 verification against manifests. Nothing else downloads assets directly.
5. **Hardware Budget:** 16 GB RAM, RTX 4050 6 GB VRAM, Windows 11 primary, Linux/macOS cross-compatible. Training must fit in 6 GB VRAM (fp16, small batch), inference on CPU.
6. **No Secrets in Git:** `.env` ignored, `.env.example` complete. Pre-commit includes secret scanning.
7. **No Binaries in Git:** Model weights and datasets are gitignored and fetched/built by scripts. Only manifests, configs, and small test fixtures are committed.
8. **Typed and Linted:** `ruff` (lint + format), `mypy` on `backend/` and `aegis_client/`, `tsc --noEmit` on TypeScript packages. All must pass in CI.
9. **Every Phase Ends Green:** Lint, type-check, tests, builds. If a gate cannot pass, stop and report instead of disabling it.
10. **Conventional Commits:** (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `refactor:`, `chore:`), small focused commits, one phase at a time. Never use `git push --force`, `--amend`, or `git add .`.

## Integrity and Quality Gates

1. Never label generated or hand-written data with the name of a real dataset. Rows whose source is a real dataset must come from files in `data/raw/` recorded in `data/raw/MANIFEST.json` (with sha256). Generated data must use a source name starting with "synthetic_" and be described as synthetic.
2. Never hardcode metrics or results in code or docs. Every number in docs or reports must be produced by scripts that write results JSONs, and docs must be generated from those files.
3. Never weaken, skip or delete a test to make it pass. If a test is wrong, explain why and report.
4. Never use git push --force, --amend or `git add .`. Add named files and run `git status` before each commit. If a network call fails twice, stop and report instead of retrying or switching approach.
5. Anything not fully implemented must be named `placeholder_*` and listed in `docs/STATUS.md`. Keep `docs/STATUS.md` updated after every task.
6. Before declaring a task done: run ruff and pytest, plus the audit scripts that apply, and paste a short summary.
7. Do not write throwaway regex-patch scripts; edit files directly.
8. Execute strictly **one phase at a time** as outlined in `docs/PLAN.md`. Stop and report after completing each phase.
