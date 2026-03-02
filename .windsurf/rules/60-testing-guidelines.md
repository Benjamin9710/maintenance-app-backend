# Testing Guidelines

## Automated Test Execution

When running tests, always use these patterns to ensure proper execution and avoid hanging:

### Backend Tests
- Use `npm test` for unit tests  
- Use `npm run test -- --verbose` for detailed output when needed
- Always check exit codes, never assume tests passed
- For specific test files: `npm test -- test/unit/specific.test.ts`

### Test Timeouts
- Unit tests: Jest defaults (5s) are usually sufficient
- Database tests: Ensure proper cleanup with `closePool()` and `cleanupRateLimiters()`
- If tests hang, check for: unclosed database connections, open timers, or network requests

### Build Verification
- Always run `npm run build` after handler changes
- Check for TypeScript errors before running tests
- Verify OpenAPI alignment after API changes

## Test Command Patterns

✅ GOOD:
```bash
npm test
npm run build && npm test
npm test -- test/unit/adminListManagerProperties.test.ts
```

❌ AVOID:
```bash
npm test  # Without checking exit code
jest  # Direct jest calls bypass npm scripts
```

## When Tests Fail

1. Check the error output for specific failure reasons
2. Look for database connection issues
3. Verify mocks are properly configured
4. Check authentication/authorization flows
5. Ensure test data is properly set up

## Test Environment Cleanup

- Use `cleanupRateLimiters()` and `closePool()` in test teardown
- Mock rate limiters to prevent interval issues: `jest.mock('../../src/utils/rateLimiter', () => ({ withAdminRateLimit: (handler: any) => handler, cleanupRateLimiters: jest.fn() }))`
- Never leave database connections or timers open after tests
