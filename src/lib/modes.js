// Mode System — mendefinisikan mode strategi dengan bobot dan ambang batas

// 1. Market Context (Kondisi Pasar)
export const MODES = {
  balanced: {
    name: 'balanced',
    label: 'Seimbang',
    emoji: '⚖️',
    description: 'Strategi campuran yang menyeimbangkan fundamental dan sinyal teknikal. Bagus untuk sebagian besar kondisi pasar.',
    weights: {
      fundamental: 25,
      technical: 20,
      smartMoney: 20,
      trending: 15,
      valuation: 10,
      liquidity: 5,
      dividend: 5,
    },
    threshold: 65,
    maxStocks: 7,
    color: '#3b82f6',
  },
  growth: {
    name: 'growth',
    label: 'Pertumbuhan',
    emoji: '🚀',
    description: 'Fokus pada saham momentum dan tren. Terbaik saat pasar sedang bullish dan volume tinggi.',
    weights: {
      fundamental: 15,
      technical: 30,
      smartMoney: 25,
      trending: 20,
      valuation: 5,
      liquidity: 3,
      dividend: 2,
    },
    threshold: 60,
    maxStocks: 10,
    color: '#10b981',
  },
  conservative: {
    name: 'conservative',
    label: 'Konservatif',
    emoji: '🛡️',
    description: 'Memprioritaskan saham yang lebih aman dengan kinerja stabil, fundamental kuat, dan dividen baik. Risiko lebih rendah.',
    weights: {
      fundamental: 35,
      technical: 20,
      smartMoney: 15,
      trending: 5,
      valuation: 10,
      liquidity: 5,
      dividend: 10,
    },
    threshold: 66,
    maxStocks: 5,
    color: '#6366f1',
  },
  defensive: {
    name: 'defensive',
    label: 'Defensif',
    emoji: '🔒',
    description: 'Hanya saham kualitas tertinggi yang lolos. Untuk pasar bearish saat menjaga modal adalah prioritas.',
    weights: {
      fundamental: 35,
      technical: 15,
      smartMoney: 15,
      valuation: 15,
      dividend: 10,
      liquidity: 5,
      trending: 5,
    },
    threshold: 68,
    maxStocks: 3,
    color: '#f59e0b',
  },
  custom: {
    name: 'custom',
    label: 'Custom',
    emoji: '🎛️',
    description: 'Anda mengontrol bobot sepenuhnya. Cocok untuk backtesting dan trader berpengalaman.',
    weights: {
      fundamental: 20, // Default fallbacks
      technical: 20,
      smartMoney: 20,
      trending: 20,
      valuation: 10,
      liquidity: 5,
      dividend: 5,
    },
    threshold: 0, // Zero threshold for Custom mode bypass 
    maxStocks: 10,
    color: '#ec4899',
  },
};

// 2. Trading Style (Gaya Trading)
export const TRADING_STYLES = {
  scalping: {
    name: 'scalping',
    label: 'Scalping',
    emoji: '⚡',
    riskLevel: 'Tinggi',
    riskColor: 'red',
    description: 'Profit cepat dalam rentang intraday (ODT). Frekuensi tinggi dengan target terukur dan disiplin ketat.',
    // Lower market influence because scalping is highly tactical.
    marketInfluence: 0.35,
    indicators: { rsiPeriod: 7, maShort: 9, maLong: 20, volSpike: 1.5 },
    weights: { technical: 40, trending: 25, smartMoney: 20, fundamental: 5, valuation: 5, liquidity: 3, dividend: 2 },
    exit: { tp: 3.0, sl: 1.5 },
    maxHoldingDays: 1, // One Day Trade (ODT) di BEI
    qualityGate: { minTechnicalScore: 55, minRiskReward: 1.5, requireActionableSetup: true },
  },
  daily: {
    name: 'daily',
    label: 'Daily Trading',
    emoji: '📊',
    riskLevel: 'Sedang',
    riskColor: 'yellow',
    description: 'Trading jangka pendek selaras siklus T+2 (1-3 hari bursa). Mencari momentum lanjutan.',
    // Balanced market-vs-style influence.
    marketInfluence: 0.50,
    indicators: { rsiPeriod: 14, maShort: 20, maLong: 50, volSpike: 1.2 },
    weights: { technical: 30, smartMoney: 25, trending: 20, fundamental: 15, valuation: 5, liquidity: 3, dividend: 2 },
    exit: { tp: 5.0, sl: 2.5 },
    maxHoldingDays: 3, // Sesuai siklus T+2 BEI
    qualityGate: { minTechnicalScore: 60, minRiskReward: 1.6, requireActionableSetup: true },
  },
  swing: {
    name: 'swing',
    label: 'Swing Trading',
    emoji: '📈',
    riskLevel: 'Rendah',
    riskColor: 'green',
    description: 'Menangkap tren jangka menengah (1-2 minggu bursa). Lebih stabil dan cocok untuk pemula.',
    // Higher market influence for multi-day positioning.
    marketInfluence: 0.65,
    indicators: { rsiPeriod: 14, maShort: 20, maLong: 50, volSpike: 1.1 },
    weights: { fundamental: 25, technical: 20, smartMoney: 20, trending: 15, valuation: 10, liquidity: 5, dividend: 5 },
    exit: { tp: 9.0, sl: 4.5 },
    maxHoldingDays: 12, // 2-3 minggu kalender BEI
    qualityGate: { minTechnicalScore: 62, minRiskReward: 1.8, requireActionableSetup: true },
  },
};

export function detectMarketMode(marketData) {
  const { indexTrend, volumeVsAvg, advanceDecline } = marketData;
  const adv = Number(advanceDecline?.advance || 0);
  const dec = Number(advanceDecline?.decline || 0);
  const base = adv + dec;
  const adRatio = base > 0 ? adv / base : 0.5;
  const vol = Number(volumeVsAvg || 1);

  // 1. Bearish / Weak breadth: tren turun atau breadth tertekan
  if (indexTrend === 'down' || adRatio < 0.40) {
    return 'defensive';
  }

  // 2. Bullish kuat: Index Up + Partisipasi Kuat + Volume di atas normal
  if (indexTrend === 'up' && vol >= 1.05 && adRatio >= 0.55) {
    return 'growth';
  }

  // 3. Pasar positif stabil / konsolidasi sehat
  if (
    (indexTrend === 'up' && adRatio >= 0.48) ||
    (indexTrend === 'sideways' && adRatio >= 0.50)
  ) {
    return 'conservative';
  }

  // 4. Default fallback: balanced
  return 'balanced';
}

export function getModeConfig(modeName) {
  return MODES[modeName] || MODES.balanced;
}

export function getStyleConfig(styleName) {
  return TRADING_STYLES[styleName] || TRADING_STYLES.swing;
}
