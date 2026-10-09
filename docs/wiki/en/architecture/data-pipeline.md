---
title: "Data Pipeline & Sync Service"
description: "Architecture of market data ingestion, background sync queues, Yahoo Finance integration, and IDX Stock Summary flow scraping"
category: "architecture"
tags: ["data-pipeline", "yahoo-finance", "sync-service", "ksei", "idx-flow"]
last_updated: "2026-10-09"
version: "1.1.0"
---

# Data Pipeline & Sync Service

The application utilizes a tiered synchronization engine designed to stay fresh while avoiding Yahoo Finance rate limits and IP throttling.

---

## ⚡ 1. Fast Price Sync (`fastSyncPrices`)

* **Frequency**: Triggered automatically in background workers (every 5–15 minutes) or on demand via `POST /api/sync`.
* **Scope**: Tickers currently in active user watchlists, collections, and top 250 liquid IDX tickers.
* **Mechanism**:
  - Uses `yahooFinance.quote(ticker)` in batch chunks.
  - Updates: `price`, `changePercent`, `volume`, `lastPriceSync`.
  - Converts BigInt volume fields safely without JSON serialization crashes.

---

## 🔬 2. Deep Fundamentals Sync (`deepSyncStockOnce`)

* **Frequency**: Nightly or when `lastDeepSync` > 24 hours ago.
* **Scope**: Evaluates full `quoteSummary` modules:
  - `financialData`: Operating margins (OPM), Gross margins (GPM), Current Ratio, Debt to Equity (DER), ROE, ROA.
  - `defaultKeyStatistics`: Shares Outstanding, Book Value, Enterprise Value, Forward PE, PEG Ratio.
  - `incomeStatementHistory` & `cashflowStatementHistory`: Free Cash Flow, Net Income history, revenue growth.
* **Storage**: JSON strings in PostgreSQL (`StockData.fundamentals`, `StockData.technicals`, `StockData.ownership`, `StockData.dividendHistory`). Preserves existing `technicals.idxFlow` and `technicals.idxFlowUpdatedAt` across deep sync updates.

---

## 🏛️ 3. KSEI Scriptless & Institutional Holding Sync

* **Source**: KSEI (Kustodian Sentral Efek Indonesia) ownership distribution reports.
* **Script**: `src/scripts/sync-ksei.js`
* **Data points extracted**:
  - Local vs Foreign institutional ratio (Banks, Mutual Funds, Pension Funds, Insurance).
  - Retail vs Conglomerate insider concentration.
  - Historical scriptless volume movements for Smart Money Accumulation scoring.

---

## 💸 4. IDX Stock Summary Daily Flow Sync (`sync-idx-flow.js`)

* **Source**: Indonesia Stock Exchange (*Ringkasan Saham BEI* — `TradingSummary/GetStockSummary`).
* **Script**: `src/scripts/sync-idx-flow.js` (invoked daily via `src/scripts/scraper-cron.js`).
* **Mechanism**:
  - Scrapes recent weekday stock summary payloads via Puppeteer (`parseIdxStockSummaryPayload`).
  - Extracts official per-ticker `ForeignBuy`, `ForeignSell`, `Volume`, `Value`, `Close`, `High`, and `Low`.
  - Deduplicates by trading date and retains a rolling 250-trading-day history (`mergeIdxFlowHistory`) inside `StockData.technicals.idxFlow` without requiring a Prisma schema migration.

