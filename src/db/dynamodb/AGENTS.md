# src/db/dynamodb/

## Conventions

- Prefer `@aws-sdk/lib-dynamodb` (DocumentClient) for ergonomics.
- Keep table/partition-key assumptions explicit (do not scatter key names across many files).
- Avoid unbounded scans; prefer key-based queries where possible.
- Treat AWS client configuration as environment-driven.
