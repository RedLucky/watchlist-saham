/**
 * Smart Money Score (0–100)
 * Detects institutional accumulation patterns from price/volume data.
 *
 * Note: This uses heuristic proxies since real broker data is not available
 * from Yahoo Finance. The patterns detected (volume accumulation, price-volume
 * alignment, candle quality) are well-established institutional footprints.
 */

export function calculateSmartMoneyScore(stock) {
  const { prices, volumes, atr14 } = stock.technicals;
  const { netBuy, topBrokers, concentration } = stock.brokerData;
  let score = 0;
  const details = [];

  // Require minimum data — but don't fake it with fills
  const hasSufficientData = Array.isArray(prices) && prices.length >= 10
    && Array.isArray(volumes) && volumes.length >= 10;

  if (!hasSufficientData) {
    return {
      score: 30, // Neutral-low score for insufficient data
      details: ['Data historis belum cukup untuk analisis smart money'],
      metrics: { volumeGrowth: '0', priceChange: '0', positiveDays: 0, concentration: 0.4 },
    };
  }

  const safePrices = prices;
  const safeVolumes = volumes;
  const safeNetBuy = Array.isArray(netBuy) && netBuy.length >= 5 ? netBuy : [0, 0, 0, 0, 0];
  const safeBrokers = Array.isArray(topBrokers) && topBrokers.length > 0 ? topBrokers : ['N/A'];
  const safeConcentration = Number.isFinite(concentration) ? concentration : 0.5;

  // 1. Volume Accumulation Pattern (30%)
  const last5Volumes = safeVolumes.slice(-5);
  const prev5Volumes = safeVolumes.slice(-10, -5);
  const last5Avg = last5Volumes.reduce((a, b) => a + b, 0) / last5Volumes.length;
  const prev5Avg = prev5Volumes.reduce((a, b) => a + b, 0) / prev5Volumes.length;
  const volumeGrowth = prev5Avg > 0 ? (last5Avg - prev5Avg) / prev5Avg : 0;

  let volumeAccScore = 0;
  if (volumeGrowth > 0.3) {
    volumeAccScore = 100;
    details.push('Volume meningkat kuat 5 hari terakhir — kemungkinan akumulasi institusi');
  } else if (volumeGrowth > 0.1) {
    volumeAccScore = 70;
    details.push('Volume meningkat moderat — sinyal akumulasi ada');
  } else if (volumeGrowth > 0) {
    volumeAccScore = 40;
    details.push('Sedikit kenaikan volume — sinyal akumulasi lemah');
  } else {
    volumeAccScore = 10;
    details.push('Volume menurun — tidak ada akumulasi terdeteksi');
  }
  score += volumeAccScore * 0.30;

  // 2. Price-Volume Alignment (30%)
  const last5Prices = safePrices.slice(-5);
  const priceChange = (last5Prices[4] - last5Prices[0]) / last5Prices[0];
  const dailyChanges = [];
  for (let i = 1; i < last5Prices.length; i++) {
    dailyChanges.push(Math.abs((last5Prices[i] - last5Prices[i-1]) / last5Prices[i-1]));
  }
  const avgDailyChange = dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;
  const isGradual = avgDailyChange < 0.03;
  const isPriceRising = priceChange > 0.005;

  let alignmentScore = 0;
  if (isPriceRising && isGradual && volumeGrowth > 0) {
    alignmentScore = 100;
    details.push('Harga naik bertahap dengan volume — pola klasik smart money');
  } else if (isPriceRising && volumeGrowth > 0) {
    alignmentScore = 60;
    details.push('Harga dan volume searah — namun pergerakan agak volatil');
  } else if (isPriceRising) {
    alignmentScore = 35;
    details.push('Harga naik tapi volume tidak mengkonfirmasi');
  } else {
    alignmentScore = 10;
    if (!isPriceRising && volumeGrowth > 0.2) {
      details.push('Peringatan: Volume tinggi tapi harga tidak naik — kemungkinan distribusi');
    } else {
      details.push('Tidak ada pola smart money terdeteksi');
    }
  }
  score += alignmentScore * 0.30;

  // 3. Candle Quality (20%)
  // Use ATR for more robust volatility measurement if available
  const atr = Number.isFinite(atr14) && atr14 > 0 ? atr14 : null;
  const currentPrice = safePrices[safePrices.length - 1] || 1;
  const normalizedVol = atr ? (atr / currentPrice) : avgDailyChange;

  let candleScore = 0;
  if (normalizedVol < 0.01) {
    candleScore = 100;
    details.push('Pergerakan harga sangat stabil — akumulasi terkontrol');
  } else if (normalizedVol < 0.02) {
    candleScore = 70;
    details.push('Pergerakan harga relatif stabil');
  } else if (normalizedVol < 0.04) {
    candleScore = 40;
    details.push('Volatilitas moderat dalam trading terakhir');
  } else {
    candleScore = 15;
    details.push('Volatilitas tinggi — bukan tipikal akumulasi smart money');
  }
  score += candleScore * 0.20;

  // 4. Broker Accumulation (20%)
  const recentNetBuy = safeNetBuy.slice(-5);
  const positiveDays = recentNetBuy.filter(n => n > 0).length;
  const totalNetBuy = recentNetBuy.reduce((a, b) => a + b, 0);

  let brokerScore = 0;
  if (positiveDays >= 4 && safeConcentration > 0.5) {
    brokerScore = 100;
    details.push(`Akumulasi institusi konsisten — ${positiveDays}/5 hari net buy`);
  } else if (positiveDays >= 3 && totalNetBuy > 0) {
    brokerScore = 70;
    details.push('Akumulasi institusi moderat terdeteksi');
  } else if (positiveDays >= 2) {
    brokerScore = 35;
    details.push('Ada pembelian broker — belum konsisten');
  } else {
    brokerScore = 10;
    details.push('Tidak ada akumulasi institusi signifikan');
  }
  score += brokerScore * 0.20;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { volumeGrowth: (volumeGrowth * 100).toFixed(1), priceChange: (priceChange * 100).toFixed(2), positiveDays, concentration: safeConcentration },
  };
}
