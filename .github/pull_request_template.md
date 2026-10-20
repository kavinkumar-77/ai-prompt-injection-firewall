## Description
Describe your changes in detail.

## Motivation & Context
Why is this change required? What problem does it solve?

## Quality Gates Checklist
- [ ] My code follows the project's code style guidelines (`ruff check .`, `ruff format --check .`).
- [ ] Type checks pass without issues (`mypy backend aegis_client`).
- [ ] All unit and integration tests pass cleanly (`pytest backend/tests`).
- [ ] ReDoS resistance test passes (`pytest backend/tests/test_redos.py`).
- [ ] Dashboard builds cleanly (`cd dashboard && npm run build`).
- [ ] Zero raw user data rule respected (salted SHA-256 digests only).
- [ ] Documentation and `CHANGELOG.md` updated.
