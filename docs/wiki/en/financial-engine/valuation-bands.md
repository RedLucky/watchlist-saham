---
title: "Bloomberg PBND: Historical Valuation Bands"
description: "Statistical P/E and P/BV standard deviation bands (Mean, +/-1 SD, +/-2 SD) for detecting historical valuation extremes."
category: "financial-engine"
tags: ["bloomberg", "pbnd", "pe-bands", "pbv-bands", "standard-deviation", "mean-reversion"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg PBND: Historical Valuation Bands

## 1. Overview & Institutional Rationale

In institutional equity research, assessing whether a stock is "cheap" or "expensive" solely based on an absolute P/E (e.g. 15x) or P/BV (e.g. 2.0x) is frequently misleading. High-moat blue chips (such as `BBCA` or `ICBP`) structurally command valuation premiums, while cyclical commodity stocks trade at cyclical discounts.

The **Bloomberg PBND (`PBND <GO>` / `VBND <GO>`)** methodology measures a stock's current valuation multiple against its own 3-to-5-year historical distribution using statistical standard deviation bands:
- **$+2\text{SD}$**: Extreme Overvaluation (historical ceiling, high risk of mean reversion).
- **$+1\text{SD}$**: High Valuation.
- **$\text{Mean}$**: 5-Year Historical Fair Value.
- **$-1\text{SD}$**: Undervalued.
- **$-2\text{SD}$**: Extreme Historical Discount (statistically rare value accumulation opportunity).

---

## 2. Mathematical Formulation

Given a series of $N$ historical closing prices $P_t$ and current EPS or BVPS:

$$\text{Multiple}_t = \frac{P_t}{\text{Denominator}} \quad (\text{EPS for PE}, \text{BVPS for PBV})$$

### 2.1 Mean & Standard Deviation ($\sigma$)

$$\mu = \frac{1}{N} \sum_{t=1}^{N} \text{Multiple}_t$$

$$\sigma = \sqrt{\frac{1}{N - 1} \sum_{t=1}^{N} (\text{Multiple}_t - \mu)^2}$$

### 2.2 Valuation Bands & Corresponding Price Targets

| Band Level | Valuation Multiple | IDX Price Target | Investment Meaning |
| :--- | :--- | :--- | :--- |
| **$-2\text{SD}$** | $\mu - 2\sigma$ | $\text{roundToIDXTick}((\mu - 2\sigma) \times \text{Denom})$ | Diskon Ekstrem (Statistically Rare Accumulation) |
| **$-1\text{SD}$** | $\mu - 1\sigma$ | $\text{roundToIDXTick}((\mu - 1\sigma) \times \text{Denom})$ | Undervalued (Attractive Margin of Safety) |
| **$\text{Mean}$** | $\mu$ | $\text{roundToIDXTick}(\mu \times \text{Denom})$ | Fair Value (Historical Equilibrium) |
| **$+1\text{SD}$** | $\mu + 1\sigma$ | $\text{roundToIDXTick}((\mu + 1\sigma) \times \text{Denom})$ | Overvalued |
| **$+2\text{SD}$** | $\mu + 2\sigma$ | $\text{roundToIDXTick}((\mu + 2\sigma) \times \text{Denom})$ | Premi Ekstrem (Expansion Ceiling / Take Profit) |

### 2.3 Valuation Z-Score

$$Z = \frac{\text{Current Multiple} - \mu}{\sigma}$$

- $Z \le -1.5$: Extreme Discount
- $-1.5 < Z \le -0.5$: Undervalued
- $-0.5 < Z < 0.5$: Fair Mean
- $0.5 \le Z < 1.5$: Overvalued
- $Z \ge 1.5$: Extreme Premium

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/valuationBands.js`.
- API integration: Embedded into `GET /api/stocks/[ticker]` as `stockDetail.valuationBands`.
- Interactive UI component: `src/components/ValuationBandsPanel.jsx` in Stock Explorer with toggle between P/E and P/BV bands.
