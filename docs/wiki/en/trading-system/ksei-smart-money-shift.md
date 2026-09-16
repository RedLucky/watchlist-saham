---
title: "Bloomberg OWN / HDS: KSEI Smart Money Ownership Map & MoM Shift"
description: "Institutional Month-over-Month (MoM) ownership delta, retail vs institutional distribution, and scriptless registry analytics."
category: "trading-system"
tags: ["bloomberg", "own", "hds", "ksei", "smart-money", "institutional-flow", "shareholders"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg OWN / HDS: KSEI Smart Money Ownership Map & MoM Shift

## 1. Overview & Institutional Rationale

Daily broker summaries can be heavily distorted by high-frequency wash trading and intra-day scalping. The ultimate source of truth for genuine institutional positioning in Indonesian equities is the monthly scriptless registry published by **KSEI (Kustodian Sentral Efek Indonesia)**.

The **Bloomberg OWN (`OWN <GO>`) & HDS (`HDS <GO>`)** engine delivers:
1. **Month-over-Month (MoM) Institutional Shift ($\Delta\text{Inst}$)**: Tracks net accumulation or distribution by institutional funds.
2. **Retail vs Institutional Divergence**: Detects classic institutional accumulation phases where smart money absorbs shares while retail holdings decrease.
3. **Domestic Sub-Category Granularity**: Detailed holdings across Pension Funds (`PF`), Mutual Funds (`MF`), Insurance Companies (`IS`), Banks (`IB`), and Securities Companies (`SC`).
4. **Controller vs Public Free Float**: Distinguishes strategic controlling stakes from tradable public liquidity.

---

## 2. Mathematical Formulation & Verdict Logic

Given current period $T$ and previous period $T-1$:

$$\Delta\text{Institutional} = \text{Institutional}\%_T - \text{Institutional}\%_{T-1}$$

$$\Delta\text{Retail} = \text{Retail}\%_T - \text{Retail}\%_{T-1}$$

### 2.1 Smart Money Verdict Classification

- **Smart Money Akumulasi Masif 🐋**: $\Delta\text{Institutional} > +0.30\% \land \Delta\text{Retail} < -0.20\%$. Institutions are aggressively buying from retail sellers.
- **Akumulasi Institusi Ringan 🟢**: $\Delta\text{Institutional} > +0.05\%$.
- **Smart Money Distribusi ke Ritel 🚨**: $\Delta\text{Institutional} < -0.30\% \land \Delta\text{Retail} > +0.20\%$. Institutions are offloading paper into retail hands.
- **Distribusi Institusi Ringan 🔴**: $\Delta\text{Institutional} < -0.05\%$.
- **Netral / Stabil ⚖️**: Minimal change (within $\pm 0.05\%$).

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/kseiShiftEngine.js`.
- API integration: Returned inside `GET /api/stocks/[ticker]` as `stockDetail.kseiShift`.
- UI presentation: Rendered in `src/components/SmartMoneyLiquidityPanel.jsx`.
- Unit test suite: `tests/kseiShift.test.js`.

