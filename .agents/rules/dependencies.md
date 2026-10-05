---
description: Dependency management — minimal, pinned, audited, licence-checked third-party packages
globs: ["package.json", "pyproject.toml", "requirements*.txt", "go.mod"]
alwaysApply: false
---

# Dependencies

- **Justify every new dependency**: prefer the standard library or existing deps; never add a package for a few lines of code.
- Before adding, check: maintained (recent releases), popular/trusted, licence compatible (MIT/Apache-2.0/BSD are safe; ask before GPL/AGPL/unknown), no known vulnerabilities, reasonable size.
- Use the project's package manager and **commit the lockfile**. Never edit lockfiles by hand; never mix package managers.
- Pin versions via the lockfile; upgrade deliberately (one concern per change) and read changelogs for major bumps.
- Separate runtime and dev dependencies correctly.
- Run the dependency audit (`audit` command in AGENTS.md) whenever dependencies change; fix or report high/critical findings.
- Remove dependencies that are no longer used.
