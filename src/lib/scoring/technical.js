// Technical Score (0–100)
// Evaluates trade setup quality based on trading style
// Integrates MA200 long-term trend, MACD confirmation, and Smart Money/Bandarmologi synergy

import { evaluateStyleSignal } from '../signals/styleSignal.js';

export function calculateTechnicalScore(stock, styleConfig = { name: 'swing', label: 'Swing Trading', indicators: { rsiPeriod: 14, maShort: 20, maLong: 50, volSpike: 1.1 }}) {
  const { rsi7, rsi14, ma9, ma20, ma50, ma200, prices, volumes, resistance, macd } = stock?.technicals || {};
  const { rsiPeriod = 14, maShort = 20, maLong = 50, volSpike = 1.1 } = styleConfig?.indicators || {};
  
  const price = stock?.price || 0;
  const currentRSI = (rsiPeriod === 7 ? rsi7 : rsi14) ?? 50;
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

  // 2. Entry Setup Detection & Smart Money Confirmation (35%)
  const safeVolumes = Array.isArray(volumes) && volumes.length > 0 ? volumes : [1];
  const lastVolume = Number(safeVolumes[safeVolumes.length - 1] || 0);
  const recentVolumes = safeVolumes.slice(-6, -1);
  const recentAvgVol = recentVolumes.length > 0
    ? recentVolumes.reduce((a, b) => a + Number(b || 0), 0) / recentVolumes.length
    : 1;
  const volumeRatio = recentAvgVol > 0 ? lastVolume / recentAvgVol : 1;
  
  const safePrices = Array.isArray(prices) && prices.length > 1 ? prices : [price, price];
  const recentPrices = safePrices.slice(-5);
  const isBullishCandle = recentPrices.length >= 2
    ? recentPrices[recentPrices.length - 1] > recentPrices[recentPrices.length - 2]
    : false;
  
  const kseiLatest = stock?.kseiLatest || null;
  const isSmartMoneyAccumulating = kseiLatest && (Number(kseiLatest.deltaSmartMoney) > 0 || Number(kseiLatest.bfi) > 0);
  const isRetailDistributing = kseiLatest && (Number(kseiLatest.deltaRetail) > 0 && Number(kseiLatest.deltaSmartMoney) < 0);

  const styleSignal = evaluateStyleSignal(styleConfig?.name || 'swing', {
    price,
    shortMA,
    longMA,
    ma20,
    rsi: currentRSI,
    volumeRatio,
    volSpike,
    resistance,
    isBullishCandle,
    isSmartMoneyAccumulating,
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
    setupScore = isSmartMoneyAccumulating ? 100 : (isRetailDistributing ? 60 : 85);
    details.push(isSmartMoneyAccumulating 
      ? '🚀 Valid Breakout — terkonfirmasi akumulasi Smart Money / Asing'
      : (isRetailDistributing 
        ? '⚠️ Breakout rawan Fakeout — Smart Money terdeteksi distribusi ke Ritel'
        : 'Setup breakout harian terdeteksi')
    );
  } else if (styleSignal.setup === 'pullback' && styleConfig?.name === 'daily') {
    setupScore = isSmartMoneyAccumulating ? 100 : 80;
    details.push(isSmartMoneyAccumulating 
      ? '💎 Golden Pullback — Smart Money mengakumulasi di area support MA20' 
      : 'Setup pullback harian dekat MA20'
    );
  } else if (styleSignal.setup === 'momentum') {
    setupScore = isSmartMoneyAccumulating ? 80 : 65;
    details.push(isSmartMoneyAccumulating 
      ? '⚡ Momentum positif terkonfirmasi aliran dana Smart Money'
      : 'Momentum harian positif, menunggu konfirmasi volume'
    );
  } else if (styleSignal.setup === 'pullback') {
    setupScore = isSmartMoneyAccumulating ? 100 : 85;
    details.push(isSmartMoneyAccumulating 
      ? '💎 Swing Pullback Prima — didukung akumulasi Smart Money di support MA20'
      : 'Setup swing pullback ideal — harga di area pantul MA20'
    );
  } else if (styleSignal.setup === 'swing') {
    setupScore = 60;
    details.push('Menunggu harga mendekati support MA20 untuk swing trade');
  }

  if (setupScore === 0) {
    setupScore = isSmartMoneyAccumulating ? 35 : 20;
    details.push(isSmartMoneyAccumulating 
      ? 'Belum ada setup teknikal agresif, namun Smart Money mulai akumulasi bertahap'
      : 'Belum ada setup beli yang jelas untuk mode ini'
    );
  }
  score += setupScore * 0.35;

  // 3. RSI Zone (15%)
  let rsiScore = 0;
  const rsi = currentRSI;
  const rsiMin = styleConfig?.name === 'scalping' ? 50 : styleConfig?.name === 'daily' ? 45 : 40;
  const rsiMax = styleConfig?.name === 'scalping' ? 70 : styleConfig?.name === 'daily' ? 65 : 60;

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
  let longTermScore = 50; // neutral default
  if (styleConfig?.name !== 'scalping') {
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
      rsi: Number.isFinite(currentRSI) ? currentRSI.toFixed(1) : '50.0', 
      volumeRatio: Number.isFinite(volumeRatio) ? volumeRatio.toFixed(2) : '1.00',
      shortMAName: `MA${maShort}`,
      longMAName: `MA${maLong}`,
      macdHistogram: macd && Number.isFinite(macd.histogram) ? Number(macd.histogram).toFixed(2) : '0.00',
    },
  };
}
