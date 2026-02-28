---
trigger: always_on
---

# Security & configuration

## Secrets

- Do not hardcode credentials, tokens, connection strings, or private keys.
- Prefer environment variables and `src/config/env.ts` as the single place to read/validate config.

## Logging

- Avoid logging full request bodies or full DB records unless necessary.
- Never log secrets.

## AWS/local parity

- Be mindful of `EnvironmentName` and `UseRds` behavior and keep local-dev flows working when possible.
