# Repository guidance (maintenance-app-backend)

## Tech & entrypoints

- TypeScript backend intended to run via AWS SAM (`template.yaml`).
- Lambda/API entrypoints live under `src/handlers/`.
- Config is centralized under `src/config/`.
- Data access lives under `src/db/`.
- API contract lives under `openapi/api.yaml`.

## Preferred workflows

- Use `npm run build` before committing TypeScript changes.
- Use `npm test` for Jest.
- Use `npm run lint` for ESLint.
- Use `npm run sam:start` to run the API locally.

## Change discipline

- Keep changes minimal and scoped; avoid unrelated refactors.
- Do not add new dependencies unless necessary.
- Never hardcode secrets; use environment variables and `src/config/env.ts`.
- When changing an HTTP contract, update `openapi/api.yaml` and tests.
