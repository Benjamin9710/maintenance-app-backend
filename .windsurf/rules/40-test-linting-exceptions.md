---
trigger: glob
globs: test/**/*.test.ts
---

# Test file linting exceptions

## Scope

This rule applies to all test files in the backend project (`test/**/*.test.ts`).

## Allowed linting exceptions

- `@typescript-eslint/no-explicit-any` warnings are permitted in test files when:
  - Creating AWS Lambda event mocks (`APIGatewayProxyEventV2`)
  - Mocking complex external service responses
  - Setting up test fixtures with partial data
  - The alternative would be overly verbose type definitions that reduce test readability

## Requirements

- Use ESLint disable comments for intentional `any` usage: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- Prefer explicit types where practical and not overly verbose
- Document why `any` is being used in complex test scenarios with brief comments

## Rationale

Test files prioritize readability and maintainability over strict type safety. AWS Lambda events and complex mock objects often have deeply nested structures that would require excessive type boilerplate, making tests harder to read and modify.
