---
title: "Valuation Models & Fair Value"
description: "Mathematical formulations for Graham Fair Value, Altman Z-Score, Piotroski F-Score, and CAGR"
category: "financial-engine"
tags: ["graham", "altman-z", "piotroski", "cagr", "fair-value"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Valuation Models & Fair Value

The application employs battle-tested value investing formulas adapted specifically for the emerging market dynamics of the Indonesia Stock Exchange (IDX).

---

## 📐 1. Benjamin Graham Intrinsic Fair Value

Graham's revised valuation formula accounts for long-term growth and prevailing government bond yields:

$$\text{Fair Value} = \frac{\text{EPS} \times (8.5 + 2 \times g) \times 4.4}{Y}$$

Where:
* $\text{EPS}$: Trailing 12-Month Net Earnings Per Share.
* $g$: Net profit CAGR (Compounded Annual Growth Rate) over 3–5 years, **strictly capped at a conservative maximum of 25.0%** to prevent speculative growth distortions.
* $4.4$: Benjamin Graham's historical baseline AAA corporate bond yield.
* $Y$: Current Indonesian 10-Year Government Benchmark Bond Yield (SUN 10Y ~6.5%–7.0%). Inverse relationship: higher bond yields naturally compress equity fair values.

### Margin of Safety (MoS)
$$\text{MoS (\%)} = \frac{\text{Fair Value} - \text{Current Price}}{\text{Fair Value}} \times 100\%$$

* $\text{MoS} \ge 30\%$: Strong Undervalued (High margin of safety).
* $0\% < \text{MoS} < 30\%$: Fairly Valued.
* $\text{MoS} \le 0\%$: Premium / Overvalued.

---

## 🏛️ 2. Benjamin Graham Number
$$\text{Graham Number} = \sqrt{22.5 \times \text{EPS} \times \text{BVPS}}$$
Where $\text{BVPS}$ is Book Value Per Share ($\frac{\text{Price}}{\text{PBV}}$).

---

## 🛡️ 3. Altman Z-Score (Bankruptcy & Default Risk)
Adapted for emerging market non-manufacturing corporations:
* $Z > 2.90$: **Safe Zone** (Healthy financial structure).
* $1.23 \le Z \le 2.90$: **Grey Zone** (Moderate financial distress risk).
* $Z < 1.23$: **Distress Zone** (High insolvency vulnerability).
* *Note on Banking Sector*: Standard Altman Z-score is mathematically disabled for banks (defaults to neutral 3.0) due to deposit-backed balance sheet structures.

---

## 📋 4. Piotroski F-Score (0–9 Scale)
Evaluates fundamental momentum across Profitability, Leverage/Liquidity, and Operating Efficiency:
* **Score 8–9**: Very Strong Fundamental Momentum (High quality compounder).
* **Score 5–7**: Stable / Neutral.
* **Score 0–4**: Deteriorating Fundamentals (High risk of earnings manipulation or operational stress).
