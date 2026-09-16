# Bloomberg RRG / SECT: Sector Relative Rotation Graph Engine

## 1. Overview & Theoretical Foundations
The **Relative Rotation Graph (RRG)** module (inspired by Bloomberg `RRG` and Julius de Kempenaer's sector rotation methodology) visualizes relative performance and momentum across all IDX-IC sectors against the benchmark index (IHSG).

The market moves in cyclical macroeconomic waves. RRG categorizes sectors into 4 canonical quadrants centered at `(100, 100)`:
1. **Leading (🟢)**: $RS > 100$, $Momentum \ge 100$. Sectors outperforming the index with accelerating bullish momentum.
2. **Weakening (🟡)**: $RS \ge 100$, $Momentum < 100$. Sectors maintaining historical relative strength, but momentum is decelerating (topping phase).
3. **Lagging (🔴)**: $RS < 100$, $Momentum < 100$. Sectors underperforming the benchmark with bearish momentum.
4. **Improving (🔵)**: $RS < 100$, $Momentum \ge 100$. Sectors emerging from underperformance with turning positive momentum (bottoming / accumulation phase).

---

## 2. Mathematical Formulation

### 2.1. Relative Strength Ratio (RS-Ratio)
The RS-Ratio measures sector excess return against the benchmark over a 5-day trading window:

$$\text{Excess Return} = \text{Return}_{5d} - \text{Return}_{\text{benchmark}}$$

$$\text{RS-Ratio} = 100 + (\text{Excess Return} \times 5)$$

Where:
- $\text{Return}_{5d}$ is the 5-day percentage return of the sector.
- $\text{Return}_{\text{benchmark}}$ is the 5-day percentage return of the composite index (IHSG).
- Multiplier $5$ scales the coordinate so that $\pm 1\%$ excess return translates into $\pm 5$ index points relative to center $100$.

### 2.2. Relative Strength Momentum (RS-Momentum)
The RS-Momentum captures volume acceleration and the internal breadth (winners ratio) of constituent stocks in the sector:

$$\Delta_{\text{momentum}} = (\text{Volume Growth} - 1.0) \times 10 + (\text{Winners Ratio} - 0.5) \times 20$$

$$\text{RS-Momentum} = 100 + \Delta_{\text{momentum}}$$

Where:
- $\text{Volume Growth}$ is the 5-day volume relative to the 20-day average ($1.0$ is baseline).
- $\text{Winners Ratio}$ is the proportion of stocks advancing in the sector ($0.5$ is neutral).

---

## 3. Implementation Details
- **Engine**: `src/lib/sectorRrgEngine.js`.
- **API Handler**: Integrated into `GET /api/sectors` as `rrg`.
- **UI Matrix**: `src/components/SectorRrgPanel.jsx` with interactive quadrant filters and advice badges, embedded in `SectorBar.jsx`.

