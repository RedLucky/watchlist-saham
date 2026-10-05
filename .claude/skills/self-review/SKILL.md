---
name: self-review
description: Review your own diff like a strict senior reviewer before declaring work done. Use after implementing a change and before running the definition-of-done checklist or proposing a commit.
---

# Self Review

Run `rtk git diff` (and `rtk git diff --staged`) and check every changed line:

1. **Scope** — every change traces to the request. Revert unrelated edits, reformatting and drive-by refactors.
2. **Simplicity** — no speculative abstractions, dead code, debug leftovers, commented-out code or TODO placeholders.
3. **Correctness** — edge cases (empty, null, boundary, concurrency), error paths handled, no swallowed errors.
4. **Security** — input validated, no secrets, no injection, authz enforced, no PII in logs.
5. **Tests** — new behaviour and bug fixes covered; tests assert behaviour, not implementation.
6. **Readability** — names follow conventions; comments explain *why*; a beginner could follow it.
7. **Performance/scalability** — no N+1 queries, unbounded loops/lists or blocking I/O in hot paths.
8. **Docs** — the wiki page of the topic you worked on is updated or created (not only `log.md`), plus glossary/FAQ/ADR/API contract where behaviour or decisions changed.

Fix what you find, then report a short list of what you checked and changed. Continue with `definition-of-done`.
