---
name: plan-task
description: Break a feature or change into a numbered plan of small, verifiable tasks (TASK-<n>) with acceptance criteria. Use before any multi-step work, and whenever a commit needs a task number because there is no issue.
---

# Plan Task

1. **Clarify** — restate the goal, list assumptions and open questions. Ask before planning if anything is ambiguous.
2. **Reference** — if the user gave an issue (`#123`), every task uses it. Otherwise give each task a random 4-digit id, unique within the plan: `TASK-4821`, `TASK-5307`, …
3. **Split** into small tasks (each task = exactly one commit, reviewable in minutes). For each task write:
   ```
   ### TASK-<n>: <imperative title>
   - Goal: <one sentence>
   - Files: <expected files/modules>
   - Acceptance: <verifiable checks: tests that must pass, behaviour to observe>
   - Risks: <migrations, breaking changes, security> (optional)
   ```
4. **Order** tasks by dependency; mark ones that can run in parallel.
5. **Scope guard** — list what is explicitly *out of scope*. No speculative tasks.
6. **Confirm** — show the plan and wait for approval before implementing.
7. **Execute** one task at a time; finish each with `definition-of-done`; commit it via the `commit` skill using that task's reference **before starting the next task**.
