---
description: LLM engineering discipline (Karpathy-inspired) — think first, surgical changes, goal-driven execution
globs: []
alwaysApply: true
---

# LLM Engineering Discipline

Derived from Andrej Karpathy's observations on LLM coding pitfalls. "Simplicity First" is covered by the code-quality rule (no over-engineering) and, when it is installed, by **ponytail** (see AGENTS.md → Required tooling).

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface trade-offs.**
- State assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so and push back when warranted.
- If something is unclear or contradictory, stop, name what is confusing, and ask.
- Your knowledge of libraries may be outdated: check the installed version and its docs (AGENTS.md → Framework docs) before using an API. Never guess CLI flags — read `--help`.

## 2. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Do not "improve", reformat or refactor unrelated adjacent code or comments.
- Match existing repository conventions and style strictly.
- Remove imports/variables orphaned by *your* change; leave pre-existing dead code unless asked.
- Every modified line must trace back to the user's explicit request.

## 3. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Turn imperative tasks into verifiable goals:
  - "Add validation" → write a test reproducing the invalid case, then make it pass.
  - "Fix the bug" → reproduce it, apply the fix, run the test and build commands from AGENTS.md.
- Verify results with commands before claiming completion. Report failures honestly with the output.
- Finish with the `definition-of-done` skill.
