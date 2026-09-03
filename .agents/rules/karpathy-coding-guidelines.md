# Karpathy-Inspired Coding Guidelines (LLM Engineering Discipline)

Derived from Andrej Karpathy's observations on LLM coding pitfalls to eliminate unnecessary complexity and regressions:

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
  - Instead of "Fix the bug" -> "Reproduce issue, apply fix, run tests and build".
- Verify results independently through commands before claiming task completion.
