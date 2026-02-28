---
trigger: model_decision
description: Complex implementation patters. Only relevant when working on handlers, database, or utils. Models can determine when pattern guidance is needed.
---

# Backend Implementation Patterns

This rule documents the correct usage patterns for database errors, SQL implementation, validation, audit logging, rate limiting, and handler patterns in the maintenance-app-backend.

## Database Error Handling

### Location

- File: `src/utils/databaseErrors.ts`
- Usage: Import `handleDatabaseError` in database modules

### Pattern

```typescript
import { handleDatabaseError } from "../../utils/databaseErrors";

// In database modules, always wrap database operations
try {
  const result = await query(sql, params);
  return result;
} catch (error) {
  throw handleDatabaseError(error);
}
```

### Key Points

- Always use `handleDatabaseError()` to convert database errors to appropriate custom errors
- PostgreSQL error codes are handled automatically (UNIQUE_VIOLATION, NOT_NULL_VIOLATION, etc.)
- Custom constraint names provide specific error messages
- Never leak raw database errors to HTTP responses

## SQL Implementation

### Location

- Directory: `src/db/postgres/`
- Client: `src/db/postgres/client.ts`

### Pattern

```typescript
import { query } from "./client";
import { handleDatabaseError } from "../../utils/databaseErrors";

// Always use parameterized queries
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

### Key Points

- Always use parameterized queries with `$1, $2, ...` syntax
- Use `RETURNING *` for INSERT/UPDATE to get complete records
- Keep SQL queries readable and localized in repository functions
- Use transactions for multi-step operations with explicit boundaries

## Validation Patterns

### Location

- File: `src/utils/validation.ts`
- Error: `src/utils/errors.ts` (ValidationError)

### Pattern

```typescript
import { validateCreatePropertyRequest } from "../utils/validation";
import { ValidationError } from "../utils/errors";

// In handlers, validate before processing
const propertyData = validateCreatePropertyRequest(parsedBody);

// Validation functions should:
// 1. Check body is object and not null
// 2. Validate required fields exist and are correct type
// 3. Validate formats (email, phone, etc.)
// 4. Validate lengths and constraints
// 5. Trim and normalize data
// 6. Throw ValidationError with descriptive messages
```

### Key Points

- Always validate input before processing in handlers
- Use specific validation functions for each request type
- Throw ValidationError with clear, user-friendly messages
- Normalize data (trim, lowercase) during validation
- Validate optional fields only if provided

## Audit Logging

### Location

- File: `src/utils/auditLogger.ts`
- Functions: `logPropertyCreated`, `logPropertyUpdated`, `logPropertyArchived`, `logPropertyRead`

### Pattern

```typescript
import { logPropertyCreated } from "../utils/auditLogger";

// After successful operations, log audit events
const property = await createProperty(managerSub, propertyData);
logPropertyCreated(property, session.sub, "admin");

// For updates, capture changes
logPropertyUpdated(oldProperty, newProperty, session.sub, "admin");
```

### Key Points

- Log audit events immediately after successful operations
- Include userId, userPersona, and resourceId in all audit entries
- For updates, capture field-level changes with from/to values
- Use structured logging with consistent field names
- Never log sensitive data or secrets

## Rate Limiting

### Location

- File: `src/utils/rateLimiter.ts`
- Middleware: `withAdminRateLimit`, `withGeneralRateLimit`

### Pattern

```typescript
import { withAdminRateLimit } from "../utils/rateLimiter";

// Wrap handlers with rate limiting middleware
export const handler = withAdminRateLimit(createPropertyHandler);

// For general endpoints:
export const handler = withGeneralRateLimit(handlerFunction);
```

### Key Points

- Always wrap admin endpoints with `withAdminRateLimit`
- Use `withGeneralRateLimit` for non-admin endpoints
- Rate limiting adds appropriate headers to responses
- Client identification uses IP address first, then auth header
- In-memory storage is for development only (use Redis in production)

## Handler Patterns with Validation, Audit, Rate Limit

### Complete Handler Pattern

```typescript
import { withAdminRateLimit } from "../utils/rateLimiter";
import { validateCreatePropertyRequest } from "../utils/validation";
import { logPropertyCreated } from "../utils/auditLogger";
import { requireAdminSession } from "../utils/sessionAuth";
import { ValidationError, ConflictError } from "../utils/errors";
import { badRequest, conflict, ok } from "../utils/responses";

const handlerFunction = async (event) => {
  try {
    // 1. Authentication
    const authHeader = getAuthorizationHeader(event);
    const session = await requireAdminSession(authHeader);

    // 2. Input validation
    if (!event.body) return badRequest("Missing request body");
    const parsedBody = JSON.parse(event.body);
    const propertyData = validateCreatePropertyRequest(parsedBody);

    // 3. Business logic
    const property = await createProperty(managerSub, propertyData);

    // 4. Audit logging
    logPropertyCreated(property, session.sub, "admin");

    // 5. Success response
    return ok(property);
  } catch (error) {
    // 6. Error handling
    if (error instanceof ValidationError) {
      return badRequest(error.message);
    }
    if (error instanceof ConflictError) {
      return conflict(error.message);
    }
    // ... other error types
    return internalError("Operation failed");
  }
};

export const handler = withAdminRateLimit(handlerFunction);
```

### Handler Error Handling Order

1. **ValidationError** → 400 Bad Request
2. **ConflictError** → 409 Conflict
3. **AuthenticationError** → 400 Bad Request
4. **AuthorizationError** → 403 Forbidden
5. **NotFoundError** → 404 Not Found
6. **Other errors** → 500 Internal Server Error

### Key Points

- Follow the 6-step pattern: Auth → Validate → Process → Audit → Respond → Handle Errors
- Always wrap handlers with appropriate rate limiting
- Use specific error types for different failure scenarios
- Log audit events only after successful operations
- Never leak internal error details in HTTP responses

## Testing Patterns

### Unit Tests for Handlers

- Mock database calls and verify error handling
- Test validation with both valid and invalid inputs
- Verify audit logging is called with correct parameters
- Test rate limiting behavior separately
- Verify HTTP status codes and response bodies

### Database Tests

- Test constraint violations and error mapping
- Verify parameterized queries work correctly
- Test transaction behavior for multi-step operations
- Mock external dependencies in unit tests
