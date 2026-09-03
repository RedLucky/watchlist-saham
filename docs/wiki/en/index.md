# Watchlist Saham - Knowledge Base Index

> **Notice for AI Agents**: This index is the primary navigation map for the codebase. Always read this file first before making changes or answering architectural questions.

---

## 🏛️ System Architecture

* [System Overview](./architecture/system-overview.md) — High-level stack overview (Next.js 16, Turbopack, Tailwind CSS, PostgreSQL, Prisma, Plus Jakarta Sans).
* [Data Pipeline & Sync](./architecture/data-pipeline.md) — Fast price synchronization, deep financial statement sync, Yahoo Finance integration, and round-robin queues.
* [Database Models & Schemas](./architecture/database-models.md) — Complete Prisma schema definitions, BigInt serialization rules, relational integrity, and indices.

---

## 📊 Financial & Quantitative Engine

* [Scoring Framework](./financial-engine/scoring-framework.md) — Multi-factor scoring matrix (0–100 scale), sub-scores, weights per style (Scalping, Daily, Swing), and mode adaptations.
* [Valuation Models & Fair Value](./financial-engine/valuation-models.md) — Benjamin Graham Number, Intrinsic Fair Value with dynamic bond yield, Altman Z-Score, Piotroski F-Score, and CAGR formulas.
* [Technical Indicators & Signals](./financial-engine/technical-signals.md) — Wilder's RSI 14, Supertrend + DEMA 20, MACD, Bollinger Bands, and Candlestick pattern detection.
* [Alpha Legends Strategies](./financial-engine/alpha-legends.md) — Quantitative strategy filters adapted for the Indonesia Stock Exchange (Warren Buffett, Peter Lynch, Ben Graham, Joel Greenblatt).

---

## 🎯 Trading System & Market Operations

* [Order Lifecycle & Win Rate Tracking](./trading-system/order-lifecycle.md) — Real-world order simulation: WAITING_BUY (queue/limit) -> OPEN (matched) -> WIN/LOSS/EXPIRED, and win rate calculation.
* [Smart Money Flow & KSEI](./trading-system/smart-money-flow.md) — Institutional distribution tracking, foreign flow estimation, scriptless shareholder analysis from KSEI.
