# src/db/

## Purpose

- Data access layer for Postgres and DynamoDB.

## Conventions

- Keep DB concerns here (queries, mapping, connection/client lifecycle).
- Use parameterized queries for Postgres.
- Do not log secrets or full records unnecessarily.
- Avoid performing HTTP-specific response mapping here; return domain/data objects and let handlers map to HTTP.

## Database Error Handling

- Always wrap database operations in try/catch blocks
- Use `handleDatabaseError` from `src/utils/databaseErrors.ts` to convert database errors
- Never leak raw database errors to handlers or HTTP responses
- Test constraint violations and error mapping in unit tests

### Pattern

```typescript
import { handleDatabaseError } from "../../utils/databaseErrors";

try {
  const result = await query(sql, params);
  return result.rows[0];
} catch (error) {
  throw handleDatabaseError(error);
}
```

## SQL Implementation

- Use parameterized queries with `$1, $2, ...` syntax
- Use `RETURNING *` for INSERT/UPDATE operations to get complete records
- Keep SQL queries readable and localized in repository functions
- Use transactions for multi-step operations with explicit boundaries
- Test SQL queries with various input parameters

### Pattern

```typescript
const sql = `
  INSERT INTO properties (id, owner_manager_sub, name, ...)
  VALUES ($1, $2, $3, ...)
  RETURNING *
`;

const result = await query(sql, [id, ownerManagerSub, name]);
```
