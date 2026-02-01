# src/db/

## Purpose

- Data access layer for Postgres and DynamoDB.

## Conventions

- Keep DB concerns here (queries, mapping, connection/client lifecycle).
- Use parameterized queries for Postgres.
- Do not log secrets or full records unnecessarily.
- Avoid performing HTTP-specific response mapping here; return domain/data objects and let handlers map to HTTP.
