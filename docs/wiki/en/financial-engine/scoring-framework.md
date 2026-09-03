---
title: "Scoring Framework"
description: "Comprehensive multi-factor quantitative scoring matrix, weights, and mode adaptations"
category: "financial-engine"
tags: ["scoring", "multi-factor", "weights", "ranking"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Scoring Framework

The scoring engine evaluates every stock on a normalized scale of **0 to 100**.

---

## 🏛️ Six Core Score Pillars

1. **Fundamental Score (0–100)**:
   - Evaluates profitability, operating efficiency, capital health, and debt burden.
   - Key inputs: ROE (Return on Equity), OPM (Operating Profit Margin), DER (Debt-to-Equity Ratio), Cashflow.
   - *Financial Sector Exception*: Banking emiten with high DER (e.g. DER 5.0–7.0x) are **not penalized** for leverage because deposits from customers are classified as liabilities on bank balance sheets.
2. **Valuation Score (0–100)**:
   - PER vs Sector Median (35%)
   - PBV vs Sector Median (30%)
   - Earnings Yield = $\frac{\text{EPS}}{\text{Price}} \times 100$ (20%)
   - PEG Ratio (15%)
3. **Technical Score (0–100)**:
   - Wilder's RSI 14 (momentum & oversold/overbought)
   - Trend alignment: SMA 20, 50, 200
   - Volume expansion relative to prior 5-day baseline (excluding today's bar)
4. **Trending Score (0–100)**:
   - Supertrend (ATR 10, Multiplier 3.0) + DEMA 20 golden cross breakout confirmation.
5. **Dividend Score (0–100)**:
   - Dividend Yield % relative to Bank Indonesia risk-free benchmark.
   - Payout stability and multi-year dividend consistency.
6. **Smart Money / Bandarmologi (0–100)**:
   - KSEI institutional net accumulation and foreign block buying flows.

---

## ⚖️ Composite Weights by Trading Horizon & Strategy

| Horizon / Mode | Fundamental | Valuation | Technical | Trending | Smart Money |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Scalping ⚡** | 10% | 10% | 40% | 25% | 15% |
| **Daily 📊** | 20% | 15% | 30% | 20% | 15% |
| **Swing 📈** (Default) | 30% | 20% | 20% | 15% | 15% |
| **Growth 🚀** | 35% | 10% | 20% | 25% | 10% |
| **Conservative 🛡️** | 45% | 25% | 10% | 10% | 10% |
| **Defensive 🔒** | 50% | 30% | 10% | 5% | 5% |
