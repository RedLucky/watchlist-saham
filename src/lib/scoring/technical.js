// Technical Score (0–100)
// Evaluates trade setup quality based on trading style
// Now includes MA200 long-term trend check and MACD confirmation

import { evaluateStyleSignal } from '../signals/styleSignal.js';

export function calculateTechnicalScore(stock, styleConfig = { name: 'swing', indicators: { rsiPeriod: 14, maShort: 20, maLong: 50, volSpike: 1.1 }}) {
  const { rsi7, rsi14, ma9, ma20, ma50, ma200, prices, volumes, resistance, macd } = stock.technicals;
  const { rsiPeriod, maShort, maLong, volSpike } = styleConfig.indicators;
  
  const price = stock.price;
  const currentRSI = rsiPeriod === 7 ? rsi7 : rsi14;
  const shortMA = maShort === 9 ? ma9 : ma20;
  const longMA = maLong === 20 ? ma20 : ma50;

  let score = 0;
  const details = [];
  let detectedSetup = 'none';

  // 1. Trend Alignment (25%)
  const priceAboveShortMA = price > shortMA;
  const shortMAAboveLongMA = shortMA > longMA;
  const maSlope = longMA > 0 ? (shortMA - longMA) / longMA : 0;

  let trendScore = 0;
  if (priceAboveShortMA && shortMAAboveLongMA && maSlope > 0) {
    trendScore = 100;
    details.push(`Tren ${styleConfig.label} sangat kuat — harga di atas MA${maShort} & MA${maLong}`);
  } else if (priceAboveShortMA && shortMAAboveLongMA) {
    trendScore = 75;
    details.push(`Tren ${styleConfig.label} positif — MA${maShort} di atas MA${maLong}`);
  } else if (priceAboveShortMA) {
    trendScore = 45;
    details.push('Tren jangka pendek positif, namun tren utama masih lemah');
  } else {
    trendScore = 15;
    details.push(`Harga di bawah MA${maShort} — momentum sedang lemah`);
  }
  score += trendScore * 0.25;

  // 2. Entry Setup Detection (35%)
  const safeVolumes = Array.isArray(volumes) && volumes.length > 0 ? volumes : [1];
  const lastVolume = Number(safeVolumes[safeVolumes.length - 1] || 0);
  const recentVolumes = safeVolumes.slice(-5);
  const recentAvgVol = recentVolumes.length > 0
    ? recentVolumes.reduce((a, b) => a + Number(b || 0), 0) / recentVolumes.length
    : 1;
  const volumeRatio = recentAvgVol > 0 ? lastVolume / recentAvgVol : 1;
  
  const safePrices = Array.isArray(prices) && prices.length > 1 ? prices : [price, price];
  const recentPrices = safePrices.slice(-5);
  const isBullishCandle = recentPrices.length >= 2
    ? recentPrices[recentPrices.length - 1] > recentPrices[recentPrices.length - 2]
    : false;
  
  const styleSignal = evaluateStyleSignal(styleConfig.name, {
    price,
    shortMA,
    longMA,
    ma20,
    rsi: currentRSI,
    volumeRatio,
    volSpike,
    resistance,
    isBullishCandle,
  });

  let setupScore = 0;
  detectedSetup = styleSignal.setup;
  if (styleSignal.setup === 'scalp' && styleSignal.strength === 'strong') {
    setupScore = 100;
    details.push('Setup scalping sempurna — tren kuat dengan lonjakan volume');
  } else if (styleSignal.setup === 'scalp') {
    setupScore = 70;
    details.push('Kondisi scalping terpenuhi, volume sedang dipantau');
  } else if (styleSignal.setup === 'breakout') {
    setupScore = 100;
    details.push('Setup breakout harian terdeteksi');
  } else if (styleSignal.setup === 'pullback' && styleConfig.name === 'daily') {
    setupScore = 100;
    details.push('Setup pullback harian dekat MA20');
  } else if (styleSignal.setup === 'momentum') {
    setupScore = 65;
    details.push('Momentum harian positif, menunggu konfirmasi volume');
  } else if (styleSignal.setup === 'pullback') {
    setupScore = 100;
    details.push('Setup swing pullback ideal — harga di area pantul MA20');
  } else if (styleSignal.setup === 'swing') {
    setupScore = 60;
    details.push('Menunggu harga mendekati support MA20 untuk swing trade');
  }

  if (setupScore === 0) {
    setupScore = 20;
    details.push('Belum ada setup beli yang jelas untuk mode ini');
  }
  score += setupScore * 0.35;

  // 3. RSI Zone (15%)
  let rsiScore = 0;
  const rsi = currentRSI;
  const rsiMin = styleConfig.name === 'scalping' ? 50 : styleConfig.name === 'daily' ? 45 : 40;
  const rsiMax = styleConfig.name === 'scalping' ? 70 : styleConfig.name === 'daily' ? 65 : 60;

  if (rsi >= rsiMin && rsi <= rsiMax) {
    rsiScore = 100;
    details.push(`RSI (${rsiPeriod}) di level ${rsi.toFixed(1)} — zona optimal`);
  } else if (rsi < rsiMin && rsi >= rsiMin - 10) {
    rsiScore = 60;
    details.push(`RSI (${rsiPeriod}) agak rendah, waspadai pelemahan tren`);
  } else {
    rsiScore = 30;
    details.push(`RSI (${rsiPeriod}) di luar zona ideal untuk ${styleConfig.label}`);
  }
  score += rsiScore * 0.15;

  // 4. Volume Confirmation (10%)
  let volScore = 0;
  if (volumeRatio >= volSpike) {
    volScore = 100;
    details.push(`Volume kuat — di atas standar lonjakan ${volSpike}x`);
  } else if (volumeRatio >= 1.0) {
    volScore = 60;
    details.push('Volume normal — tidak ada lonjakan signifikan');
  } else {
    volScore = 30;
    details.push('Volume rendah — kurang minat beli');
  }
  score += volScore * 0.10;

  // 5. Long-term Trend (MA200) + MACD (15%)
  // Only for daily and swing styles — scalping doesn't care about long-term
  let longTermScore = 50; // neutral default
  if (styleConfig.name !== 'scalping') {
    const safeMA200 = Number.isFinite(ma200) && ma200 > 0 ? ma200 : null;
    const safeMacd = macd && Number.isFinite(macd.histogram) ? macd : null;

    if (safeMA200) {
      const aboveMA200 = price > safeMA200;
      if (aboveMA200 && safeMacd && safeMacd.histogram > 0) {
        longTermScore = 100;
        details.push('Tren jangka panjang bullish — harga di atas MA200 + MACD positif');
      } else if (aboveMA200) {
        longTermScore = 75;
        details.push('Harga di atas MA200 — tren jangka panjang positif');
      } else if (safeMacd && safeMacd.histogram > 0) {
        longTermScore = 50;
        details.push('Di bawah MA200 tapi MACD mulai positif — potensi reversal');
      } else {
        longTermScore = 20;
        details.push('Harga di bawah MA200 — tren jangka panjang masih bearish');
      }
    } else if (safeMacd && safeMacd.histogram > 0) {
      longTermScore = 65;
      details.push('MACD positif — momentum jangka menengah bagus');
    }
  }
  score += longTermScore * 0.15;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    setup: detectedSetup,
    metrics: { 
      shortMA, 
      longMA,
      ma200: Number.isFinite(ma200) ? ma200 : null,
      rsi: currentRSI.toFixed(1), 
      volumeRatio: volumeRatio.toFixed(2),
      shortMAName: `MA${maShort}`,
      longMAName: `MA${maLong}`,
      macdHistogram: macd?.histogram?.toFixed(2) || '0',
    },
  };
}
