---
title: "Smart Money Flow & KSEI Analysis"
description: "Bandarmologi mechanics, KSEI scriptless holding analysis, volume spike detection, and multi-timeframe Domestic/Foreign transaction flow engine"
category: "trading-system"
tags: ["smart-money", "ksei", "bandarmologi", "institutional-flow", "transaction-flow"]
last_updated: "2026-10-09"
version: "1.1.0"
---

# Smart Money Flow & KSEI Analysis

Evaluates whether big institutions (Smart Money) and foreign/domestic participants are accumulating or distributing shares across daily to yearly windows.

---

## 🏛️ 1. KSEI Scriptless Distribution Metrics
Located in `src/lib/scoring/smartMoney.js` and `src/scripts/sync-ksei.js`.

* **Institutional Ownership Ratio**:
  - Banks, Mutual Funds (Reksadana), Insurance (Asuransi), and Pension Funds (Dana Pensiun).
  - A persistent rise in institutional share count while retail share count drops indicates **Accumulation**.
* **Foreign Flow (Asing)**:
  - Net buy / net sell by foreign institutional participants over 5, 20, and 60 trading days.

---

## 📊 2. Volume Spike & Anomaly Detection
Located in `src/lib/scoring/technical.js`.

* **Baseline Calculation**: Computes 5-day average volume strictly **before** the current day to avoid volume self-inclusion bias:
  $$\text{Baseline Vol} = \text{Average}(\text{Volumes}[-6 \dots -1])$$
* **Accumulation Spike**: When $\text{Today's Volume} \ge 2.0 \times \text{Baseline Vol}$ with price closing in the upper 40% of the daily candle range.

---

## 💸 3. Multi-Timeframe Transaction Flow Engine (Inflow, Outflow & Netflow)
Located in `src/lib/transactionFlowEngine.js` (`calculateTransactionFlows`).

Computes **Inflow (Gross Buy)**, **Outflow (Gross Sell)**, and **Netflow (Net Buy/Sell)** for **Foreign (Asing)**, **Domestic (Lokal)**, and **Active Money Flow** across four BEI trading windows:
* **Daily (`1d`)**: 1 trading day (`1HK`)
* **Weekly (`1w`)**: 5 trading days (`5HK`)
* **Monthly (`1m`)**: 20 trading days (`20HK`)
* **Yearly (`1y`)**: 250 trading days (`250HK`)

### Hybrid Data Architecture
1. **Official IDX Stock Summary (`source: 'idx'`)**:
   - When daily BEI *Ringkasan Saham* records (`foreignBuy`, `foreignSell`, `volume`, `value`) exist in `technicals.idxFlow`, foreign inflow/outflow uses exact BEI share counts valued at the day's volume-weighted average price ($\text{VWAP} = \text{value} / \text{volume}$).
   - Domestic inflow/outflow is derived by market clearing conservation: $\text{Domestic Buy} = \max(0, \text{Volume} - \text{Foreign Buy})$ and $\text{Domestic Sell} = \max(0, \text{Volume} - \text{Foreign Sell})$.
2. **OHLCV + KSEI Calibrated Estimation (`source: 'estimated'`)**:
   - For historical days without scraped IDX summary rows, active buying ratio (`computeDailyBuyingRatio`) blends **Close Location Value** ($\text{CLV} = \frac{\text{Close} - \text{Low}}{\text{High} - \text{Low}}$, weight $65\%$) and a logistic day-over-day return curve ($35\%$).
   - Total volume is partitioned between Foreign and Domestic using `kseiLatest.foreignPercent` (clamped to $[5\%, 85\%]$, default $35\%$) with directional buy-ratio tilts (`resolveKseiFlowWeights`) scaled from monthly KSEI foreign and domestic institutional deltas.
3. **Units & Dominant Flow Classification**:
   - Every window outputs **Rupiah (`Rp`)**, **Lot** ($\text{shares} / 100$), and **% of Total Turnover** (`shareOfTurnoverPct`, `netflowPct`), plus a `dominantPlayer` badge (`FOREIGN_ACCUMULATION`, `DOMESTIC_ACCUMULATION`, `FOREIGN_DISTRIBUTION`, `DOMESTIC_DISTRIBUTION`, or `BALANCED`).
4. **Provider & API Exposure**:
   - `src/lib/providers/DatabaseProvider.js` attaches `transactionFlow` to every mapped stock in the 30-second in-memory cache (`getStocks()`).
   - `GET /api/stocks` exposes `transactionFlow` on both candidate list items and `?ticker=XXXX` single-stock lookups (used by Analisis Saham `DetailPanel`).
   - `GET /api/stocks/[ticker]` exposes `transactionFlow` in the full stock dossier response (used by `StockExplorer`).
5. **UI Presentation & Component Integration**:
   - `src/lib/transactionFlowPresenter.js` provides pure Rupiah (`formatFlowRupiah`), BEI Lot (`formatFlowLots`), buy/sell pressure split (`computeGrossSplitPct`), and Bursa 1985 semantic badge helpers (`getNetflowTone`, `getDominantFlowBadge`, `getFlowSourceBadge`).
   - `src/components/TransactionFlowPanel.jsx` renders interactive `1d`/`1w`/`1m`/`1y` timeframe tabs, 3-column Foreign / Domestic / Active Market cards with Gross Buy, Gross Sell, buy/sell pressure bars, Netflow box, and a 4-period side-by-side comparison matrix table in both `DetailPanel.jsx` (Analisis Saham) and `StockExplorer.jsx` (`Smart Money & KSEI` tab).
6. **IHSG Market Composite Aggregation & Executive Briefing**:
   - `aggregateMarketTransactionFlows(stocks, ihsgStock)` in `src/lib/transactionFlowEngine.js` aggregates bottom-up Foreign, Domestic, and Active Market flows across all active stocks for `1d`, `1w`, `1m`, and `1y`, falling back to index ticker `^JKSE` when stocks are unpopulated.
   - `generateMarketBriefing(marketData, marketFlow)` synthesizes index trend, advance/decline ratio, volume activity, and net foreign flow into actionable market status (`bullish_accumulation`, `bullish_divergence`, `bearish_distribution`, `bearish_accumulation`, `sideways_consolidation`) with 4 executive bullet takeaways and tactical advice.
