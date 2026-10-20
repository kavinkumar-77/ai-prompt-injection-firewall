# Contributing to Project AEGIS

Thank you for your interest in contributing to Project AEGIS!

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

```bash
# 1. Clone repository
git clone https://github.com/kavinkumar-77/ai-prompt-injection-firewall.git
cd ai-prompt-injection-firewall

# 2. Set up Python environment
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -e aegis_client

# 3. Set up Dashboard
cd dashboard && npm install && cd ..
```

## Quality Gates

Before submitting a Pull Request, ensure all quality gates pass:

```bash
# 1. Linting & Formatting
ruff check .
ruff format --check .

# 2. Type Checking
mypy backend aegis_client

# 3. Unit & Integration Tests (100% hermetic, zero network calls)
pytest backend/tests

# 4. ReDoS & Pathological Fuzzing Test
pytest backend/tests/test_redos.py

# 5. Dashboard Build
cd dashboard && npm run build && cd ..
```

## Non-Negotiable Engineering Rules

1. **Honesty:** No marketing claims without an empirical measurement. Every number cited in documentation must come from JSON results files in `ml/reports/`, `lab/reports/`, or `redteam/reports/`.
2. **Zero Raw User Data:** Prompts, pages, and identifiers must be salted and SHA-256 hashed before storage.
3. **Hermetic Tests:** Automated unit tests must never touch external network hosts or download assets.
4. **No Binaries in Git:** Model weights and datasets are gitignored.
5. **Conventional Commits:** Use `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `refactor:`, `chore:`.
