# 0001. "Bursa 1985" design system with semantic colour tokens
- Status: accepted
- Date: 2026-10-07
- Reference: TASK-7314

## Context
The UI used raw Tailwind palette classes everywhere (~6,400 uses of `indigo`, `blue`, `sky`, `cyan`, `slate`, …), plus gradients, glass blur and large rounded cards. The owner found this look generic ("AI generated"), and light mode needed `!important` overrides in `globals.css` to stay readable. Changing the theme meant editing every component. The app also needs to work well on mobile and in both light and dark mode.

## Options considered
1. **Keep the palette classes, just swap colours per component.** No new concepts, but the theme stays scattered over 50 files, and the next change costs the same again.
2. **Neon retro / cyberpunk (ui-ux-pro-max "Retro-Futurism").** Distinctive, but neon glow, scanlines and glitch effects are hard to read for financial numbers, and the library itself flags high accessibility risk.
3. **"Bursa 1985" (subtle retro) with semantic tokens.** Light mode looks like a financial newspaper stock page ("Kertas Bursa": cream paper, black ink); dark mode looks like an early trading terminal ("Terminal Fosfor": warm black, amber phosphor). Colours are defined once as CSS variables and exposed as Tailwind names that describe a role, not a hue.

## Decision
Option 3.

* Tokens live in `src/app/globals.css`: `--c-*` variables in `:root` (light) and `.dark` (dark), exposed through `@theme inline` as Tailwind colours: `canvas`, `surface`, `sunken`, `line`, `line-strong`, `ink`, `muted`, `accent`, `on-accent`, `up`, `down`, `warn` (+ `*-soft` backgrounds) and `focus`.
* **Green / red / ochre carry price meaning only** (up, down, target/warning) — never decoration. Light mode has no colour accent (primary buttons are ink black); dark mode uses amber as the single accent.
* Typography: IBM Plex Sans (UI text), IBM Plex Serif (page titles), IBM Plex Mono (prices, tickers, small uppercase labels), loaded with `next/font/google` → `font-sans`, `font-serif`, `font-mono`.
* Shape: flat panels, hairline borders, small radius (`rounded-sm`), no gradients, no glass blur, no glow. Building blocks: `.card`, `.label-mono`, `.rule-double`, `.btn-primary`, `.btn-secondary`, `.focus-ring`.
* Icons: Unicode symbols instead of emoji (no new dependency).
* The first visit follows the device theme (`defaultTheme="system"`).
* `tests/themeTokens.test.js` checks that both themes define the same tokens and that text colours reach WCAG AA (4.5:1).

## Consequences
* Every component must be migrated from palette classes to tokens; this is done area by area (TASK-2958 … TASK-4458). Until then pages look mixed.
* The legacy light-mode `!important` overrides stay until the final clean-up (TASK-7761), so unmigrated pages keep their contrast.
* Future theme changes only touch `globals.css`.
* A new colour must be added as a token in both themes (the test fails otherwise).
