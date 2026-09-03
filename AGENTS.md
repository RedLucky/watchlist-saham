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

