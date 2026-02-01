# openapi/

## Purpose

- OpenAPI contract lives here (`api.yaml`).

## Conventions

- Keep the spec in sync with handler behavior.
- Prefer backwards-compatible changes (additive fields/endpoints) when possible.
- When changing request/response shapes, ensure tests and handlers are updated together.
