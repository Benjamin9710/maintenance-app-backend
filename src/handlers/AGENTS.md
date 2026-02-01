# src/handlers/

## Purpose

- This directory contains Lambda/API handler entrypoints.

## Handler design

- Keep handlers thin: parse/validate input, call lower-level modules, map result to HTTP response.
- Avoid embedding SQL/Dynamo logic directly in handlers; delegate to `src/db/` modules.
- Return appropriate HTTP status codes and stable response shapes.

## Testing

- Prefer unit tests for handler behavior (status codes, response body, error mapping) with DB calls mocked.
