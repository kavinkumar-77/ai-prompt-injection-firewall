# AI Prompt-Injection and Data-Leak Firewall

A multi-layered defense firewall designed to protect users of AI assistants, LLM-powered browsers, and autonomous web agents against indirect prompt injections and outbound data leaks.

---

## 1. Monorepo Structure

```text
├── .github/workflows/ci.yml    # Continuous Integration pipeline (Ruff + Pytest)
├── .env.example                # Environment configuration template
├── .gitignore                  # Git ignore rules for Python, Node, and build files
├── .pre-commit-config.yaml     # Pre-commit hook configuration
├── pyproject.toml              # Tooling configuration for Python (Ruff, Pytest)
├── README.md                   # Project overview & running instructions
├── AGENTS.md                   # Operational & safety rules for pair-programming
├── docs/
│   ├── SPEC.md                 # System architecture and API contracts
│   └── THREAT_MODEL.md         # Threat actors, attack vectors, and boundaries
├── backend/                    # FastAPI policy engine, classifiers, audit logger
│   ├── app/                    # Application source code
│   ├── tests/                  # Automated pytest suite
│   └── requirements.txt        # Backend dependencies
├── ml/                         # Research roadmap and model weights (user-led)
├── extension/                  # Chrome Extension (Manifest V3 + TypeScript)
│   ├── src/                    # Content scripts and popup UI
│   └── manifest.json           # MV3 extension manifest
└── dashboard/                  # React + Tailwind CSS monitoring interface
    └── src/                    # Dashboard UI components
```

---

## 2. Quickstart & Local Execution

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Google Chrome or Chromium-based browser

### Backend (FastAPI)
```bash
# 1. Create and activate a virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Run automated tests
pytest

# 4. Start the development server
uvicorn backend.app.main:app --reload --port 8000
```
The interactive API documentation will be available at `http://localhost:8000/docs`.

### Chrome Extension (MV3 + TypeScript)
```bash
cd extension
npm install
npm run build
```
To load into Chrome:
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in upper-right corner).
3. Click **Load unpacked** and select the `c:/finalYearProject/extension` directory.

### Dashboard (React + Tailwind)
```bash
cd dashboard
npm install
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

---

## 3. Git Branching Strategy

To maintain a clean and reliable codebase, follow this branching convention:

- `main`: Production-ready, stable releases. All merges to `main` must pass CI and linting.
- `develop`: Primary integration branch for active development.
- `feat/<module>-<description>`: Feature additions (e.g., `feat/backend-redaction`, `feat/ext-css-detector`).
- `fix/<module>-<description>`: Bug fixes (e.g., `fix/unicode-tag-parsing`).
- `docs/<description>`: Documentation changes (e.g., `docs/threat-model-update`).
- `experiment/<description>`: ML experiments and dataset benchmarks.

### Commit Message Convention
Follow Conventional Commits:
- `feat: add regex-based PII redaction pipeline`
- `fix: handle zero-width joiner sequences in token filter`
- `test: add unit tests for check-action policy endpoint`
- `docs: update API contracts for scan-page`
