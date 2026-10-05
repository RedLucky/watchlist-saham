---
description: JavaScript/Node.js conventions — naming, modules, async, errors and logging
globs: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx", "**/*.ts", "**/*.tsx"]
alwaysApply: false
---

# JavaScript / Node.js

## Naming
- `camelCase` variables and functions, `PascalCase` classes and components, `UPPER_SNAKE_CASE` true constants.
- Files and folders: `kebab-case` (`order-service.js`), except component files where the framework expects `PascalCase`.
- Tests: `<file>.test.js` next to the source or in the project's existing test folder.

## Code
- ES modules (`import`/`export`) unless the project is CommonJS; do not mix.
- `const` by default, `let` when reassigned, never `var`.
- `async`/`await` over raw promise chains; never leave a promise floating — `await` it or handle `.catch`.
- Use strict equality (`===`). Avoid mutating function arguments.
- Read `process.env` in one config module, validate it at startup, export a typed/frozen config object.

## Errors & logging
- Throw `Error` subclasses (`class NotFoundError extends Error`) and pass `{ cause }` when wrapping.
- Use a structured logger (e.g. `pino`) with child loggers per module/request; no `console.log` in production code.
- Handle `unhandledRejection`/`uncaughtException` once at the entry point: log and exit non-zero.

## Documentation & Comments
- **Mandatory JSDoc**: Use JSDoc (`/** ... */`) on all functions, classes, methods, and complex objects/schemas: describe purpose, `@param`, `@returns`, and `@throws`.
- **Inline comments**: Use specific inline comments to explain the "why" behind non-obvious logic, business constraints, or workarounds.
