// Sector Rotation Engine
// Calculates sector strength and ranks sectors

export function calculateSectorStrengths(sectorPerformance) {
  const sectors = Object.entries(sectorPerformance).map(([name, raw]) => {
    const data = normalizeSectorInput(raw);
    // Composite sector strength score (0–100)
    let strength = 0;

    // Return component (45%)
    // Map return5d from [-5%, +5%] to [0..100] so outliers don't dominate.
    const returnScore = clamp(((data.return5d + 5) / 10) * 100, 0, 100);
    strength += returnScore * 0.45;

    // Volume growth component (25%)
    // Map volume ratio from [0.6x..1.8x] to [0..100].
    const volScore = clamp(((data.volumeGrowth - 0.6) / 1.2) * 100, 0, 100);
    strength += volScore * 0.25;

    // Breadth component (25%)
    const winScore = data.winnersRatio * 100;
    strength += winScore * 0.25;

    // Participation component (5%)
    // Favors sectors with enough constituents (>= 8 gets full).
    const participationScore = clamp((data.stockCount / 8) * 100, 0, 100);
    strength += participationScore * 0.05;

    return {
      name,
      strength: Math.round(clamp(strength, 0, 100)),
      return5d: data.return5d,
      volumeGrowth: data.volumeGrowth,
      winnersRatio: data.winnersRatio,
      stockCount: data.stockCount,
      trend: data.return5d >= 2 ? 'strong' : data.return5d >= 0 ? 'positive' : 'weak',
    };
  }).filter(sector => sector.stockCount > 0 || sector.name === 'General');

  // Sort by strength descending and assign ranks
  sectors.sort((a, b) => b.strength - a.strength);
  sectors.forEach((sector, index) => {
    sector.rank = index + 1;
  });

  // Create lookup map
  const strengthMap = {};
  sectors.forEach(s => {
    strengthMap[s.name] = s;
  });

  return { ranked: sectors, map: strengthMap };
}

function normalizeSectorInput(data = {}) {
  const hasSignal =
    Number.isFinite(data.return5d) ||
    Number.isFinite(data.volumeGrowth) ||
    Number.isFinite(data.winnersRatio);
  const inferredCount = hasSignal ? 1 : 0;

  return {
    return5d: Number.isFinite(data.return5d) ? Number(data.return5d) : 0,
    volumeGrowth: Number.isFinite(data.volumeGrowth) ? Number(data.volumeGrowth) : 1,
    winnersRatio: Number.isFinite(data.winnersRatio) ? clamp(Number(data.winnersRatio), 0, 1) : 0.5,
    stockCount: Number.isFinite(data.stockCount) ? Math.max(0, Number(data.stockCount)) : inferredCount,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
