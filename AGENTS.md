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

<!-- BEGIN:clean-code-standards -->

# Clean Code, Architecture & Security Standards

Every AI agent writing, modifying, or reviewing code in this repository MUST strictly follow these standards to ensure the codebase remains maintainable, reusable, debuggable, resilient, and secure.

## 1. Core Principles (KISS, YAGNI, DRY, SOLID)
- **KISS (Keep It Simple, Straightforward)**: Write direct, readable code over clever or convoluted patterns. Avoid deep nesting (prefer early returns / guard clauses). If a function requires mental gymnastics to follow, refactor it into clean, sequential steps.
- **Don't Be Too Clever (Anti-Overengineering & Anti-Code-Golf)**: NEVER write code that tries to be "too smart" or overly clever (e.g., cryptic regex, dense nested ternary operators, convoluted one-liners, or obscure functional chains). Code should be immediately obvious, transparent, and easy for any engineer to read, debug, and trace on the very first pass.
- **Self-Documenting Formulas & Calculations**: Never pack multi-variable mathematical or financial equations (e.g., Graham Valuation, CAGR, Margin of Safety, ATR, Payoff Ratio) into a single dense, impenetrable line. Break equations into sequential, clearly named intermediate steps (e.g., `const earningsYield = ...; const debtEquityRatio = ...;`). Anyone reading the code should instantly understand the financial and mathematical reasoning without decoding operator precedence.
- **YAGNI (You Aren't Gonna Need It)**: Never build speculative abstractions, unused parameter options, or "future-proofing" layers. Solve only today's verified problem.
- **DRY (Don't Repeat Yourself)**: Extract reusable logic into shared utilities (e.g., `src/lib/`) when identical logic appears in 2+ places. However, do NOT create premature abstractions for incidental similarities.
- **Single Responsibility (SRP)**: Each function, module, or component must have one well-defined responsibility:
  - Separate pure calculation/business logic (`src/lib/`) from UI components (`src/components/`) and API handlers (`src/app/api/`). Pure logic is easier to test, reuse, and debug.

## 2. Naming Conventions & Code Standards
Consistent, self-documenting naming is non-negotiable:
- **No Magic Numbers — Static Numbers MUST Be Named Constants**: NEVER scatter bare magic numbers or percentages across business logic (e.g., `0.95`, `1.15`, `22.5`, `0.004`, `86400`, `16500`). Extract all static parameters, financial multipliers, thresholds, fee rates, and time intervals into descriptive, top-level `UPPER_SNAKE_CASE` constants at file/module scope (e.g., `DEFAULT_BUY_DISCOUNT_PCT = 5`, `GRAHAM_MULTIPLIER = 22.5`, `IDX_TOTAL_FEE_PCT = 0.40`). Every constant must explicitly explain WHAT it represents and WHY that value was chosen.
- **Variables & Object Properties**: `camelCase`, descriptive nouns (e.g., `currentPrice`, `annualNetProfit`, NOT `cp`, `data2`, `temp`).
- **Booleans**: Use unambiguous interrogative prefixes: `isValid`, `hasDividend`, `isPending`, `shouldRecalculate`.
- **Functions & Methods**: `camelCase`, action verb + noun (e.g., `calculateIntrinsicValue`, `fetchStockQuote`, `formatRupiah`).
- **Constants**: `UPPER_SNAKE_CASE` for global primitives, static multipliers, and fixed configs (e.g., `DEFAULT_CACHE_TTL`, `MAX_PAGE_SIZE`, `GRAHAM_MULTIPLIER`).
- **Components & Classes**: `PascalCase` matching the filename (e.g., `StockExplorer.jsx`, `DetailPanel.jsx`).
- **Comments**: Code should be largely self-explanatory. Use comments to document **WHY** (financial formulas, business rules, edge-case rationale, or external API quirks), never to restate what the code visibly does. Add JSDoc to exported helpers.
- **Unit Tests**: Name test cases descriptively in human language (e.g., `it('should calculate accurate margin of safety when fair value exceeds market price')`).

## 3. Error Handling, Null Safety & Resilience
Defensive programming is mandatory for financial calculations and web interfaces:
- **Null & Undefined Safety**: Always expect external data (APIs, DB fields, JSON columns, user inputs) to be missing, null, or malformed. Always use optional chaining (`?.`), nullish coalescing (`??`), and sensible fallbacks (`|| 0`, `|| []`, `|| {}`).
- **Math & Numeric Sanitization**:
  - Never allow `NaN`, `Infinity`, or division by zero into application state or DB storage. Always guard denominators (`if (denominator <= 0) return 0;`).
  - Sanitize formatted numeric strings (especially Indonesian currency with dots/commas like `Rp 10.000,50`) using dedicated parsers before math operations.
- **Graceful Degradation & Fallbacks**:
  - Always wrap network calls, JSON parses, and background sync operations in structured `try/catch`.
  - The UI must NEVER crash with an uncaught runtime error (White Screen of Death). Always provide visual fallbacks or empty states.

## 4. Security Awareness & Guardrails
Proactively identify and eliminate security risks in all modifications:
- **Input Validation & Sanitization**: Never trust client-supplied input. Enforce type, length, and range checks on all API routes (`/api/*`).
- **Access Control & Authorization**: Verify user session and ownership (`getUserIdFromRequest`) on all mutation endpoints (POST, PUT, DELETE) and private data queries to prevent IDOR (Insecure Direct Object References).
- **Injection Prevention**: Always use parameterized queries (Prisma ORM handles this; never interpolate raw unescaped strings into SQL queries). Sanitize HTML/Markdown inputs to prevent XSS.
- **Secret & Sensitive Data Protection**: Never hardcode secrets, private keys, or credentials. Never log sensitive user credentials, tokens, or PII in client-side bundles or server console logs.

## 5. Reusability, Testability & Maintainability
- **Pure Functions for Business Logic**: Implement financial algorithms, indicators, and scoring engines as pure functions with zero side-effects. Pure functions are deterministic and trivially testable.
- **Automated Verification**: When adding or revising business logic, utilities, or API rules, co-locate or add tests in `tests/` and verify that all tests pass (`rtk npm test`) before concluding work.
- **Dead Code & Orphan Cleanup**: Clean up any unused imports, orphaned variables, or superseded code introduced during refactoring.

<!-- END:clean-code-standards -->
