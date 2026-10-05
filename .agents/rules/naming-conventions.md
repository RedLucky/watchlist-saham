---
description: Naming conventions for variables, functions, classes, files and folders
globs: []
alwaysApply: true
---

# Naming Conventions

Language-specific rules (see the language rule) override the defaults below. Existing repo conventions override both.

## General
- Names reveal intent: `retryDelayMs`, `activeUsers`, `isExpired`.
- Booleans read as questions: `is*`, `has*`, `can*`, `should*`.
- Functions start with a verb: `getUser`, `calculateTax`, `sendInvoice`.
- Collections are plural (`orders`); single items singular (`order`).
- Include units in names when relevant: `timeoutMs`, `sizeBytes`, `priceCents`.
- Avoid abbreviations except well-known ones (`id`, `url`, `api`, `db`, `http`).
- One concept = one word across the codebase (do not mix `fetch`/`get`/`retrieve` for the same thing).

## Files and folders
- Group by feature/domain first (`orders/`, `billing/`), then by technical role inside it.
- One main export per file; the file name matches it.
- Test files mirror the source file name (e.g. `order-service.test.ts`, `test_order_service.py`, `order_service_test.go`).
- No generic buckets like `misc/`, `stuff/`, `common2/`.
