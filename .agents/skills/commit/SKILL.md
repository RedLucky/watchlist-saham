---
name: commit
description: Prepare a git commit with the project's message format and get explicit user approval first. Use whenever changes are ready to be committed or the user asks to commit/push.
---

# Commit (with approval)

1. **Check state** — `rtk git status` and `rtk git diff --staged` (stage only files that belong to this change). The staged changes must belong to **exactly one task**; if they cover several, split them into one commit per task first.
2. **Verify** — the `definition-of-done` checklist passed. Never commit secrets, `.env`, build output.
3. **Find the reference** — issue number from the user, branch name or task (`#123`). No issue? Use the plan's task number: `TASK-<n>`.
4. **Draft the message**:
   ```
   <type>(#<issue>|TASK-<n>): <imperative subject, lower case, ≤72 chars>

   <optional body: why this change, wrapped at 72 chars>
   ```
   Types: feat, fix, refactor, perf, test, docs, build, ci, chore, style, revert.
5. **Ask for approval** — show the file list and the exact message, then **stop and wait**. Do not run `git commit` until the user explicitly says yes.
6. **Commit** only after approval, with **exactly** the approved message: no `Co-Authored-By:` or other attribution trailers, nothing added or reworded. **Push** requires its own separate approval.
