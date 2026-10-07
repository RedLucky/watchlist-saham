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
| **Typography** | IBM Plex Sans / Serif / Mono (`next/font/google`) | `font-sans` for UI, `font-serif` for page titles, `font-mono` for prices & tickers; `tabular-nums` for financial alignment. |
| **Styling** | Tailwind CSS 4 + semantic tokens | "Bursa 1985" theme: light **Kertas Bursa** (`#f4efe4`) and dark **Terminal Fosfor** (`#0d0b08`), follows the device by default. See [ADR 0001](../adr/0001-bursa-1985-design-system.md). |
| **Charts** | Lightweight Charts + SVG | Real-time candlestick charts with OHLCV data, Supertrend bands, and DEMA overlays. |
| **Local AI Engine** | Llama.cpp Docker (Headless) | Standalone background container running local GGUF (`Qwen3.8-4B-Q4_K_M.gguf`) via an asynchronous polling worker to prevent UI blocking. |
| **Agent Optimization** | Rust Token Killer (`rtk`) | Shell commands wrapped via `rtk` to minimize LLM token overhead by ~55%. |

---

## 🏛️ Application Layout & Core Views

1. **Dashboard (`/`)**:
   - **4-Card Market Cockpit**: IHSG index & momentum, Market Breadth (Advancers vs Decliners progress bar), 3-month volume liquidity, and AI market regime recommendation.
   - **Sector Rotation Bar**: Real-time 11-sector performance heatmap with top 2 leaders marked with flame (`🔥`).
   - **Strategy Control Center**: Unified trading horizon pill toggle (`Scalping`, `Daily`, `Swing`) + AI strategy mode selection (`Auto`, `Balanced`, `Growth`, `Conservative`, `Defensive`, `Custom`).
   - **Stock Table**: Master ranking table with real-time text search, instant filter chips (`Score ≥ 80`, `Supertrend BUY`, `R:R ≥ 2.0`), and mobile key trade levels chip row.
2. **Stock Explorer**: 
   - **Three page tabs** — `Koleksi Saham` (default), `Pencarian Saham IDX` and `Komparasi`. The Koleksi page is a full-width card grid with summary stats, drag-and-drop reordering and 30s auto-sync; clicking a card opens the stock in the Pencarian tab with a "back to collection" button. See [Stock Explorer Pages](./stock-explorer.md).
   - **Interactive Chart & Key Metrics**: Real-time candlestick charts, moving averages, 8-metric valuation badges (Graham, Fair Value, Margin of Safety, CAGR, F-Score, Z-Score, Composite Score, Dividend Score).
   - **Analytical Cockpit Category Tabs (Opsi 4)**: 4-category consolidated dashboard below the chart:
     - `Valuasi & Finansial`: Relative Valuation Peers (RV), Historical Valuation Bands (PBND), ROIC vs WACC & EVA, Scenario Forecaster.
     - `Musim & Dividen`: 5-Year Monthly Seasonality Heatmap, Dividend Trap Analyzer & Run-Rate, Corporate Actions Calendar & Catalyst Timeline.
     - `Smart Money & Aliran`: KSEI Ownership Shift, Broker Concentration (Bandarmologi), Volume Profile, Auto-Rejection Limits (ARA/ARB) & Execution Ladder.
     - `Riset AI & Sentimen`: Bloomberg Intelligence Institutional Research Dossier and Algorithmic News Sentiment.
3. **Stock Screener**: Multi-strategy screener tabs (Top Pick, Passive Dividend, Value Cheap, Quality Compounders, Potential Breakout).
4. **Alpha Legends**: Direct quantitative screening mirroring legends: Warren Buffett, Peter Lynch, Ben Graham, and Joel Greenblatt.
5. **Pension Planner & Tracker**: Monte Carlo and backprop portfolio optimization for multi-asset retirement accumulation (SBN, Saham, RDPU).
