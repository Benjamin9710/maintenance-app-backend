# Backend architecture & boundaries

## Layering

- Lambda/API entrypoints live under `src/handlers/`.
- Data access lives under `src/db/`.
- Environment/config parsing is centralized under `src/config/` (especially `env.ts`).

## Design rules

- Keep handlers thin:
  - parse/validate inputs
  - call lower-level modules
  - map results/errors to HTTP responses
- Handler response construction conventions live in `src/handlers/AGENTS.md`.
- Keep DB logic out of handlers; delegate to `src/db/**`.
- Avoid tight coupling between DB layer and HTTP concerns:
  - DB layer returns data/domain objects or typed results
  - handlers map to HTTP status codes and response bodies

## Error handling

- Prefer explicit, typed errors and clear messages.
- Do not leak secrets or sensitive data in logs or error responses.
