---
title: "Alpha Legends Strategies"
description: "Quantitative strategy screeners mirroring iconic investors adapted for the IDX"
category: "financial-engine"
tags: ["buffett", "lynch", "graham", "greenblatt", "alpha-legends"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Alpha Legends Strategies

Located in `src/lib/alphaLegendEngine.js`. Adapts quantitative philosophies of legendary investors to Indonesia Stock Exchange constraints.

---

## 🦅 1. Warren Buffett (Economic Moat & Super Compounder)
* **Philosophy**: Durable competitive advantage, high return on capital, conservative debt.
* **Criteria**:
  - $\text{ROE} \ge 18\%$ (Consistent compounding).
  - $\text{Operating Profit Margin (OPM)} \ge 15\%$.
  - $\text{Debt-to-Equity (DER)} \le 1.0\times$ (Banks exempted).
  - Positive Free Cash Flow ($\text{FCF} > 0$).

---

## ⚡ 2. Peter Lynch (Fast Growers & PEG Filter)
* **Philosophy**: High growth at reasonable price (GARP).
* **Criteria**:
  - $\text{Revenue Growth} \ge 15\%$.
  - $\text{Net Profit Growth} \ge 15\%$.
  - $\text{PEG Ratio} \le 1.5\times$ (Strict Lynch valuation cutoff).
  - $\text{PER} \le 28\times$.

---

## 🛡️ 3. Benjamin Graham (Defensive Value)
* **Philosophy**: Deep margin of safety, net working capital cushion.
* **Criteria**:
  - $\text{PER} \le 15.0\times$.
  - $\text{PBV} \le 1.5\times$.
  - $\text{PER} \times \text{PBV} \le 22.5$ (The Graham Product).
  - $\text{Current Ratio} \ge 1.5\times$.
  - Multi-year continuous dividend payments (relaxed to 5 years for IDX history).

---

## 🪄 4. Joel Greenblatt (Magic Formula)
* **Philosophy**: High earnings yield + high return on invested capital.
* **Criteria**:
  - $\text{Earnings Yield} = \frac{\text{EPS}}{\text{Price}} \ge 9.0\%$.
  - $\text{Return on Capital (ROC / ROE)} \ge 16.0\%$.
  - Strict compliance: no arbitrary OPM bypass allowed.
