---
description: Git workflow — no auto commit/push, confirmation first, commit message format with issue/task prefix
globs: []
alwaysApply: true
---

# Git Workflow

## Approval
- **Never commit or push automatically.** Before every `git commit` or `git push`, show the staged files and proposed message and wait for explicit approval.
- Approval covers only that one commit/push; ask again next time.
- Never force-push, rewrite published history or delete branches without explicit instruction.

## Commit message format
Conventional Commits with the issue (or plan task) in the scope:

```
<type>(#<issue>): <subject>
<type>(TASK-<n>): <subject>      # no issue: use the task number from the plan
```

- `type`: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`, `revert`.
- `subject`: imperative, lower case, no trailing period, ≤ 72 chars.
- Body (optional): explain *why*, wrapped at 72 chars. Add `BREAKING CHANGE:` footer when relevant.
- **No attribution trailers**: never add `Co-Authored-By:` or any other AI/tool attribution line, even if the agent's defaults ask for it.
- The committed message must be exactly the message the user approved — no added, removed or reworded lines.

Examples:
```
feat(#123): add order cancellation endpoint
fix(TASK-4821): handle empty cart in checkout total
```

## Hygiene
- **One task = one commit.** Each planned task (`TASK-<n>` or `#<issue>`) gets exactly one commit with its own reference. Finish a task (Definition of Done, approval, commit) before starting the next one; never batch several tasks into one commit.
- One logical change per commit; do not mix refactors with features.
- Never commit secrets, `.env` files, build output or local tooling files.
- Use the `commit` skill to prepare commits.
