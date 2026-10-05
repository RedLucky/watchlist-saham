---
name: debugging
description: Systematic debugging workflow — reproduce, isolate, hypothesise, prove with a failing test, fix, verify. Use for any bug, failing test, crash or unexpected behaviour, before changing code.
---

# Debugging

1. **Reproduce** — get the exact error, input and steps. Quote the decisive error line. If you cannot reproduce it, gather more data (logs, versions, config) instead of guessing.
2. **Isolate** — narrow down where it breaks (bisect inputs, commits or code paths; add temporary targeted logging).
3. **Hypothesise** — state one root-cause hypothesis and the evidence for it. Check it; discard it if the evidence disagrees.
4. **Prove** — write a failing test that reproduces the bug.
5. **Fix the root cause**, not the symptom. Keep the change minimal; no unrelated refactors.
6. **Verify** — the new test passes, the full suite and build pass; remove temporary logging.
7. **Explain** — report root cause, fix and how it was verified; add a `log.md` entry. Never claim a fix without running the checks.
