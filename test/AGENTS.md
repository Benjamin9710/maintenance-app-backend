# test/

## Testing conventions

- Jest is the test runner.
- Prefer tests that do not require real AWS services or a real database.
- Mock DB clients and external calls; keep tests deterministic.
