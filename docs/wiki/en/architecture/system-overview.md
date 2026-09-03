---
title: "System Overview"
description: "High-level technology stack and component architecture of the watchlist-saham platform"
category: "architecture"
tags: ["nextjs", "turbopack", "tailwind", "prisma", "typography"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# System Overview

`watchlist-saham` is an institutional-grade Indonesian equity analysis terminal and portfolio intelligence platform built for retail and swing traders on the Indonesia Stock Exchange (IDX/BEI).

---

## 🛠️ Technology Stack

| Layer | Technology | Key Configuration & Notes |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.1 (App Router) | Running with **Turbopack** for ultra-fast builds (<1.2s). Server components + route handlers. |
| **Database ORM** | Prisma 5.x + PostgreSQL | Relational schema with index optimization for tickers, sectors, and user portfolio items. |
| **Typography** | `Plus Jakarta Sans` (`@next/font/google`) | Variable font `--font-sans` with tight tracking (`-0.01em`) and `tabular-nums` for financial alignment. |
| **Styling** | Tailwind CSS 3.4+ | Dynamic dual theme: **Deep Obsidian** (`#070b14`) and **Crisp Pearl** (`#f8fafc`). |
| **Charts** | Lightweight Charts + SVG | Real-time candlestick charts with OHLCV data, Supertrend bands, and DEMA overlays. |
| **Agent Optimization** | Rust Token Killer (`rtk`) | Shell commands wrapped via `rtk` to minimize LLM token overhead by ~55%. |

---

## 🏛️ Application Layout & Core Views

1. **Dashboard (`/`)**:
   - **4-Card Market Cockpit**: IHSG index & momentum, Market Breadth (Advancers vs Decliners progress bar), 3-month volume liquidity, and AI market regime recommendation.
   - **Sector Rotation Bar**: Real-time 11-sector performance heatmap with top 2 leaders marked with flame (`🔥`).
   - **Strategy Control Center**: Unified trading horizon pill toggle (`Scalping`, `Daily`, `Swing`) + AI strategy mode selection (`Auto`, `Balanced`, `Growth`, `Conservative`, `Defensive`, `Custom`).
   - **Stock Table**: Master ranking table with real-time text search, instant filter chips (`Score ≥ 80`, `Supertrend BUY`, `R:R ≥ 2.0`), and mobile key trade levels chip row.
2. **Stock Explorer**: Deep single-ticker analytics, Graham fair value projections, Piotroski & Altman breakdown, custom collections, and ownership breakdown.
3. **Stock Screener**: Multi-strategy screener tabs (Top Pick, Passive Dividend, Value Cheap, Quality Compounders, Potential Breakout).
4. **Alpha Legends**: Direct quantitative screening mirroring legends: Warren Buffett, Peter Lynch, Ben Graham, and Joel Greenblatt.
5. **Pension Planner & Tracker**: Monte Carlo and backprop portfolio optimization for multi-asset retirement accumulation (SBN, Saham, RDPU).
