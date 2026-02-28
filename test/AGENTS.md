# test/

## Testing conventions

- Jest is the test runner.
- Prefer tests that do not require real AWS services or a real database.
- Mock DB clients and external calls; keep tests deterministic.
- Test linting guidance is provided in `test/unit/AGENTS.md` and `.windsurf/rules/40-test-linting-exceptions.md`
