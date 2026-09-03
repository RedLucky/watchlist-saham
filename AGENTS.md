<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:rtk-rules -->

# Mandatory RTK Rule (Rust Token Killer)

ALWAYS prefix all shell commands with `rtk` (e.g. `rtk git ...`, `rtk npm ...`, `rtk ls ...`, `rtk cargo ...`, `rtk find ...`, `rtk docker ...`).
NEVER execute raw shell commands without `rtk` to minimize token consumption.

<!-- END:rtk-rules -->

<!-- BEGIN:llm-wiki-rules -->

# Mandatory Project Knowledge Base (LLM Wiki Ground Truth)

BEFORE proposing architectural decisions, modifying formulas, changing database schemas, or writing trading logic in any new session, you MUST read the Wiki Index at `docs/wiki/en/index.md` (and the specific linked pages for the task at hand).
The `docs/wiki/en/` directory is the persistent, compiled ground truth of this project:
- System Architecture (`docs/wiki/en/architecture/`)
- Financial Engine, Graham Valuation, Scoring Weights (`docs/wiki/en/financial-engine/`)
- Order Lifecycle, Waiting Buy, Win Rate (`docs/wiki/en/trading-system/`)

DO NOT re-derive financial formulas or guess database behaviors from scratch. Consult the wiki first to prevent context loss, token waste, and hallucination. Keep the wiki updated when adding or revising features.

<!-- END:llm-wiki-rules -->

<!-- BEGIN:karpathy-coding-guidelines -->

# Karpathy-Inspired Coding Guidelines (LLM Engineering Discipline)

Derived from Andrej Karpathy's core observations on LLM coding pitfalls to eliminate unnecessary complexity and collateral regressions:

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so and push back when warranted.
- If something is unclear or contradictory, stop, name what is confusing, and ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- Implement only the features requested — no premature "flexibility" or speculative abstractions.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it simply. Senior engineers prefer clean clarity over bloated abstractions.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Do NOT "improve", reformat, or refactor unrelated adjacent code or comments.
- Match existing repository conventions and style strictly.
- Clean up imports/variables orphaned by your own changes; do not delete pre-existing unrelated dead code unless requested.
- Every modified line must trace directly back to the user's explicit request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Transform imperative tasks into verifiable goals:
  - Instead of "Add validation" -> "Write test reproducing invalid case, then make it pass".
  - Instead of "Fix the bug" -> "Reproduce issue, apply fix, run `rtk npm test` and `rtk npm run build`".
- Verify results independently through commands before claiming task completion.

<!-- END:karpathy-coding-guidelines -->


