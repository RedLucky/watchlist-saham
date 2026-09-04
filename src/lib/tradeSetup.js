/**
 * Trade Setup Calculator
 * Calculates entry range, target price, stop loss, and risk/reward ratio
 * strictly conforming to Indonesia Stock Exchange (BEI / IDX) official tick sizes.
 */

/**
 * Mengembalikan besaran fraksi harga resmi BEI (IDX Tick Size):
 * - Harga < Rp 200        : Fraksi Rp 1
 * - Harga Rp 200 - 500    : Fraksi Rp 2
 * - Harga Rp 500 - 2.000  : Fraksi Rp 5
 * - Harga Rp 2.000 - 5.000: Fraksi Rp 10
 * - Harga >= Rp 5.000     : Fraksi Rp 25
 */
export function getIDXPriceStep(price) {
  const p = Number(price);
  if (p < 200) return 1;
  if (p < 500) return 2;
  if (p < 2000) return 5;
  if (p < 5000) return 10;
  return 25;
}

/**
 * Membulatkan harga sesuai fraksi resmi BEI
 * @param {number} price 
 * @param {'nearest' | 'up' | 'down'} direction 
 */
export function roundToIDXTick(price, direction = 'nearest') {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return 0;
  const tick = getIDXPriceStep(p);

  if (direction === 'up') return Math.ceil(p / tick) * tick;
  if (direction === 'down') return Math.floor(p / tick) * tick;
  return Math.round(p / tick) * tick;
}

export function calculateTradeSetup(stock, technicalResult, styleConfig) {
  const technicals = stock?.technicals || {};
  const ma9 = technicals.ma9;
  const ma20 = technicals.ma20;
  const price = stock?.price || 100;
  const setup = technicalResult?.setup || 'none';
  const { tp: targetPct, sl: stopLossPct } = styleConfig?.exit || { tp: 5.0, sl: 2.5 };

  let entryLow, entryHigh;
  const entryBase = styleConfig.name === 'scalping' ? (ma9 || price) : (ma20 || price);

  // 1. Entry Range Logic (Dibulatkan ke fraksi BEI terdekat)
  if (setup === 'pullback') {
    entryLow = roundToIDXTick(entryBase * 0.99, 'down');
    entryHigh = roundToIDXTick(entryBase * 1.01, 'up');
  } else if (setup === 'breakout') {
    entryLow = roundToIDXTick(price * 0.995, 'down');
    entryHigh = roundToIDXTick(price * 1.015, 'up');
  } else if (setup === 'scalp') {
    entryLow = roundToIDXTick(price * 0.995, 'down');
    entryHigh = roundToIDXTick(price * 1.005, 'up');
  } else {
    // Default momentum / setup
    entryLow = roundToIDXTick(price * 0.99, 'down');
    entryHigh = roundToIDXTick(price * 1.01, 'up');
  }

  // Pastikan rentang beli valid (minimal selisih 1 fraksi jika range terlalu sempit)
  if (entryHigh <= entryLow) {
    entryHigh = entryLow + getIDXPriceStep(entryLow);
  }

  // 2. Target Price (Take Profit): Padukan target persentase dengan Resisten Swing High terdekat
  const rawTarget = price * (1 + targetPct / 100);
  let targetCandidate = rawTarget;

  // Periksa swing high 20 hari terakhir dari technicals.highs atau technicals.prices
  const recentHighs = Array.isArray(technicals.highs) && technicals.highs.length >= 5
    ? technicals.highs.slice(-20)
    : (Array.isArray(technicals.prices) && technicals.prices.length >= 5 ? technicals.prices.slice(-20) : []);
  
  if (recentHighs.length > 0) {
    const swingResistance = Math.max(...recentHighs);
    // Jika resisten berada di atas entryHigh minimal 2.5% dan dalam jangkauan wajar
    if (swingResistance > entryHigh * 1.025 && swingResistance < entryHigh * 1.35) {
      // Pasang TP 1 fraksi di bawah level resisten agar order mudah tereksekusi sebelum pembalikan arah
      const step = getIDXPriceStep(swingResistance);
      const resistanceTarget = swingResistance - step;
      if (resistanceTarget > entryHigh * 1.025) {
        targetCandidate = Math.max(rawTarget, resistanceTarget);
      }
    }
  }

  let target = roundToIDXTick(targetCandidate, 'up');
  const minTarget = entryHigh + (getIDXPriceStep(entryHigh) * 2);
  target = Math.max(target, minTarget);

  // 3. Stop Loss: Dinamis berbasis Volatilitas (ATR) & Supertrend
  const atr = Number(technicals.atr14 || technicals.atr || 0);
  const percentStopLoss = entryLow * (1 - stopLossPct / 100);
  
  let dynamicStopLoss = percentStopLoss;
  if (atr > 0) {
    // Berikan bantalan volatilitas 1.5x ATR di bawah entryLow
    const atrStopLoss = entryLow - (1.5 * atr);
    // Batasi risiko maksimal agar tidak lebih dalam dari -8%
    const maxRiskFloor = entryLow * 0.92;
    dynamicStopLoss = Math.max(maxRiskFloor, Math.min(percentStopLoss, atrStopLoss));
  }

  // Jika Supertrend lower band tersedia dan berada di bawah entryLow, pertimbangkan sebagai level support
  const stLower = Number(technicals.supertrend?.lowerBand || (technicals.supertrend?.trend === 'bullish' ? technicals.supertrend?.value : null));
  if (stLower && stLower < entryLow && stLower >= entryLow * 0.92) {
    dynamicStopLoss = Math.min(dynamicStopLoss, stLower);
  }

  let stopLoss = roundToIDXTick(dynamicStopLoss, 'down');
  const maxStopLoss = entryLow - (getIDXPriceStep(entryLow) * 2);
  stopLoss = Math.min(stopLoss, maxStopLoss);

  // 4. Rasio Risk/Reward
  const avgEntry = (entryLow + entryHigh) / 2;
  const reward = target - avgEntry;
  const risk = avgEntry - stopLoss;
  const riskReward = (risk > 0 && reward > 0) ? Math.round((reward / risk) * 10) / 10 : 0;

  return {
    entry: { low: entryLow, high: entryHigh },
    target,
    stopLoss,
    riskReward,
    setup: translateSetup(setup || 'none'),
    riskLevel: getRiskLabel(riskReward, styleConfig),
  };
}

function translateSetup(setup) {
  switch (setup) {
    case 'pullback': return 'Pullback';
    case 'breakout': return 'Breakout';
    case 'scalp': return 'Scalping';
    case 'momentum': return 'Momentum';
    case 'none':
    default: return 'None';
  }
}

function getRiskLabel(rr, styleConfig) {
  const styleRisk = styleConfig.riskLevel;
  const rrEmoji = rr >= 2 ? '✅' : '⚠️';
  
  return { 
    level: styleRisk, 
    color: styleConfig.riskColor, 
    description: `Gaya ${styleConfig.label} (${styleRisk}) — RR ${rr}:1 ${rrEmoji}` 
  };
}
