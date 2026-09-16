/**
 * Bloomberg PORT / MARS: Portfolio Risk, Beta & Macro Stress Testing Engine
 * 
 * Provides institutional multi-asset risk analytics:
 * 1. Weighted Portfolio Beta & Sector Concentration
 * 2. Parametric Value at Risk (VaR 95% 1-Day)
 * 3. Multi-Scenario Macro Stress Testing (Flash Crash, BI Rate Hike, Commodity Shock, FX Shock)
 */

export const DEFAULT_DAILY_VOLATILITY_PCT = 1.5;
export const VAR_95_Z_SCORE = 1.645;

/**
 * Calculates Comprehensive Portfolio Risk & Stress Test Matrix
 */
export function calculatePortfolioRisk({
  positions = [],
  dailyVolatilityPct = DEFAULT_DAILY_VOLATILITY_PCT
}) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return null;
  }

  // 1. Calculate Individual Position Values & Aggregate Value
  const enrichedPositions = positions.map(p => {
    const shares = Math.max(0, Number(p.totalShares ?? p.shares) || 0);
    const price = Math.max(0, Number(p.currentPrice ?? p.price) || 0);
    const value = shares * price;
    const beta = Number.isFinite(Number(p.beta)) && Number(p.beta) > 0 ? Number(p.beta) : 1.0;
    const der = Number.isFinite(Number(p.der)) ? Number(p.der) : 1.0;
    const sector = (p.sector || 'Others').trim();

    return {
      ticker: p.ticker,
      name: p.name || p.ticker,
      shares,
      price,
      value,
      beta,
      der,
      sector
    };
  });

  const totalValue = enrichedPositions.reduce((acc, p) => acc + p.value, 0);

  if (totalValue <= 0) {
    return null;
  }

  // 2. Compute Weights, Weighted Beta, and Sector Exposure
  let weightedBeta = 0;
  const sectorMap = {};
  let maxWeight = 0;
  let topHolding = null;

  enrichedPositions.forEach(p => {
    const weight = p.value / totalValue;
    weightedBeta += weight * p.beta;

    sectorMap[p.sector] = (sectorMap[p.sector] || 0) + weight;

    if (weight > maxWeight) {
      maxWeight = weight;
      topHolding = p.ticker;
    }
  });

  weightedBeta = Number(weightedBeta.toFixed(2));
  const topConcentrationPct = Number((maxWeight * 100).toFixed(1));

  // Sector breakdown list sorted descending
  const sectorAllocation = Object.entries(sectorMap)
    .map(([sector, weight]) => ({
      sector,
      weightPct: Number((weight * 100).toFixed(1)),
      value: Math.round(weight * totalValue)
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // 3. Risk Characterization & Warnings
  let riskProfile = 'Market Neutral / Balanced ⚖️';
  let badgeColor = 'blue';

  if (weightedBeta >= 1.25) {
    riskProfile = 'High Beta / Aggressive ⚡';
    badgeColor = 'amber';
  } else if (weightedBeta < 0.80) {
    riskProfile = 'Low Beta / Defensive 🛡️';
    badgeColor = 'emerald';
  }

  const warnings = [];
  if (topConcentrationPct > 35) {
    warnings.push(`Konsentrasi tinggi pada ${topHolding} (${topConcentrationPct}% dari portofolio). Diversifikasi dianjurkan.`);
  }
  if (sectorAllocation[0]?.weightPct > 50) {
    warnings.push(`Eksposur sektoral dominan pada ${sectorAllocation[0].sector} (${sectorAllocation[0].weightPct}%).`);
  }

  // 4. Value at Risk (VaR 95% 1-Day)
  const safeVol = Number(dailyVolatilityPct) || DEFAULT_DAILY_VOLATILITY_PCT;
  const var95Pct = Number((VAR_95_Z_SCORE * safeVol * weightedBeta).toFixed(2));
  const var95Nominal = Math.round(totalValue * (var95Pct / 100));

  // 5. Bloomberg MARS: Macro Stress Testing Cockpit
  const stressScenarios = [
    {
      id: 'crash_ihsg',
      name: 'IHSG Flash Crash (-5.0%)',
      icon: '💥',
      description: 'Penurunan indeks komposit secara mendadak akibat guncangan likuiditas global.',
      impactPct: Number((-5.0 * weightedBeta).toFixed(2))
    },
    {
      id: 'rate_hike',
      name: 'Kenaikan BI Rate (+50 bps)',
      icon: '🏦',
      description: 'Pengetatan moneter Bank Indonesia menaikkan beban bunga emiten berutang tinggi.',
      impactPct: calculateRateHikeImpact(enrichedPositions, totalValue)
    },
    {
      id: 'commodity_shock',
      name: 'Commodity Supercycle (+10%)',
      icon: '🛢️',
      description: 'Lonjakan harga batubara, minyak, dan nikel global mendongkrak sektor energi & tambang.',
      impactPct: calculateCommodityImpact(enrichedPositions, totalValue)
    },
    {
      id: 'fx_depreciation',
      name: 'Depresiasi Rupiah ke Rp 17.000 / USD',
      icon: '💵',
      description: 'Pelemahan nilai tukar rupiah menguntungkan eksportir namun menekan importir.',
      impactPct: calculateFxShockImpact(enrichedPositions, totalValue)
    }
  ].map(s => {
    const nominalImpact = Math.round(totalValue * (s.impactPct / 100));
    const projectedValue = totalValue + nominalImpact;
    return {
      ...s,
      nominalImpact,
      projectedValue
    };
  });

  return {
    totalValue,
    holdingCount: enrichedPositions.length,
    weightedBeta,
    riskProfile,
    badgeColor,
    topConcentrationPct,
    topHolding,
    sectorAllocation,
    warnings,
    var95: {
      pct: var95Pct,
      nominal: var95Nominal
    },
    stressScenarios
  };
}

/**
 * BI Rate Hike Impact: High DER suffer, high cash/financials resilient
 */
function calculateRateHikeImpact(positions, totalValue) {
  let netImpactPct = 0;
  positions.forEach(p => {
    const weight = p.value / totalValue;
    const isFinancial = p.sector.toUpperCase().includes('FINANC') || p.sector.toUpperCase().includes('BANK');
    let assetImpact = -1.5; // baseline rate hike headwind

    if (isFinancial) {
      assetImpact = +0.5; // expanding NIM proxy
    } else if (p.der > 1.8) {
      assetImpact = -3.5; // heavy debt burden
    } else if (p.der < 0.5) {
      assetImpact = -0.5; // cash-rich resilience
    }

    netImpactPct += weight * assetImpact;
  });
  return Number(netImpactPct.toFixed(2));
}

/**
 * Commodity Shock: Energy & Basic Materials gain, Consumer drops
 */
function calculateCommodityImpact(positions, totalValue) {
  let netImpactPct = 0;
  positions.forEach(p => {
    const weight = p.value / totalValue;
    const sectorUpper = p.sector.toUpperCase();
    let assetImpact = 0;

    if (sectorUpper.includes('ENERGY') || sectorUpper.includes('BASIC') || sectorUpper.includes('MINING')) {
      assetImpact = +8.0;
    } else if (sectorUpper.includes('CONSUMER') || sectorUpper.includes('TECH')) {
      assetImpact = -2.5; // raw material inflation
    } else {
      assetImpact = +0.5;
    }

    netImpactPct += weight * assetImpact;
  });
  return Number(netImpactPct.toFixed(2));
}

/**
 * FX Depreciation Shock: Exporters gain, importers hurt
 */
function calculateFxShockImpact(positions, totalValue) {
  let netImpactPct = 0;
  positions.forEach(p => {
    const weight = p.value / totalValue;
    const sectorUpper = p.sector.toUpperCase();
    let assetImpact = -1.0;

    if (sectorUpper.includes('ENERGY') || sectorUpper.includes('BASIC') || sectorUpper.includes('PLANTATION')) {
      assetImpact = +4.5; // USD revenue windfall
    } else if (sectorUpper.includes('HEALTH') || sectorUpper.includes('CONSUMER') || p.der > 2.0) {
      assetImpact = -4.0; // imported raw materials or FX debt
    }

    netImpactPct += weight * assetImpact;
  });
  return Number(netImpactPct.toFixed(2));
}
