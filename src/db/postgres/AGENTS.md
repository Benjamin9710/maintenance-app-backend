# src/db/postgres/

## Conventions

- Use `pg` pooling (`Pool`) rather than creating per-request connections.
- Always use parameterized queries.
- If a change requires transactions, keep transaction boundaries explicit and testable.
- Keep SQL and mapping code readable and localized.

## Error Handling

- Always wrap database operations with `handleDatabaseError`
- Test constraint violations and verify proper error mapping
- Never return raw database errors to calling code
- Use specific constraint names for better error messages

## Query Patterns

### INSERT Operations

```typescript
const sql = `
  INSERT INTO properties (id, owner_manager_sub, name, ...)
  VALUES ($1, $2, $3, ...)
  RETURNING *
`;

try {
  const result = await query(sql, [id, ownerManagerSub, name]);
  return result.rows[0];
} catch (error) {
  throw handleDatabaseError(error);
}
```

### UPDATE Operations

```typescript
const sql = `
  UPDATE properties 
  SET name = $1, address_line1 = $2, updated_at = NOW()
  WHERE id = $3 AND owner_manager_sub = $4
  RETURNING *
`;

try {
  const result = await query(sql, [name, addressLine1, id, ownerManagerSub]);
  return result.rows[0];
} catch (error) {
  throw handleDatabaseError(error);
}
```

### SELECT Operations

```typescript
const sql = `
  SELECT * FROM properties 
  WHERE owner_manager_sub = $1 AND archived_at IS NULL
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`;

try {
  const result = await query(sql, [ownerManagerSub, limit, offset]);
  return result.rows;
} catch (error) {
  throw handleDatabaseError(error);
}
```

## Transaction Patterns

```typescript
import { getClient } from "./client";

const client = getClient();
try {
  await client.query("BEGIN");

  // Multiple operations
  const result1 = await client.query(sql1, params1);
  const result2 = await client.query(sql2, params2);

  await client.query("COMMIT");
  return result1.rows[0];
} catch (error) {
  await client.query("ROLLBACK");
  throw handleDatabaseError(error);
}
```

## Testing

- Test with various input parameters including edge cases
- Verify constraint violations are properly handled
- Test transaction rollback behavior
- Mock database calls for unit tests
- Use integration tests for complex query logic
