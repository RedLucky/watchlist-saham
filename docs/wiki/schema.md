# LLM Wiki Schema & Operating Protocol

This document defines the schema, conventions, and operational workflows for maintaining the `watchlist-saham` persistent knowledge base.

---

## 1. Architectural Philosophy

The wiki sits between raw source files (code, database schemas, financial reports, IDX circulars) and the human/AI operator.
* **Persistent & Compounding**: Knowledge is synthesized once and kept current. It is never re-derived from scratch on every prompt.
* **Dual-Language**: 
  - `en/` (English) is the **primary ground-truth reference for AI agents** (optimized for reasoning density, context precision, and token economy).
  - `id/` (Indonesian) is the **localized reference for human operators** and IDX regulatory domain context.
* **Tool & Agent Agnostic**: Compatible with Google Antigravity, Claude Code, OpenAI Codex, Cursor, and Obsidian.

---

## 2. Document Conventions

Every document in the wiki must follow standard Markdown with YAML frontmatter:

```markdown
---
title: "Document Title"
description: "Dense 1-2 sentence overview of this document's scope"
category: "architecture | financial-engine | trading-system"
tags: ["stock-analysis", "idx", "valuation"]
last_updated: "YYYY-MM-DD"
version: "1.0.0"
---
```

### Linking Standards
* Internal wiki links should use relative markdown links: `[Target Title](../financial-engine/valuation-models.md)`.
* Obsidian `[[wikilink]]` syntax is permitted when accompanied by standard Markdown file paths for IDE portability.
* Cross-language mirrors should have identical folder and topic structures between `en/` and `id/`.

---

## 3. Core Operations

### A. Ingest Protocol
When new features, formulas, or data providers are added to the codebase:
1. **Analyze source**: Read the source files completely.
2. **Update Entity / Topic Pages**: Integrate new logic into existing files or create a new dedicated page if the concept is net-new.
3. **Resolve Contradictions**: If new code replaces an old formula, flag the deprecation explicitly.
4. **Update Catalog**: Add/update the document entry in `index.md`.
5. **Append Log**: Append a dated entry to `log.md` with format: `## [YYYY-MM-DD] ingest | Topic Name`.

### B. Query Protocol
When answering complex architectural or financial questions:
1. Consult `index.md` first to locate authoritative pages.
2. Read the targeted wiki page(s).
3. Synthesize the answer citing specific wiki documents.
4. If a query uncovers new insights or complex comparisons, **file the answer back into the wiki** as a new synthesis page.

### C. Lint Protocol
Periodically inspect the wiki for:
* Discrepancies between wiki formulas and actual `src/` implementation.
* Broken relative links.
* Stale thresholds or missing metrics.
