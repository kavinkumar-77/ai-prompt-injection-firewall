# Agent Collaboration Guidelines

These guidelines define operational, architectural, and security boundaries when working on the **AI Defense Gateway against Prompt Injection** project.

## Core Rules

1. **Zero Data Exposure in Logs**:
   - Never log raw user input text, page content payloads, or real personal data.
   - Always hash, mask, or tokenize identifiers in log messages and debugging output.

2. **No Real Secrets in the Repository**:
   - Never commit API keys, tokens, passwords, or production credentials.
   - Use `.env.example` to define configuration schema, and read values from local `.env` or system environment variables.

3. **Hermetic Unit Tests**:
   - No external network calls in unit tests.
   - Mock all HTTP clients, remote model inference calls, and external services using test fixtures.

4. **Quality Gates & Verification**:
   - Every new feature or endpoint must include automated test coverage.
   - Always run `ruff check .` and `pytest` locally and ensure they pass cleanly before concluding any task.

5. **Iterative Cadence & Review**:
   - Work on one small, focused task at a time.
   - Present concise diffs and clear summaries for review before proceeding to subsequent tasks.
   - Keep agent prompts, explanations, and diffs small and focused.

6. **Machine Learning Development Boundary**:
   - Do **NOT** implement ML training or evaluation code unless the user explicitly requests it.
   - Model training, dataset preparation, and metric evaluations are led by the project author. Focus agent contributions on infrastructure, inference wrappers, schemas, and serving integration.

7. **Config-Driven Experiments & Reproducibility**:
   - All machine learning runs, augmentations, and evaluation pipelines must be strictly configuration-driven (YAML/JSON) with explicit, fixed random seeds (`random_seed: 42`).

8. **Strict Train/Val/Test Separation**:
   - Never train or tune hyperparameters on the test split.
   - Evaluation splits must remain strictly unseen, isolated by attack family and time to test true out-of-distribution generalization.

9. **Experiment Tracking**:
   - Log every experiment run (configuration snapshot, metric results, evaluation timestamps, and Git commit hash) to a local structured file under `ml/experiments/` (e.g., `ml/experiments/runs.jsonl`).

10. **Dataset and Model Weight Isolation**:
    - Raw datasets, annotated corpuses, and model weight checkpoints (`*.bin`, `*.pt`, `*.onnx`, `*.safetensors`, `*.pkl`) must stay out of Git.
    - Ensure `.gitignore` rules prevent accidental commits of large binary files or datasets.

## Integrity and quality gates

1. Never label generated or hand-written data with the name of a real dataset. Rows whose source is a real dataset must come from files in data/raw/ recorded in data/raw/MANIFEST.json (with sha256). Generated data must use a source name starting with "synthetic_" and be described as synthetic.
2. Never hardcode metrics or results in code or docs. Every number in docs or reports must be produced by a script in ml/eval/ that writes results/*.json, and docs must be generated from those files.
3. Never weaken, skip or delete a test to make it pass. If a test is wrong, explain why and ask me.
4. Never use git push --force, --amend or `git add .`. Add named files and run `git status` before each commit. If a network call fails twice, stop and report instead of retrying or switching approach.
5. Anything not fully implemented must be named placeholder_* and listed in docs/STATUS.md. Keep docs/STATUS.md updated after every task: what works, what is a placeholder, what is missing, what is measured. Be honest.
6. Before declaring a task done: run ruff and pytest, plus the audit scripts that apply, and paste a short summary.
7. Add a test that no record with a real-dataset source name exists without a matching entry in the manifest.
8. Do not write throwaway regex-patch scripts; edit files directly.
