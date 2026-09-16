---
title: "Bloomberg CA: Corporate Actions & Market Catalyst Calendar"
description: "Timeline and countdown engine for cash dividends, RUPS (General Meetings AGM/EGM), and seasonal financial release windows."
category: "financial-engine"
tags: ["bloomberg", "ca", "corporate-actions", "catalyst-calendar", "rups", "earnings-release", "dividends"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg CA: Corporate Actions & Market Catalyst Calendar

## 1. Overview & Institutional Rationale

In financial markets, stock price re-ratings are overwhelmingly catalyzed by corporate events rather than random price fluctuations. The **Bloomberg CA (`CA <GO>`)** functionality provides institutional desks with a real-time event diary and forward countdown to key catalysts:
1. **Dividend Schedule**: Payment dates, cash amounts per share, and ex-dividend windows.
2. **General Meetings (RUPS / AGM / EGM)**: Annual general shareholder meetings approving dividend distributions, board member changes, and strategic capital plans.
3. **Quarterly Financial Report Release Seasons**: Standard regulatory submission windows mandated by OJK & IDX (FY Annual, Q1, Q2, and Q3 reporting cycles).

---

## 2. Event Synthesis & Window Rules

### 2.1 Cash Dividends
- Source: Historical and announced cash dividend records.
- Countdown Logic:
  - $\Delta_{\text{days}} = \text{Target Date} - \text{Today}$
  - Realized vs. Upcoming status badge classification.

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

- Pure calculation engine: `src/lib/corporateActionEngine.js`.
- API integration: Injected in `GET /api/stocks/[ticker]` as `stockDetail.corporateActions`.
- UI component: `src/components/CorporateActionsPanel.jsx`.
- Unit test suite: `tests/corporateAction.test.js`.

