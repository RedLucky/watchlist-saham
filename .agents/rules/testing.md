---
description: Testing standards — mandatory unit tests, coverage threshold, integration tests at boundaries
globs: []
alwaysApply: true
---

# Testing

## Mandatory Unit Tests
- **This rule wins over plugin defaults.** Some tools (for example ponytail) say trivial code needs no test. In this repo every function needs one.
- **Every function, class and behaviour change MUST have unit tests**, including small private helpers. Never deliver code without them.
  - A private helper is covered either by its own test or by tests of the public function that uses it, as long as every branch of the helper runs in a test.
- Bug fixes start with a failing test that reproduces the bug.
- Test behaviour (inputs and results), not internal details such as call order or private variables.
- Structure tests as Arrange → Act → Assert; one behaviour per test.
- Test names describe the behaviour: `returns 404 when order does not exist`.
- Cover the happy path, edge cases (empty, boundary, invalid input) and error paths.
- Unit tests are fast, deterministic and isolated: no real network, clock or shared state. Fake time/randomness via injected dependencies.
- **Mandatory mocking for external boundaries**: Always mock external infrastructure, data stores, and network calls in unit tests (e.g. database/SQL/ORM, Redis/cache, message queues, third-party HTTP APIs, file systems). Unit tests must NEVER connect to a real database, Redis instance, or external network service.
  - **Exception for the file system:** temporary folders and fixture files that the test itself creates (for example `mkdtemp` folders or `test/fixtures/`) count as a local fake, so they may be used instead of mocking the file system. Never read or write real user folders, home directories or shared paths in a unit test.
- Mock only at boundaries (HTTP clients, DB, Redis, queues), never the unit under test.
- Never delete, skip or weaken an existing test to make a change pass; if a test is wrong, explain why and ask.

## Coverage
- Changed/new code reaches **≥ 80% line and branch coverage** (or the stricter threshold configured in the repo). Run tests with coverage and check it.
- Coverage is a floor, not a goal: meaningful assertions matter more than the number. Never write assertion-free tests to raise coverage.

## Beyond unit tests
- **Integration tests** for boundaries a unit test cannot prove: DB queries/migrations, HTTP handlers end-to-end, message consumers, third-party adapters (use test containers or local fakes, never shared environments).
- **Test pyramid** — many unit tests, fewer integration tests, a few end-to-end tests for critical user journeys.
- Flaky tests are bugs: fix or quarantine with an issue reference, never ignore.
- Use the `write-unit-test` skill for the workflow.
