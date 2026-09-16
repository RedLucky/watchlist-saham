---
title: "Bloomberg ARA / ARB: IDX Auto-Rejection Limits & Tick Distance Ladder"
description: "Regulatory daily price fluctuation limits (ARA/ARB), precision tick counting, and real-time execution ladder for Indonesian stocks."
category: "trading-system"
tags: ["bloomberg", "ara", "arb", "auto-rejection", "tick-distance", "order-execution", "bei-rules"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg ARA / ARB: IDX Auto-Rejection Limits & Tick Distance Ladder

## 1. Overview & Institutional Rationale

In the Indonesia Stock Exchange (IDX / BEI), trading safety mechanisms impose daily symmetric percentage price limits called **Auto-Rejection**. Orders exceeding these bands are automatically rejected by JATS (Jakarta Automated Trading System).

The **Bloomberg ARA / ARB (`ARA <GO>`)** module equips traders and execution algorithms with:
1. **Official BEI Auto-Rejection Price Bands**: Exact ARA (Upper Limit) and ARB (Lower Limit) prices calculated from the previous closing price and rounded down/up to valid IDX tick fractions.
2. **Precision Tick Distance**: Exact number of discrete price steps between current market price and the ceiling/floor limits.
3. **Execution Ladder**: A 7-step price milestone ladder (`[ARA, +10%, +5%, Current Price, -5%, -10%, ARB]`) displaying percentage changes and tick distance from the current price.
4. **Proximity Alerts**: Real-time warnings when an emiten trades within $\le 3$ ticks of ARA or ARB.

---

## 2. Mathematical Formulation & Regulatory Rules

### 2.1 BEI Auto-Rejection Percentage Tiers (Reguler Board)

| Previous Close Price ($P_{\text{prev}}$) | Maximum Daily Gain / Loss Limit ($\%$) | Minimum Valid Tick Step |
| :--- | :--- | :--- |
| **$<\text{Rp } 200$** | $\pm 35\%$ | Rp 1 |
| **$\text{Rp } 200 - \text{Rp } 5.000$** | $\pm 25\%$ | Rp 2 (200–500), Rp 5 (500–2k), Rp 10 (2k–5k) |
| **$>\text{Rp } 5.000$** | $\pm 20\%$ | Rp 25 |
| **Acceleration Board** | $\pm 10\%$ | Rp 1 |

### 2.2 Price Calculations & Rounding Rules

$$\text{ARA Price} = \text{roundToIDXTick}\left(P_{\text{prev}} \times (1 + \frac{\text{Limit}\%}{100}), \text{'down'}\right)$$

$$\text{ARB Price} = \max\left(50, \text{roundToIDXTick}\left(P_{\text{prev}} \times (1 - \frac{\text{Limit}\%}{100}), \text{'up'}\right)\right)$$

*Note: On the regular board, ARB cannot breach the floor price of Rp 50.*

### 2.3 Precision Tick Distance

Given prices $P_1 < P_2$, the tick distance is computed iteratively:

$$\text{Ticks}(P_1, P_2) = \sum_{p = P_1}^{P_2 - 1} 1 \quad \text{where each step size is } \text{getIDXPriceStep}(p)$$

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/idxExecutionLimits.js`.
- API integration: Returned inside `GET /api/stocks/[ticker]` as `stockDetail.executionLimits`.
- UI component: `src/components/AutoRejectionLadderPanel.jsx`.
- Unit test suite: `tests/idxExecutionLimits.test.js`.
