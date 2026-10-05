---
name: write-unit-test
description: Workflow for writing focused, deterministic unit tests. Use when adding a feature, fixing a bug (reproduce first), or when code lacks tests.
---

# Write Unit Test

1. **Find the convention** — locate existing tests near the code; copy their framework, file naming and folder layout.
2. **List behaviours** — happy path, edge cases (empty, boundary, invalid input), and error paths. One test per behaviour. Every function needs coverage, including small private helpers (directly, or through the public function that uses them).
3. **Bug fix?** Write the failing test that reproduces the bug *first* and run it to see it fail.
4. **Write the test** with Arrange → Act → Assert and a behaviour-describing name.
5. **Isolate** — fake only boundaries (HTTP, DB, clock, randomness) via injected dependencies. No real network or shared state.
6. **Run** the test command from AGENTS.md (exactly as written there) and confirm it passes — and fails if you revert the fix.
7. **Keep it readable** — no logic (loops/conditionals) inside tests; use small builders/fixtures for setup.

Never weaken, skip or delete existing tests to make a change pass.
