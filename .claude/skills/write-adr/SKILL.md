---
name: write-adr
description: Record an Architecture Decision Record (ADR) in the bilingual wiki. Use when choosing or changing a framework, database, architecture pattern, integration, or any decision that is costly to reverse.
---

# Write ADR

1. **Number** — next free number in `docs/wiki/en/adr/` (`0001`, `0002`, …). File: `NNNN-<kebab-title>.md`.
2. **Write English** using this template:
   ```
   # NNNN. <Title>
   - Status: proposed | accepted | superseded by NNNN
   - Date: YYYY-MM-DD
   - Reference: #<issue> | TASK-<n>

   ## Context
   <problem, constraints, forces>

   ## Options considered
   <option — pros / cons> (at least two)

   ## Decision
   <what we chose and why>

   ## Consequences
   <trade-offs, follow-up work, risks>
   ```
3. **Mirror** it in `docs/wiki/id/adr/` with the same file name (Indonesian prose, identifiers untranslated).
4. **Index** — add the ADR to `index.md` in both languages; add a `log.md` entry.
5. ADRs are immutable once accepted: to change a decision, write a new ADR that supersedes the old one.
