---
description: Backend pattern compliance checklist
---

# Backend Pattern Compliance Checklist

Use this workflow to verify that new backend code follows the established patterns for database errors, SQL implementation, validation, audit logging, rate limiting, and handler structure.

## Pre-Implementation Checklist

### Database Operations
- [ ] Database functions are in `src/db/` directory, not handlers
- [ ] Using parameterized queries with `$1, $2, ...` syntax
- [ ] All database operations wrapped in try/catch with `handleDatabaseError`
- [ ] SQL queries are readable and localized in repository functions
- [ ] Using `RETURNING *` for INSERT/UPDATE operations

### Validation
- [ ] Input validation happens before any processing
- [ ] Using appropriate validation function from `src/utils/validation.ts`
- [ ] Validation throws `ValidationError` with descriptive messages
- [ ] Data is normalized (trimmed, lowercase) during validation
- [ ] Required fields are checked for existence and type

### Error Handling
- [ ] Custom error types used: ValidationError, ConflictError, NotFoundError, etc.
- [ ] Database errors converted using `handleDatabaseError`
- [ ] Error messages are user-friendly and don't leak internals
- [ ] HTTP status codes mapped correctly to error types

### Audit Logging
- [ ] Audit logging happens immediately after successful operations
- [ ] Using appropriate audit function: `logPropertyCreated`, `logPropertyUpdated`, etc.
- [ ] Audit includes userId, userPersona, and resourceId
- [ ] For updates, field-level changes are captured with from/to values
- [ ] No sensitive data logged in audit entries

### Rate Limiting
- [ ] Admin endpoints wrapped with `withAdminRateLimit`
- [ ] General endpoints wrapped with `withGeneralRateLimit`
- [ ] Rate limiting applied as outermost wrapper
- [ ] Rate limit headers will be automatically added

## Handler Structure Checklist

### Standard 6-Step Pattern
- [ ] **Authentication**: Using `requireAdminSession`, `requireManagerSession`, etc.
- [ ] **Input Validation**: Parsing and validating request body
- [ ] **Business Logic**: Calling appropriate service/database functions
- [ ] **Audit Logging**: Logging successful operations
- [ ] **Success Response**: Using response helpers (`ok`, `badRequest`, etc.)
- [ ] **Error Handling**: Proper error mapping in catch block

### Error Handling Order
- [ ] ValidationError → 400 Bad Request
- [ ] ConflictError → 409 Conflict
- [ ] AuthenticationError → 400 Bad Request
- [ ] AuthorizationError → 403 Forbidden
- [ ] NotFoundError → 404 Not Found
- [ ] Other errors → 500 Internal Server Error

### Response Patterns
- [ ] Using response helpers from `src/utils/responses.ts`
- [ ] No manual API Gateway response construction
- [ ] Consistent response format across endpoints
- [ ] Appropriate HTTP status codes

## Testing Checklist

### Unit Tests
- [ ] Handler behavior tested with mocked DB calls
- [ ] Validation tested with valid and invalid inputs
- [ ] Error mapping tested for all error types
- [ ] Audit logging verified to be called with correct parameters
- [ ] Rate limiting behavior tested separately

### Database Tests
- [ ] Constraint violations tested and error mapping verified
- [ ] Parameterized queries tested with various inputs
- [ ] Transaction behavior tested for multi-step operations
- [ ] Edge cases handled appropriately

## Implementation Steps

1. **Create/Update Database Function**
   - Add parameterized query in appropriate repository
   - Wrap with `handleDatabaseError`
   - Test with unit tests

2. **Create/Update Validation Function**
   - Add validation logic in `src/utils/validation.ts`
   - Test with valid/invalid inputs
   - Ensure proper error messages

3. **Create/Update Handler**
   - Follow 6-step pattern
   - Apply rate limiting wrapper
   - Add comprehensive error handling

4. **Add Tests**
   - Unit tests for handler
   - Database tests if needed
   - Integration tests for complete flow

5. **Verify Compliance**
   - Run through this checklist
   - Ensure all patterns are followed
   - Update documentation if patterns change

## Common Anti-Patterns to Avoid

- ❌ SQL queries directly in handlers
- ❌ Manual API Gateway response construction
- ❌ Missing audit logging for operations
- ❌ Raw database errors exposed to clients
- ❌ No rate limiting on endpoints
- ❌ Validation after processing
- ❌ Inconsistent error handling
- ❌ Hardcoded response helpers in handlers

## References

- Backend patterns: `.windsurf/rules/30-backend-patterns.md`
- Handler patterns: `src/handlers/AGENTS.md`
- Utils patterns: `src/utils/AGENTS.md`
- Database patterns: `src/db/AGENTS.md`
