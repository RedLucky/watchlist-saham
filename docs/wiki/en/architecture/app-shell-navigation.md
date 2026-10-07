---
title: "App Shell & Navigation"
description: "Desktop sidebar, mobile header, mobile bottom bar with the Lainnya sheet, and footer"
category: "architecture"
tags: ["frontend", "navigation", "mobile", "layout"]
last_updated: "2026-10-07"
version: "1.0.0"
---

# App Shell & Navigation

**In one sentence:** on a computer the menu is a sidebar on the left; on a phone there is a slim header on top and a bottom bar with 4 main pages plus "Lainnya" (more).

Styled with the "Bursa 1985" tokens ([ADR 0001](../adr/0001-bursa-1985-design-system.md)).

| Part | File | Shown on |
| :--- | :--- | :--- |
| Menu config & helpers | `src/lib/navigation.js` | — |
| Desktop sidebar | `src/components/Navigation/Sidebar.jsx` | `lg` (≥ 1024px) |
| Mobile header | `src/components/Navigation/TopHeader.jsx` | below `lg` |
| Mobile bottom bar + "Lainnya" sheet | `src/components/Navigation/MobileNav.jsx` | below `lg` |
| Page container & footer | `src/components/Dashboard.jsx` | all |

## Menu config (`src/lib/navigation.js`)

* `NAVIGATION_MENU` — 2 groups, 11 pages. Each item has `id`, `label`, `shortLabel` (≤ 10 characters, for the bottom bar) and a Unicode `icon` (not emoji, so it follows the text colour).
* `MOBILE_PRIMARY_IDS` — pages pinned on the bottom bar: Analisis, Explorer, Screener, Portofolio.
* `splitMobileNav()` — splits the menu into the pinned pages and the rest (shown under "Lainnya").
* `findMenuItem(id)` — the page shown as subtitle in the mobile header.
* `hasPreviousMonthKseiData(periods, now)` — whether last month's KSEI data is uploaded. `Dashboard` checks this once after login and passes `kseiWarning` to the sidebar and bottom bar ("Update" badge / dot).

Unit tests: `tests/navigation.test.js`.

## Desktop sidebar

* 240px wide, or a 64px icon-only rail after clicking **« Ciutkan**. The choice is stored in `localStorage` (`sidebar-collapsed`).
* Active page: sunken background + thin accent bar on the left, `aria-current="page"`.
* Footer: Yahoo Finance sync status with manual sync (↻), theme toggle, Refresh, user and Logout.

## Mobile

* **Header:** 48px, brand + name of the open page + theme toggle.
* **Bottom bar:** 56px + device safe area; 5 equal buttons (18px icon, 10px single-line label, whole cell is the touch target). Active page has an accent line on top.
* **"Lainnya" sheet:** opens from the bottom with the other 7 pages, KSEI admin link, user and Logout. Closes on Escape, backdrop tap, × or choosing a page; focus moves into the sheet and back to the button; the page behind does not scroll.
* Page content has bottom padding so nothing hides behind the bar.
