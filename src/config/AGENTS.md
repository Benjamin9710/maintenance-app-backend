# src/config/

## Purpose

- Central place for environment/config parsing.

## Conventions

- Prefer typed config objects exported from `env.ts`.
- Validate required environment variables at startup for non-local environments; local defaults are acceptable for developer convenience.
- Do not embed environment-specific values directly in code.
