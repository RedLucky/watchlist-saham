/**
 * Bloomberg RRG / SECT: Relative Rotation Graph Engine
 * 
 * Maps sector strength and momentum across 4 cyclical market quadrants:
 * 1. Leading: Strong Relative Strength & Positive Momentum (Outperforming)
 * 2. Weakening: Strong Relative Strength but Losing Momentum (Topping)
 * 3. Lagging: Weak Relative Strength & Negative Momentum (Underperforming)
 * 4. Improving: Weak Relative Strength but Gaining Momentum (Bottoming / Rebounding)
 */

export const QUADRANTS = {
  LEADING: 'LEADING',
  WEAKENING: 'WEAKENING',
  LAGGING: 'LAGGING',
  IMPROVING: 'IMPROVING'
};

// RRG Formula Constants
const BASE_RS_RATIO = 100;
const EXCESS_RETURN_MULTIPLIER = 5;
const BASE_RS_MOMENTUM = 100;
const VOLUME_GROWTH_MULTIPLIER = 10;
const WINNERS_RATIO_MULTIPLIER = 20;
const NEUTRAL_VOLUME_GROWTH = 1.0;
const NEUTRAL_WINNERS_RATIO = 0.5;
const QUADRANT_CENTER_THRESHOLD = 100;

/**
 * Calculates RRG Coordinates (RS-Ratio and RS-Momentum) for Sectors
 */
export function calculateSectorRrg({
  sectorPerformance = {},
  benchmarkReturn = 0
}) {
  const sectors = Object.entries(sectorPerformance || {});
  if (sectors.length === 0) {
    return [];
  }

  const safeBenchmark = Number(benchmarkReturn) || 0;

  return sectors.map(([name, data]) => {
    const return5d = Number(data?.return5d) || 0;
    const volumeGrowth = Number(data?.volumeGrowth) || NEUTRAL_VOLUME_GROWTH;
    const winnersRatio = Number(data?.winnersRatio) || NEUTRAL_WINNERS_RATIO;

    // 1. Calculate RS-Ratio (Relative Strength vs Benchmark centered at 100)
    // Positive excess return shifts RS-Ratio > 100
    const excessReturn = return5d - safeBenchmark;
    const rsRatio = Number((BASE_RS_RATIO + excessReturn * EXCESS_RETURN_MULTIPLIER).toFixed(2));

    // 2. Calculate RS-Momentum (Rate of change and volume acceleration centered at 100)
    const momentumDelta = 
      (volumeGrowth - NEUTRAL_VOLUME_GROWTH) * VOLUME_GROWTH_MULTIPLIER + 
      (winnersRatio - NEUTRAL_WINNERS_RATIO) * WINNERS_RATIO_MULTIPLIER;
    const rsMomentum = Number((BASE_RS_MOMENTUM + momentumDelta).toFixed(2));

    // 3. Classify Quadrant
    let quadrant = QUADRANTS.LAGGING;
    let label = 'Lagging (Tertinggal) 🔴';
    let badgeColor = 'rose';
    let advice = 'Sektor tertinggal dan momentum melemah. Kurangi bobot portofolio.';

    if (rsRatio >= QUADRANT_CENTER_THRESHOLD && rsMomentum >= QUADRANT_CENTER_THRESHOLD) {
      quadrant = QUADRANTS.LEADING;
      label = 'Leading (Memimpin) 🟢';
      badgeColor = 'emerald';
      advice = 'Sektor memimpin pasar dengan tren kuat. Pertahankan posisi / Overweight.';
    } else if (rsRatio >= QUADRANT_CENTER_THRESHOLD && rsMomentum < QUADRANT_CENTER_THRESHOLD) {
      quadrant = QUADRANTS.WEAKENING;
      label = 'Weakening (Melemah) 🟡';
      badgeColor = 'amber';
      advice = 'Kekuatan relatif masih ada namun momentum melambat. Bersiap ambil profit.';
    } else if (rsRatio < QUADRANT_CENTER_THRESHOLD && rsMomentum >= QUADRANT_CENTER_THRESHOLD) {
      quadrant = QUADRANTS.IMPROVING;
      label = 'Improving (Membaik) 🔵';
      badgeColor = 'blue';
      advice = 'Momentum mulai berbalik positif. Potensi rotasi masuk / Akumulasi awal.';
    }

    return {
      sector: name,
      rsRatio,
      rsMomentum,
      excessReturn: Number(excessReturn.toFixed(2)),
      return5d,
      quadrant,
      label,
      badgeColor,
      advice
    };
  }).sort((a, b) => b.rsRatio - a.rsRatio);
}

