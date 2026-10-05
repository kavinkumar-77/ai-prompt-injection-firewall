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
