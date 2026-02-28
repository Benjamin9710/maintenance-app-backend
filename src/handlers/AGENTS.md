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

## Standard Handler Pattern

All handlers should follow this 6-step pattern:

1. **Authentication**: Validate session using `requireAdminSession`, `requireManagerSession`, etc.
2. **Input Validation**: Parse and validate request body using validation functions
3. **Business Logic**: Call appropriate service/database functions
4. **Audit Logging**: Log successful operations using audit logger functions
5. **Success Response**: Return appropriate response using response helpers
6. **Error Handling**: Catch and map errors to appropriate HTTP responses

### Example Handler Structure

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

## Error Handling Order

Handle errors in this specific order for consistency:

1. **ValidationError** → 400 Bad Request
2. **ConflictError** → 409 Conflict
3. **AuthenticationError** → 400 Bad Request
4. **AuthorizationError** → 403 Forbidden
5. **NotFoundError** → 404 Not Found
6. **Other errors** → 500 Internal Server Error

## Rate Limiting

- Always wrap admin endpoints with `withAdminRateLimit`
- Use `withGeneralRateLimit` for non-admin endpoints
- Apply rate limiting as the outermost wrapper around the handler function

## Testing

- Prefer unit tests for handler behavior (status codes, response body, error mapping) with DB calls mocked.
- Test validation with both valid and invalid inputs
- Verify audit logging is called with correct parameters
- Test rate limiting behavior separately
- Verify HTTP status codes and response bodies
