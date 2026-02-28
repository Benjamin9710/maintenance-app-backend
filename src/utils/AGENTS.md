# Utils Directory Patterns

## Purpose

This directory contains utility modules that provide shared functionality across the application, including validation, error handling, audit logging, rate limiting, and response helpers.

## Module Responsibilities

### Error Handling (`errors.ts`, `databaseErrors.ts`)
- Define custom error types: ValidationError, ConflictError, NotFoundError, AuthenticationError, AuthorizationError
- Convert database errors to appropriate custom errors using `handleDatabaseError`
- Handle PostgreSQL error codes and constraint violations
- Never leak raw database errors to HTTP responses

### Validation (`validation.ts`, `timezoneValidation.ts`)
- Validate and normalize request bodies before processing
- Throw ValidationError with descriptive messages for invalid input
- Include format validation (email, phone, timezone, etc.)
- Trim and normalize data during validation
- Use specific validation functions for each request type

### Audit Logging (`auditLogger.ts`, `userAuditLogger.ts`)
- Log audit events immediately after successful operations
- Include userId, userPersona, resourceId, and timestamps
- Capture field-level changes for update operations
- Use structured logging with consistent field names
- Never log sensitive data or secrets

### Rate Limiting (`rateLimiter.ts`)
- Provide rate limiting middleware for API endpoints
- Use `withAdminRateLimit` for admin endpoints (50 req/min)
- Use `withGeneralRateLimit` for general endpoints (100 req/min)
- Add rate limit headers to responses
- Use client IP for identification, fallback to auth header

### Response Helpers (`responses.ts`)
- Provide standardized response builders: ok, badRequest, unauthorized, forbidden, notFound, conflict, internalError
- Never manually construct API Gateway response objects in handlers
- Maintain consistent response format across all endpoints
- Include appropriate HTTP status codes and headers

### Session Management (`sessionAuth.ts`, `sessionToken.ts`)
- Handle session validation and token parsing
- Provide role-based access control functions
- Validate JWT tokens and extract user information
- Support admin, manager, and contractor personas

### API Gateway Utilities (`apiGateway.ts`)
- Extract common values from API Gateway events
- Handle authorization header parsing
- Provide utilities for path parameters and query strings

## Usage Patterns

### In Handlers
```typescript
// 1. Import required utilities
import { validateCreatePropertyRequest } from '../utils/validation';
import { logPropertyCreated } from '../utils/auditLogger';
import { withAdminRateLimit } from '../utils/rateLimiter';
import { requireAdminSession } from '../utils/sessionAuth';
import { ValidationError, ConflictError } from '../utils/errors';
import { badRequest, conflict, ok } from '../utils/responses';

// 2. Apply rate limiting to handler
export const handler = withAdminRateLimit(handlerFunction);

// 3. Use validation, auth, and audit logging
const session = await requireAdminSession(authHeader);
const propertyData = validateCreatePropertyRequest(parsedBody);
const property = await createProperty(managerSub, propertyData);
logPropertyCreated(property, session.sub, 'admin');
```

### In Database Modules
```typescript
// Always wrap database operations with error handling
try {
  const result = await query(sql, params);
  return result;
} catch (error) {
  throw handleDatabaseError(error);
}
```

## Conventions

- Keep utility functions pure and side-effect free where possible
- Use consistent error types and messages across the application
- Provide clear JSDoc comments for all public functions
- Maintain backward compatibility when updating utility functions
- Test utility functions independently with comprehensive edge cases
