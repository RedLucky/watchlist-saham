---
title: "Bloomberg BRKR: Broker Concentration & Bandarmologi Flow"
description: "Institutional broker concentration ratios (CR1, CR3, CR5), Bandarmologi Flow Index (BFI), and big player accumulation/distribution."
category: "trading-system"
tags: ["bloomberg", "brkr", "broker-summary", "bandarmologi", "concentration-ratio", "smart-money"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg BRKR: Broker Concentration & Bandarmologi Flow

## 1. Overview & Institutional Rationale

In the Indonesian equity market, price discovery is heavily influenced by domestic and foreign institutional brokers executing large order blocks. The **Bloomberg BRKR (`BRKR <GO>`)** module measures the concentration of buyer and seller brokers:
1. **Concentration Ratios (CR1, CR3, CR5)**: The percentage share of total trading turnover controlled by the single largest, top 3, and top 5 brokers.
2. **High Concentration Threshold ($\text{CR3} \ge 55\%$)**: Signals that trading is dominated by institutional syndicates rather than retail participants.
3. **Bandarmologi Flow Index (BFI)**: Quantifies net buyer accumulation vs seller distribution pressure.
4. **Flow Verdict**: Classifies behavior into *Big Accumulation*, *Normal Accumulation*, *Neutral*, *Normal Distribution*, and *Big Distribution*.

---

## 2. Mathematical Formulations

$$\text{CR}_k = \sum_{j=1}^{k} \frac{\text{Turnover}_j}{\text{Total Turnover}} \times 100\%$$

- $\text{CR3} \ge 60\% \land \text{BFI} > 15 \implies$ **Akumulasi Masif (Big Accumulation) 🐋**
- $\text{CR3} \ge 60\% \land \text{BFI} < -15 \implies$ **Distribusi Masif (Big Distribution) 🚨**

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/brokerConcentrationEngine.js`.
- API integration: Embedded in `GET /api/stocks/[ticker]` as `stockDetail.brokerConcentration`.
- UI presentation: Rendered in `src/components/SmartMoneyLiquidityPanel.jsx`.
- Unit test suite: `tests/brokerConcentration.test.js`.

