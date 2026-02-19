# src/handlers/

## Purpose

- This directory contains Lambda/API handler entrypoints.

## Handler design

- Keep handlers thin: parse/validate input, call lower-level modules, map result to HTTP response.
- Avoid embedding SQL/Dynamo logic directly in handlers; delegate to `src/db/` modules.
- Return appropriate HTTP status codes and stable response shapes.
- Use the shared response helpers in `src/utils/responses.ts` for all handler returns (e.g. `ok`, `badRequest`, `unauthorized`, `forbidden`, `internalError`).
- Do not manually construct API Gateway response objects in handlers (no inline `{ statusCode, headers, body }`).
- Do not define per-handler copies of response helpers (e.g. `internalError`) inside handler files.

## Testing

- Prefer unit tests for handler behavior (status codes, response body, error mapping) with DB calls mocked.
