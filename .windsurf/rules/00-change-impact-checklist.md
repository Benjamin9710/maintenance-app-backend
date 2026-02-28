---
trigger: model_decision
description: Only relevant when making changes. Model can activate when modifications are detected.
---

# Change Impact Checklist

Use this checklist whenever making changes.

## Docs & rules impact

- Determine whether the changes being made are worthy of `README.md` changes.
- Determine whether the changes being made are worthy of `AGENTS.md` changes or new `AGENTS.md` files.
- Determine whether the changes being made are worthy of Windsurf rules changes or new Windsurf rules files.
- Determine whether the changes being made are worthy of adjusting tests or creating new tests.

## Contract impact

- If you changed any HTTP request/response shape, status codes, path params, query params, headers, or error payloads:
  - Update `openapi/api.yaml`.
  - Update/add unit tests covering success + failure cases.

## Safety & scope

- Keep changes minimal and scoped; avoid unrelated refactors.
- Do not add new dependencies unless necessary.
- Never hardcode secrets; prefer environment variables and `src/config/env.ts`.

## Suggested local verification (when relevant)

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run sam:start` (API integration smoke test)
