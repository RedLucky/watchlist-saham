---
description: Required tooling — what each tool is for, how to install it once per machine and set it up per repository
globs: []
alwaysApply: false
---

# Required tooling

These tools were installed when this repository was set up, so they are required here. Read this when you set up a new machine or clone (`npx agent-initiator doctor` shows what is installed).

## [ponytail](https://github.com/DietrichGebert/ponytail)
Keeps generated code minimal: the least code that fully solves the task.

**Use:** Write the smallest solution that fully meets the requirement. Never drop validation, security, error handling or accessibility to save lines.

```bash
# Claude Code (run inside a session):
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
# Other agents: see the README (Codex plugin, Gemini extension, Cursor/Windsurf rule files)
```

## [caveman](https://github.com/JuliusBrussee/caveman)
Terse response mode that cuts output tokens without losing technical accuracy.

**Use:** Keep chat responses terse. Code, commit messages, PR descriptions and security warnings stay in normal, complete prose.

```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash   # review the script first
```

## [rtk (Rust Token Killer)](https://github.com/rtk-ai/rtk)
Filters shell command output so agents spend fewer tokens.

**Use:** Prefix every shell command with `rtk`, including git, file and script commands: `rtk test <cmd>` for tests, `rtk err <cmd>` for builds and checks, `rtk <tool>` for tools rtk filters (git, grep, ls, pnpm, npm, go, … see `rtk --help`), and `rtk proxy <cmd>` for anything else or when you need raw output; proxy runs it unchanged and keeps its exit code. The commands in AGENTS.md and the skills are already written this way.

```bash
brew install rtk   # or: cargo install --git https://github.com/rtk-ai/rtk  (NOT `cargo install rtk`, a different crate)
rtk init -g   # Claude Code / Copilot; use --codex, --gemini or --agent <name> for other agents
```

## [graphify](https://github.com/Graphify-Labs/graphify)
Builds a queryable knowledge graph of the codebase. Output goes to `graphify-out/` (git-ignored unless the team shares it); `.graphifyignore` keeps the Indonesian wiki and change logs out of the graph. The git hooks from `graphify hook install` rebuild it after each commit.

**Use:** Ask it before broad grep/find, with symbol names and `--budget <tokens>` (see Project knowledge); broad questions return noise. Refresh with `graphify update .` (code only: no LLM, no tokens). Run the full `/graphify` extraction, which uses an LLM, only occasionally: the English wiki already explains the concepts.

```bash
uv tool install graphifyy   # package name has two "y"
graphify install   # or: graphify <codex|cursor|gemini|copilot> install
```

## [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
Design-intelligence skill for UI styles, palettes, typography and UX rules.

**Use:** Use the ui-ux-pro-max skill for any UI/UX work (layout, colour, typography, components, accessibility).

```bash
npm i -g ui-ux-pro-max-cli
uipro init --ai <claude|codex|cursor|gemini|...>   # run inside this repo
```
