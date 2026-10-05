---
name: update-wiki
description: Update the bilingual wiki knowledge base (docs/wiki/en and docs/wiki/id) — the page of the topic you worked on (create it if missing), related pages, index and change log. Use after any change to behaviour, architecture, setup, APIs or conventions, as part of the definition of done.
---

# Update Wiki

The wiki is a knowledge base for new developers, experienced developers and non-developers. A log entry alone is never enough. Read the `documentation` rule (`.agents/rules/documentation.md`) for the full writing standards.

1. **Find the topic** — which feature or topic did this change touch? Find its page in `docs/wiki/en/` (`features/<topic>.md`, `architecture.md`, `getting-started.md`, …). If no page covers it, create `features/<topic>.md` (kebab-case).
2. **Update the English page** — start with **In short** (2–4 sentences a non-developer understands: what it is and why it matters), then the details for developers: how it works *now*, key files, configuration, examples, how to test it. Use short sentences; explain technical terms.
   - **Add or update a diagram** whenever the page describes a flow, process, architecture or relationship: Mermaid (` ```mermaid `) by default, ASCII for simple flows. Plain-word labels, about 15 boxes at most, and the same diagram in both languages.
3. **Update related pages** — new terms → `glossary.md`; new common problems → `faq.md`; changed setup → `getting-started.md`; changed structure → `architecture.md`; changed purpose or audience → `overview.md`.
4. **Update Indonesian** — mirror every changed page in `docs/wiki/id/` with the same file name and the same content. Keep code, paths and identifiers untranslated.
5. **Index** — if a page was added or renamed, update `index.md` in both languages (link, one-line summary, and the reading path it belongs to).
6. **Log** — prepend an entry to `log.md` in both languages:
   ```
   ## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
   - What: <what changed>
   - Why: <reason>
   - Files: <main files touched>
   ```
7. **Check** — the topic page was updated (not only the log), both languages have the same pages, and the latest log entry matches in both.
