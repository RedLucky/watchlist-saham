---
description: Documentation — read when you update the wiki (every change does) — knowledge-base pages, writing style, diagrams
globs: []
alwaysApply: false
---

# Documentation (Wiki as a Knowledge Base)

The wiki in `docs/wiki/` is the project's knowledge base. A new developer, an experienced developer and a non-developer (product manager, QA, stakeholder) should all be able to learn how the project works from it without asking anyone.

## Audience and writing style
- Every page starts with an **In short** section: 2–4 sentences in everyday language that a non-developer understands — what it is and why it matters.
- After that come the details for developers: how it works, key files, configuration, examples and how to test it.
- Plain language: short sentences and everyday words. Explain a technical term the first time you use it, or link it to `glossary.md`.
- Describe how the system works **now**. History belongs in `log.md`.
- English and Indonesian pages exist with the same file names and the same content. Keep code, paths and identifiers untranslated.

## Diagrams
A picture often explains a flow faster than paragraphs, for people and for AI agents. Add a diagram whenever you can.
- **Whenever a page describes a flow, process, sequence, architecture or relationship, add a diagram.**
- Prefer **Mermaid** (` ```mermaid ` blocks): GitHub and GitLab render it, and agents read it as text. Use **ASCII** for simple flows or where Mermaid is not rendered (terminal output, plain-text files).
- The diagram supports the text; it does not replace it. Explain the same flow in words next to it.
- Label boxes and arrows in plain words (`Check if file exists`, not `chkF()`); use code names only when the reader needs them to find the code.
- Keep each diagram small (about 15 boxes at most). Split a bigger flow into several diagrams.
- When the flow changes, update the diagram in the same change, in both languages.

## Written for AI agents too
AI agents read this wiki before exploring the code, so it must be cheap to read.
- AI agents read the English pages only; the Indonesian pages hold the same content for human readers. `log.md` is history, read only when investigating it.
- `index.md` has a **For AI agents: task → page** table: each common task points to the page to read and the code folder to open.
- Every feature page has a **Where it lives in the code** table, so an agent can jump to the right file without searching.
- Link instead of repeating: each fact lives on one page. The README covers install and usage and links to the wiki for details.

## Structure

```
docs/wiki/en/ and docs/wiki/id/
  index.md            map of all pages, plus reading paths for non-developers, new developers and experienced developers
  overview.md         what the project is, who it is for and why it exists (non-technical)
  getting-started.md  how to install, run and test the project, and how to make a first change
  architecture.md     how the main parts fit together
  features/<topic>.md one page per feature or topic: what it does for users, how it works, where the code is, how to test it
  glossary.md         terms and abbreviations explained in plain words
  faq.md              common questions and problems, with answers
  adr/NNNN-<title>.md architecture decisions (write-adr skill)
  log.md              change log, newest first
```

## Keeping the wiki current
- **Every change updates the wiki page of the topic you worked on. A log entry alone is never enough.**
- If no page covers the topic yet, create one (`features/<topic>.md`, kebab-case) and add it to `index.md`.
- Also update the pages the change affects: new terms in `glossary.md`, new common problems in `faq.md`, changed setup in `getting-started.md`, changed structure in `architecture.md`, changed purpose or audience in `overview.md`.
- `log.md` gets a new entry (newest first) for every change: date, commit/task reference, what changed and why.
- Significant, hard-to-reverse decisions (framework, database, architecture pattern, integration) are recorded as ADRs in `docs/wiki/{en,id}/adr/` via the `write-adr` skill.
- Public APIs also get doc comments in code (and an OpenAPI spec for HTTP APIs); README covers setup and usage.
- Use the `update-wiki` skill for the workflow.
