---
name: definition-of-done
description: Mandatory completion checklist. Use before claiming any coding task is done, fixed or ready — verifies self-review, unit tests and coverage, build, dependency audit and bilingual wiki/log updates.
---

# Definition of Done

A task is **not done** until every item below is verified in this session. Run the commands; do not assume.

1. **Conventions & self-review** — the change follows AGENTS.md and the relevant `.agents/rules/*` (naming, error handling, logging, comments, security, privacy). Run the `self-review` skill; only task-related lines changed.
2. **Unit tests & coverage** — new/changed behaviour has unit tests, the full suite passes, and changed code has ≥ 80% coverage (or the repo's threshold). Use the `test` command from AGENTS.md → Commands, exactly as written there.
3. **Build** — the production build succeeds. Use the `build` command from AGENTS.md → Commands, exactly as written there. Also run `lint`/`typecheck` when they exist.
4. **Dependency audit** — if dependencies changed, run the `audit` command and resolve or report high/critical findings.
5. **Docs** — the wiki is updated in **both** `docs/wiki/en/` and `docs/wiki/id/`: the page of the topic you worked on (created if missing, starting with an *In short* section for non-developers), related pages such as `glossary.md` or `faq.md`, `index.md`, and a new `log.md` entry. A log entry alone does not pass. Use the `update-wiki` skill; architecture decisions get an ADR (`write-adr` skill).

## Report
Finish with a short report:

```
DoD
- Conventions/self-review: ok
- Tests: <command> → <N passed>, coverage <X>%
- Build: <command> → ok
- Audit: <command> → ok | skipped (no dependency changes)
- Wiki: topic pages <files> + log (en/id)
```

If any step fails or cannot run (e.g. no `test` script configured), say so explicitly with the output — never claim success. Do **not** commit; propose a commit via the `commit` skill and wait for approval.
