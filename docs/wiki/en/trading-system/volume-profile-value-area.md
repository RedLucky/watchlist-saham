---
title: "Bloomberg GP: Volume Profile & Value Area (POC, VAH, VAL)"
description: "Horizontal volume distribution analysis, Point of Control (POC), 70% Value Area boundaries, and market auction theory."
category: "trading-system"
tags: ["bloomberg", "gp", "volume-profile", "point-of-control", "value-area", "market-profile"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg GP: Volume Profile & Value Area (POC, VAH, VAL)

## 1. Overview & Institutional Rationale

Traditional volume bars only display volume traded over time (vertical axis). In contrast, **Volume Profile** displays volume traded across price levels (horizontal axis), revealing the exact prices where buyers and sellers established market consensus and heaviest liquidity.

The **Bloomberg GP (`GP <GO>`)** Volume Profile module calculates:
1. **Point of Control (POC)**: The single price tick that transacted the greatest volume in the lookback window. Represents institutional equilibrium / magnet price.
2. **Value Area (VA)**: The range of price levels that accounts for exactly 70% of total transacted volume.
3. **Value Area High (VAH)**: Upper boundary of the 70% Value Area.
4. **Value Area Low (VAL)**: Lower boundary of the 70% Value Area.
5. **Auction Market Theory Context**: Classifies current price as Bullish Premium (above VAH), Equilibrium (inside Value Area), or Discount (below VAL).

---

## 2. Mathematical Formulation & Algorithmic Steps

### 2.1 Price Discretization into Bins

Given minimum price $P_{\text{min}}$ and maximum price $P_{\text{max}}$ over $N$ trading periods:

$$\text{Bin Size} = \frac{P_{\text{max}} - P_{\text{min}}}{K} \quad (K = 15\text{ bins})$$

For each transaction $(P_t, V_t)$, volume is assigned to bin index $j = \lfloor \frac{P_t - P_{\text{min}}}{\text{Bin Size}} \rfloor$.

### 2.2 Point of Control (POC)

$$\text{POC Index} = \arg\max_j \left(\text{Volume}_j\right)$$

$$\text{POC Price} = \text{roundToIDXTick}(\text{Midpoint of Bin}_{\text{POC}})$$

### 2.3 70% Value Area Expansion

Beginning from $\text{POC Index}$, the algorithm iteratively expands upward and downward, choosing the adjacent bin with the higher volume, until:

$$\sum_{j = \text{DownIdx}}^{\text{UpIdx}} \text{Volume}_j \ge 0.70 \times \text{Total Volume}$$

- $\text{VAH} = \text{Midpoint of Bin}_{\text{UpIdx}}$
- $\text{VAL} = \text{Midpoint of Bin}_{\text{DownIdx}}$

---

## 3. Implementation Details

- Pure calculation engine: `src/lib/volumeProfileEngine.js`.
- API integration: Embedded in `GET /api/stocks/[ticker]` as `stockDetail.volumeProfile`.
- UI presentation: Rendered in `src/components/SmartMoneyLiquidityPanel.jsx`.
- Unit test suite: `tests/volumeProfile.test.js`.
