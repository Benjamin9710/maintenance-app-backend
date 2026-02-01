# src/

## TypeScript conventions

- Prefer strict typing; avoid `any` unless there is no practical alternative.
- Keep imports at the top; avoid dynamic requires.
- Prefer small, focused modules with clear responsibility.
- Avoid cross-layer imports (handlers should not reach into deep DB internals directly).

## Error handling

- Fail fast for misconfiguration.
- For runtime errors, preserve useful context while not leaking secrets.
