# src/db/postgres/

## Conventions

- Use `pg` pooling (`Pool`) rather than creating per-request connections.
- Always use parameterized queries.
- If a change requires transactions, keep transaction boundaries explicit and testable.
- Keep SQL and mapping code readable and localized.
