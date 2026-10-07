---
title: "Design System (Bursa 1985)"
description: "Colour tokens, typography and the standard UI classes for buttons, forms, badges, alerts, tabs, modals and tables"
category: "architecture"
tags: ["frontend", "design-system", "tailwind", "theme", "accessibility"]
last_updated: "2026-10-07"
version: "1.0.0"
---

# Design System (Bursa 1985)

**In one sentence:** every screen is built from a small set of colour names and ready-made CSS classes in `src/app/globals.css`, so light/dark mode and the overall look stay consistent everywhere.

Why this theme: [ADR 0001](../adr/0001-bursa-1985-design-system.md).

## 1. Colour tokens

Use these Tailwind names instead of palette colours (`indigo-600`, `slate-400`, …):

| Token | Use for |
| :--- | :--- |
| `bg-canvas` | Page background |
| `bg-surface` | Cards, panels, modals |
| `bg-sunken` | Table headers, inputs, muted blocks, hover |
| `border-line` / `border-line-strong` | Hairline borders / emphasis rules |
| `text-ink` / `text-muted` | Main text / secondary text |
| `bg-accent` + `text-on-accent` | Primary button, active marker |
| `text-up` / `bg-up-soft` | Price up, buy, positive |
| `text-down` / `bg-down-soft` | Price down, sell, error |
| `text-warn` / `bg-warn-soft` | Targets, warnings |

**Rule:** up/down/warn only carry meaning — never use them as decoration.

## 2. Typography

| Class | Font | Use for |
| :--- | :--- | :--- |
| `font-sans` (default) | IBM Plex Sans | UI text |
| `font-serif` | IBM Plex Serif | Page and section titles |
| `font-mono` | IBM Plex Mono | Prices, tickers, numbers, labels |

## 3. Standard UI classes

| Group | Classes | Notes |
| :--- | :--- | :--- |
| Headings | `.page-title`, `.section-title`, `.section-subtitle`, `.rule-double` | One `.page-title` (h1) per page, with `.rule-double` under it |
| Labels | `.label-mono` | Small uppercase mono label (`TARGET BELI`) |
| Panels | `.card` | Flat panel, hairline border, small radius |
| Buttons | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon` | Min. height 36px; `.btn-icon` needs `aria-label` |
| Forms | `.field-label`, `.field-hint`, `.input`, `.select`, `.checkbox` | Always connect `<label htmlFor>` to the input `id`; `aria-invalid="true"` shows the error border |
| Badges | `.badge`, `.badge-up`, `.badge-down`, `.badge-warn`, `.badge-outline` | Mono, small, no emoji |
| Alerts | `.alert`, `.alert-up`, `.alert-down`, `.alert-warn` | Add `role="alert"` for errors |
| Tabs | `.tabs` + `.tab` | Active tab via `aria-selected="true"` (tabs) or `aria-pressed="true"` (toggle group) |
| Modals | `.modal-backdrop`, `.modal-panel`, `.modal-header`, `.modal-body`, `.modal-footer` | Bottom sheet on phones, centred dialog from 640px; add `role="dialog" aria-modal="true"` |
| Scroll & tables | `.scroll-area`, `.table-base` (+ `.num` cells) | Sticky mono header, right-aligned numbers |
| Focus | `.focus-ring` | Visible keyboard focus for custom controls |

Icons are Unicode symbols (`▲ ▼ ↻ × ⇅ ◎ …`), never colour emoji.

## 4. Tone helpers (`src/lib/uiTones.js`)

So that "buy" or "high risk" looks the same on every page:

* `getSignalBadgeClass(signal)` — BUY/STRONG_BUY → `badge-up`, SELL/STRONG_SELL → `badge-down`, others → `badge-warn`.
* `getRiskTone(level)` — Rendah → up, Sedang → ink, Menengah → warn, others → down (`{ text, badge }`).
* `getChangeTone(change)` — positive → `text-up`, negative → `text-down`, zero/unknown → `text-muted`.

## 5. Responsive tables

Wide data lists (e.g. `StockTable`) show a column grid from `md` (768px) and one card per row below it, with the key numbers in a small 3-column strip. Rows that expand are `role="button"` with `aria-expanded` and work with Enter/Space.

## 6. Guard tests

* `tests/themeTokens.test.js` — both themes define the same tokens; text colours reach WCAG AA (4.5:1).
* `tests/designTokens.test.js` — migrated files contain no palette colours, gradients, glass blur, large radius, hard-coded hex colours or colour emoji. Add a file to `MIGRATED_FILES` when you migrate it.
