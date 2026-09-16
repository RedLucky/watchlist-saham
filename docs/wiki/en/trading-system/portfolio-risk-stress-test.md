---
title: "Bloomberg PORT & MARS: Portfolio Risk, Beta & Macro Stress Testing"
description: "Institutional multi-asset portfolio risk analytics, Weighted Beta, 1-Day 95% Value at Risk (VaR), and macro shock stress testing."
category: "trading-system"
tags: ["bloomberg", "port", "mars", "portfolio-risk", "weighted-beta", "var-95", "stress-testing", "risk-management"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg PORT & MARS: Portfolio Risk, Beta & Macro Stress Testing

## 1. Overview & Institutional Rationale

Modern institutional asset management requires continuous monitoring of systemic risk, leverage exposure, and market sensitivity rather than merely looking at historical unrealized profit. 

The **Bloomberg PORT (`PORT <GO>`) & MARS (`MARS <GO>`)** engine provides investors with:
1. **Weighted Portfolio Beta ($\beta_{\text{port}}$)**: Quantifying the portfolio's aggregate volatility relative to the Jakarta Composite Index (IHSG).
2. **Parametric Value at Risk (VaR 95% 1-Day)**: Estimating the maximum expected capital loss over a single trading day under normal market conditions with a 95% confidence interval.
3. **Concentration & Sector Risk Warnings**: Identifying dangerous single-stock over-weighting (> 35%) or excessive single-sector concentration (> 50%).
4. **Macro Stress Testing Cockpit**: Real-time simulation of 4 severe market shocks:
   - *IHSG Flash Crash (-5.0%)*
   - *BI Rate Hike (+50 bps)*
   - *Global Commodity Supercycle (+10%)*
   - *Rupiah FX Depreciation to Rp 17,000 / USD*

---

## 2. Mathematical Formulations

### 2.1 Weighted Portfolio Beta

Given $M$ portfolio holdings with market values $V_i$ and asset betas $\beta_i$:

$$\text{Total Portfolio Value} = V_{\text{total}} = \sum_{i=1}^{M} V_i$$

$$w_i = \frac{V_i}{V_{\text{total}}}$$

$$\beta_{\text{port}} = \sum_{i=1}^{M} w_i \times \beta_i$$

### 2.2 Parametric Value at Risk (VaR 95%)

$$\text{VaR}_{95\%} = Z_{95} \times \sigma_{\text{daily}} \times \beta_{\text{port}} \times V_{\text{total}}$$

- $Z_{95} = 1.645$ (Standard normal distribution critical value for one-tailed 95% confidence).
- $\sigma_{\text{daily}} = 1.5\%$ (Baseline daily market standard deviation).

### 2.3 Macro Stress Testing Scenarios

$$\Delta V_{\text{scenario}} = V_{\text{total}} \times \sum_{i=1}^{M} \left(w_i \times \text{AssetShock}_i\right)$$

- **IHSG Flash Crash**: $\text{AssetShock}_i = -5.0\% \times \beta_i$.
- **BI Rate Hike**: Evaluates interest coverage and debt leverage ($\text{DER}_i > 1.8\times \implies -3.5\%$, Banking NIM $+0.5\%$).
- **Commodity Shock**: Energy and Basic Materials receive $+8.0\%$, while Consumer Goods face input cost compression ($-2.5\%$).
- **Rupiah FX Shock**: Exporters (Coal, Nickel, CPO) gain $+4.5\%$, heavy USD-debt import sectors drop $-4.0\%$.

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/portfolioRiskEngine.js`.
- API integration: Embedded in `GET /api/portfolio` response as `riskAnalytics`.
- UI cockpit: Interactive Bloomberg PORT/MARS dashboard integrated into `src/components/PortfolioPanel.jsx`.
- Unit test suite: `tests/portfolioRisk.test.js`.
