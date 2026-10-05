---
description: CI quality gates — pipeline order, pre-commit hooks, commit linting, branch protection
globs: [".github/workflows/**", ".gitlab-ci.yml", ".husky/**", "lefthook.yml", ".pre-commit-config.yaml", "commitlint.config.*"]
alwaysApply: false
---

# CI Quality Gates

- Every pull request runs, in order: **lint → typecheck → test (with coverage) → build → dependency audit**. Any failure blocks the merge. The audit fails on high and critical advisories.
- The same checks run locally before pushing: pre-commit hooks (husky/lefthook for JS, `pre-commit` for Python) run format + lint on staged files; heavier checks run pre-push or in CI.
- Commit messages are validated (commitlint or equivalent) against the project format `type(#<issue>|TASK-<n>): subject`.
- The default branch is protected: PR + passing checks + review required; no direct pushes.
- CI uses the lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `uv sync --locked`, …) and caches dependencies.
- Secrets come from the CI secret store, never from the repo; CI logs must not print them.
- Never weaken or skip a gate to get a change merged; fix the cause.
