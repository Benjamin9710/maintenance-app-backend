# OpenAPI & testing expectations

## OpenAPI alignment

- The API contract is defined by `openapi/api.yaml`.
- When changing handler behavior, ensure `openapi/api.yaml` matches reality (and vice versa).
- Prefer backwards-compatible changes (additive fields/endpoints) where possible.

## Testing expectations

- Jest is the unit test runner.
- When changing behavior:
  - update existing tests to match the new behavior
  - add tests for new branches and new error cases
- Prefer deterministic unit tests:
  - mock DB calls and AWS SDK clients
  - avoid requiring real AWS resources or a real DB for unit tests

## Typical “must add tests” triggers

- New handler or new endpoint
- New validation rules
- New error mapping / new status code
- New DB query or changed query mapping
