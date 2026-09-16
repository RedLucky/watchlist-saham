---
title: "Bloomberg WACC & ROIC Economic Value Added (EVA)"
description: "Cost of Capital calculation and ROIC vs WACC economic spread analysis to determine true shareholder wealth creation."
category: "financial-engine"
tags: ["bloomberg", "wacc", "roic", "eva", "economic-spread", "cost-of-capital", "capm"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg WACC & ROIC Economic Value Added (EVA)

## 1. Executive Summary

Accounting net profit can be deceptive: a company reporting positive accounting earnings may actually be destroying shareholder wealth if its return on invested capital fails to exceed its weighted average cost of capital.

The **Bloomberg WACC Engine** computes:
1. **Weighted Average Cost of Capital (WACC)**: Minimum hurdle rate of the business.
2. **Return on Invested Capital (ROIC)**: Actual operational return generated on debt and equity capital.
3. **Economic Spread**: $\text{ROIC} - \text{WACC}$.
4. **Economic Value Added (EVA)**: Dollar-denominated economic surplus created over and above all financing costs.

---

## 2. Formulation & Financial Logic

### 2.1 WACC Formula

$$\text{WACC} = \left(\frac{E}{V} \times K_e\right) + \left(\frac{D}{V} \times K_d \times (1 - T)\right)$$

Where:
- $E$: Market Capitalization (Equity Value)
- $D$: Total Debt
- $V = E + D$: Total Enterprise Capital
- $K_e$: Cost of Equity derived via the Capital Asset Pricing Model (CAPM):
  $$K_e = R_f + (\beta \times \text{ERP})$$
  - $R_f = 6.5\%$: Indonesian 10-Year Government Bond Yield (SBN 10Y).
  - $\beta$: Stock Beta (systematic market risk coefficient).
  - $\text{ERP} = 5.5\%$: Equity Risk Premium for Indonesia (Damodaran country risk standard).
- $K_d$: Pre-tax Cost of Debt (corporate lending benchmark in IDR ~8.0%).
- $T = 22\%$: Indonesian Corporate Income Tax Rate (PPh Badan).

### 2.2 ROIC & Economic Spread

$$\text{NOPAT} = \text{Operating Profit (EBIT)} \times (1 - T)$$

$$\text{Invested Capital} = \text{Total Debt} + \text{Total Equity} - \text{Excess Cash}$$

$$\text{ROIC} = \frac{\text{NOPAT}}{\text{Invested Capital}} \times 100\%$$

$$\text{Economic Spread} = \text{ROIC} - \text{WACC}$$

$$\text{EVA} = \text{Invested Capital} \times \left(\frac{\text{Economic Spread}}{100}\right)$$

### 2.3 Verdict Classification

- **$\text{Spread} \ge +5.0\%$**: **Super Value Creator 👑** (Wide moat compounder).
- **$\text{Spread} > 0\%$**: **Value Creator ✨** (Healthy operational return above capital costs).
- **$-3.0\% \le \text{Spread} < 0\%$**: **Marginal Value Destroyer ⚠️** (Asset turnover needs improvement).
- **$\text{Spread} < -3.0\%$**: **Value Destroyer 🚨** (Severe capital destruction despite accounting profits).

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/waccEngine.js`.
- API integration: Embedded into `GET /api/stocks/[ticker]` as `stockDetail.wacc`.
- Interactive UI component: `src/components/EconomicValuePanel.jsx` in Stock Explorer featuring capital structure weights ($W_e$ vs $W_d$) and economic spread indicators.

