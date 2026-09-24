---
title: "Bloomberg CA: Corporate Actions & Market Catalyst Calendar"
description: "Timeline, 4-date dividend schedule engine (Cum, Ex, DPS, Payment), and multi-year historical distribution calendar for IDX equities."
category: "financial-engine"
tags: ["bloomberg", "ca", "corporate-actions", "catalyst-calendar", "rups", "earnings-release", "dividends", "cum-date", "ex-date"]
last_updated: "2026-09-24"
version: "2.0.0"
---

# Bloomberg CA: Corporate Actions & Market Catalyst Calendar

## 1. Overview & Institutional Rationale

In equity markets, stock re-ratings and liquidity rotations are overwhelmingly catalyzed by corporate announcements rather than purely random fluctuations. The **Bloomberg CA (`CA <GO>`)** functionality provides institutional investors and retail traders with a unified, real-time corporate action monitor and countdown diary:
1. **Official IDX 4 Sacred Dividend Dates**:
   - **Cum Date**: Final trading session to purchase shares with dividend entitlement.
   - **Ex Date**: First trading session without dividend entitlement (potential price adjustment).
   - **Recording Date (DPS)**: Official shareholder registry timestamp at KSEI (16:00 WIB).
   - **Payment Date**: Date cash dividends are credited into client RDN accounts.
2. **Multi-Year Historical Dividend Track Record**: Merged and deduplicated multi-year distribution history compiled from official IDX company profile disclosures and Yahoo Finance corporate actions.
3. **General Meetings (RUPS / AGM / EGM)**: Annual general shareholder meetings approving dividend payout ratios, retained earnings allocations, and strategic governance mandates.
4. **Quarterly Financial Report Release Seasons**: Submission windows mandated by OJK & IDX (FY Audited, Q1, Q2, and Q3 reporting cycles).

---

## 2. Event Synthesis & Window Rules

### 2.1 Cash Dividend Schedule & The 4 Sacred Dates
- **Data Sources**: Official IDX profile disclosures (`StockData.dividendHistory`) augmented by Yahoo Finance historical dividend distributions (`StockData.fundamentals.yahooDividendHistory`).
- **DPS Resolution Hierarchy**:
  1. Primary: `div.CashDividenPerSaham` (official Rupiah per share from IDX).
  2. Mathematical Derivative: If `CashDividenPerSaham == 0` but `CashDividenTotal > 0` and `sharesOutstanding > 0`, compute $\text{DPS} = \frac{\text{CashDividenTotal}}{\text{sharesOutstanding}}$.
  3. Time-Window Pairing: If missing, match the nearest Yahoo Finance distribution within a 15-day tolerance window.
  4. Static Fallback: `fundamentals.dividendRate`.
- **Status & Lifecycle Stages**:
  - `CUM_ACTIVE` ($\text{Today} \le \text{Cum Date}$): Stock can still be purchased to capture the upcoming dividend.
  - `WAITING_PAYMENT` ($\text{Cum Date} < \text{Today} \le \text{Payment Date}$): Entitlement locked; awaiting cash settlement into RDN.
  - `COMPLETED` ($\text{Today} > \text{Payment Date}$): Distribution completed.

### 2.2 Quarterly Earnings Release Windows (IDX / OJK Framework)

| Reporting Period | Standard Submission Window | Typical Market Window |
| :--- | :--- | :--- |
| **Full Year (FY)** | Max 90 days post year-end | March – April |
| **Q1 (3 Months)** | Max 30–60 days post quarter | May – June |
| **Q2 (Interim)** | Max 30–60 days post quarter | July – August |
| **Q3 (9 Months)** | Max 30–60 days post quarter | October – November |

### 2.3 RUPS Season
- Standard RUPST Season in Indonesia runs predominantly between **April and June**, following the publication of full-year audited financial reports.

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/corporateActionEngine.js` (`parseDividendScheduleItem`, `compileHistoricalDividends`, `buildCorporateActionsTimeline`).
- API integration: Injected in `GET /api/stocks/[ticker]` as:
  - `stockDetail.corporateActions`: Array of catalyst timeline events.
  - `stockDetail.dividendSchedule`: Structured 4-date active/latest dividend object.
  - `stockDetail.historicalDividends`: Chronological multi-year dividend distribution history.
  - `stockDetail.dividendSummary`: Summary metrics (yield, DPR, streak).
- UI component: `src/components/CorporateActionsPanel.jsx` (featuring interactive 3-tab layout: Upcoming 4-Date Stepper, Multi-Year History Table, and RUPS/Earnings Agenda).
- Detail view integration: `src/components/StockExplorer.jsx` (metric summary and panel mount).
- Unit test suite: `tests/corporateAction.test.js`.
