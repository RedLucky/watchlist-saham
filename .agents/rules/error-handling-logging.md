---
description: Error handling and structured logging standards
globs: []
alwaysApply: true
---

# Error Handling & Logging

## Error handling
- Validate input at boundaries and fail fast with a clear, specific error.
- Never swallow errors. Either handle them meaningfully, or add context and re-throw/return them.
- Use typed/custom errors for domain failures (e.g. `OrderNotFoundError`) so callers can branch on type, not message text.
- Preserve the original cause when wrapping (`cause`, `raise ... from err`, `fmt.Errorf("...: %w", err)`).
- Map internal errors to safe external responses: no stack traces, SQL or secrets in API responses.
- Clean up resources on every path (`finally`, `with`, `defer`).
- Do not add handling for impossible scenarios — handle what can actually fail (I/O, network, parsing, user input).

## Logging
- Use the project's structured logger (see language/framework rules); no bare `print`/`console.log` in production code.
- Log levels: `error` = needs attention, `warn` = unexpected but handled, `info` = key business events, `debug` = diagnostics.
- Log messages are static strings; variable data goes in structured fields (`{ orderId, userId }`).
- Log each error once, where it is handled — not at every layer it passes through.
- Include correlation/request IDs when available.
- Never log secrets, tokens, passwords, full card numbers or unnecessary personal data.
