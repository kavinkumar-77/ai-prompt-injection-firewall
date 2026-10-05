---
name: Project Task
about: Standard engineering task template with quality gates
title: ''
labels: ''
assignees: ''
---

## 1. Goal
<!-- State the specific problem this task solves or capability it introduces -->

## 2. Technical Approach
<!-- Brief description of components, interfaces, or scripts to be added/modified -->

## 3. Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## 4. Definition of Done Checklist
- [ ] **Tests pass**: All unit tests pass hermetically (`pytest` / `npm test`).
- [ ] **Lint passes**: Code passes formatting and static analysis (`ruff check .`, `ruff format --check .`).
- [ ] **Docs updated**: Relevant specifications, threat models, or architecture records updated.
- [ ] **Experiment logged**: If ML-related, run configuration, random seed, metrics, and Git commit logged under `ml/experiments/`.
- [ ] **PR reviewed**: Branch pushed, PR opened with descriptive summary, and reviewed prior to merge.
