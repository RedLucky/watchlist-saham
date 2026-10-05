---
description: Release and versioning — SemVer, changelog from conventional commits, feature flags, safe rollout
globs: ["CHANGELOG.md", "package.json", "pyproject.toml"]
alwaysApply: false
---

# Release & Versioning

- **SemVer** — `MAJOR.MINOR.PATCH`: breaking change → major, backward-compatible feature → minor, fix → patch.
- **Changelog** — generated from conventional commits (e.g. release-please, changesets, semantic-release); do not hand-edit released entries.
- **Breaking changes** — mark them with `!` / `BREAKING CHANGE:` in the commit, document a migration path, and deprecate before removing when possible.
- **Feature flags** — ship unfinished or risky work behind a flag instead of long-lived branches; remove the flag and dead code once rolled out.
- **Small, reversible releases** — every release can be rolled back; database changes follow the database-migrations rule.
- Tag releases in git (`v1.4.0`) from the default branch only.
