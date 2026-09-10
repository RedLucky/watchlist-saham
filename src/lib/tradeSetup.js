/**
 * Trade Setup Calculator
 * Calculates entry range, target price, stop loss, and risk/reward ratio
 * strictly conforming to Indonesia Stock Exchange (BEI / IDX) official tick sizes.
 */

// ==========================================
// KONSTANTA RESMI BURSA EFEK INDONESIA (BEI)
// ==========================================

// Ambang batas kelompok harga saham (IDX Price Tiers)
export const IDX_PRICE_TIER_1_MAX = 200;   // Saham di bawah Rp 200
export const IDX_PRICE_TIER_2_MAX = 500;   // Saham Rp 200 s/d Rp 500
export const IDX_PRICE_TIER_3_MAX = 2000;  // Saham Rp 500 s/d Rp 2.000
export const IDX_PRICE_TIER_4_MAX = 5000;  // Saham Rp 2.000 s/d Rp 5.000

// Besaran fraksi harga (Tick Size) resmi per tier BEI
export const IDX_TICK_STEP_TIER_1 = 1;     // Fraksi Rp 1 untuk harga < 200
export const IDX_TICK_STEP_TIER_2 = 2;     // Fraksi Rp 2 untuk harga 200 - 500
export const IDX_TICK_STEP_TIER_3 = 5;     // Fraksi Rp 5 untuk harga 500 - 2.000
export const IDX_TICK_STEP_TIER_4 = 10;    // Fraksi Rp 10 untuk harga 2.000 - 5.000
export const IDX_TICK_STEP_TIER_5 = 25;    // Fraksi Rp 25 untuk harga >= 5.000

// Persentase batas kenaikan harian maksimal (Auto Rejection Atas / ARA) BEI
export const IDX_ARA_LIMIT_TIER_1_PCT = 35; // +35% untuk harga < 200
export const IDX_ARA_LIMIT_TIER_2_PCT = 25; // +25% untuk harga 200 - 5.000
export const IDX_ARA_LIMIT_TIER_3_PCT = 20; // +20% untuk harga > 5.000

// ==========================================
// KONSTANTA STRATEGI TRADING & RISK CONTROL
// ==========================================

// Rasio buffer entri beli berdasarkan jenis setup teknikal
export const PULLBACK_ENTRY_LOWER_RATIO = 0.99; // 1% di bawah MA support
export const PULLBACK_ENTRY_UPPER_RATIO = 1.01; // 1% di atas MA support

export const BREAKOUT_ENTRY_LOWER_RATIO = 0.995; // 0.5% di bawah harga breakout
export const BREAKOUT_ENTRY_UPPER_RATIO = 1.015; // 1.5% di atas harga breakout

export const SCALP_ENTRY_LOWER_RATIO = 0.995;    // 0.5% di bawah harga
export const SCALP_ENTRY_UPPER_RATIO = 1.005;    // 0.5% di atas harga

export const MOMENTUM_ENTRY_LOWER_RATIO = 0.99; // 1% di bawah harga
export const MOMENTUM_ENTRY_UPPER_RATIO = 1.01; // 1% di atas harga

// Pengali volatilitas Average True Range (ATR) untuk bantalan stop loss dinamis
export const ATR_VOLATILITY_STOP_LOSS_MULTIPLIER = 1.5;

// Batas risiko maksimal drawdown portofolio (maksimal risiko -8% dari entryLow)
export const MAX_STOP_LOSS_DRAWDOWN_RATIO = 0.92;

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
  if (p < IDX_PRICE_TIER_1_MAX) return IDX_TICK_STEP_TIER_1;
  if (p < IDX_PRICE_TIER_2_MAX) return IDX_TICK_STEP_TIER_2;
  if (p < IDX_PRICE_TIER_3_MAX) return IDX_TICK_STEP_TIER_3;
  if (p < IDX_PRICE_TIER_4_MAX) return IDX_TICK_STEP_TIER_4;
  return IDX_TICK_STEP_TIER_5;
}

/**
 * Batas Auto Rejection Atas (ARA) resmi BEI:
 * - Harga < Rp 200         : +35%
 * - Harga Rp 200 - Rp 5.000: +25%
 * - Harga > Rp 5.000      : +20%
 */
export function getIDXRiseLimitPct(price) {
  const p = Number(price);
  if (p < IDX_PRICE_TIER_1_MAX) return IDX_ARA_LIMIT_TIER_1_PCT;
  if (p <= IDX_PRICE_TIER_4_MAX) return IDX_ARA_LIMIT_TIER_2_PCT;
  return IDX_ARA_LIMIT_TIER_3_PCT;
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

/**
 * Membersihkan dan mengubah input mata uang (termasuk format Indonesia titik/koma) menjadi number.
 * Mencegah error parsing saat pengguna menginput string seperti 'Rp 10.000,50' atau '5.000'.
 * 
 * @param {string|number|null|undefined} val 
 * @returns {number} Hasil konversi float atau NaN jika input tidak valid
 */
export function parsePrice(val) {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  let str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return NaN;

  // Format Indonesia dengan titik ribuan dan koma desimal (misal: '10.000,50')
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    // Jika semua bagian setelah titik memiliki 3 digit, anggap pemisah ribuan
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    // Koma tunggal sebagai pemisah desimal
    str = str.replace(/,/g, '.');
  }
  return parseFloat(str);
}

/**
 * Menghitung target harga jual (Take Profit) berdasarkan harga beli dan persentase gain yang diinginkan.
 * Harga otomatis dibulatkan sesuai fraksi resmi BEI (roundToIDXTick).
 * 
 * @param {string|number} buyPriceInput - Harga beli entry
 * @param {string|number} percentInput - Persentase gain yang diinginkan (misal: 10 atau '10.5')
 * @returns {string} Harga jual yang dibulatkan ke fraksi BEI atau '' jika input tidak valid
 */
export function calculateTargetSellFromPercent(buyPriceInput, percentInput) {
  const buy = parsePrice(buyPriceInput);
  const pct = parsePrice(percentInput);

  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(pct)) {
    return '';
  }

  const gainMultiplier = 1 + (pct / 100);
  const rawTargetSell = buy * gainMultiplier;
  const roundedSell = roundToIDXTick(rawTargetSell);

  return roundedSell.toString();
}

/**
 * Menghitung persentase keuntungan/kerugian antara harga beli dan harga jual.
 * 
 * @param {string|number} buyPriceInput - Harga beli entry
 * @param {string|number} sellPriceInput - Target harga jual
 * @returns {string} Persentase gain diformat 2 desimal (misal: '15.00') atau '' jika tidak valid
 */
export function calculateTargetPercentFromPrices(buyPriceInput, sellPriceInput) {
  const buy = parsePrice(buyPriceInput);
  const sell = parsePrice(sellPriceInput);

  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(sell) || sell <= 0) {
    return '';
  }

  const priceDifference = sell - buy;
  const percentGain = (priceDifference / buy) * 100;

  return percentGain.toFixed(2);
}

/**
 * Helper: Menghitung metrik pantau (nominal Rp untung/rugi & persentase) dengan fallback aman dan error handling
 */
export function calculateMonitorMetrics(entryStr, targetStr, stopLossStr) {
  const entry = parsePrice(entryStr);
  const target = parsePrice(targetStr);
  const stopLoss = parsePrice(stopLossStr);

  const validEntry = Number.isFinite(entry) && entry > 0;
  const validTarget = Number.isFinite(target) && target > 0;
  const validStopLoss = Number.isFinite(stopLoss) && stopLoss > 0;

  let profitNominal = null;
  let profitPercent = null;
  let hasProfit = false;
  if (validEntry && validTarget) {
    profitNominal = target - entry;
    profitPercent = ((target - entry) / entry) * 100;
    hasProfit = Number.isFinite(profitNominal) && Number.isFinite(profitPercent);
  }

  let lossNominal = null;
  let lossPercent = null;
  let hasLoss = false;
  if (validEntry && validStopLoss) {
    lossNominal = entry - stopLoss;
    lossPercent = ((entry - stopLoss) / entry) * 100;
    hasLoss = Number.isFinite(lossNominal) && Number.isFinite(lossPercent);
  }

  let rrRatio = null;
  if (hasProfit && hasLoss && lossNominal > 0 && profitNominal > 0) {
    rrRatio = Number((profitNominal / lossNominal).toFixed(2));
  }

  return {
    validEntry,
    validTarget,
    validStopLoss,
    hasProfit,
    hasLoss,
    profitNominal: hasProfit ? profitNominal : null,
    profitPercent: hasProfit ? profitPercent : null,
    lossNominal: hasLoss ? lossNominal : null,
    lossPercent: hasLoss ? lossPercent : null,
    rrRatio: Number.isFinite(rrRatio) ? rrRatio : null,
  };
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
    entryLow = roundToIDXTick(entryBase * PULLBACK_ENTRY_LOWER_RATIO, 'down');
    entryHigh = roundToIDXTick(entryBase * PULLBACK_ENTRY_UPPER_RATIO, 'up');
  } else if (setup === 'breakout') {
    entryLow = roundToIDXTick(price * BREAKOUT_ENTRY_LOWER_RATIO, 'down');
    entryHigh = roundToIDXTick(price * BREAKOUT_ENTRY_UPPER_RATIO, 'up');
  } else if (setup === 'scalp') {
    entryLow = roundToIDXTick(price * SCALP_ENTRY_LOWER_RATIO, 'down');
    entryHigh = roundToIDXTick(price * SCALP_ENTRY_UPPER_RATIO, 'up');
  } else {
    // Default momentum / setup
    entryLow = roundToIDXTick(price * MOMENTUM_ENTRY_LOWER_RATIO, 'down');
    entryHigh = roundToIDXTick(price * MOMENTUM_ENTRY_UPPER_RATIO, 'up');
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
    // Jika resisten berada di atas entryHigh minimal 2.5% dan dalam jangkauan wajar (< 35%)
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

  // Plafon ARA resmi BEI: Target Price tidak boleh melebihi batas kenaikan harian maksimal
  const maxAraPrice = roundToIDXTick(price * (1 + getIDXRiseLimitPct(price) / 100), 'down');
  if (target > maxAraPrice && maxAraPrice >= minTarget) {
    target = maxAraPrice;
  }

  // 3. Stop Loss: Dinamis berbasis Volatilitas (ATR) & Supertrend
  const atr = Number(technicals.atr14 || technicals.atr || 0);
  const percentStopLoss = entryLow * (1 - stopLossPct / 100);
  
  let dynamicStopLoss = percentStopLoss;
  if (atr > 0) {
    // Berikan bantalan volatilitas 1.5x ATR di bawah entryLow
    const atrStopLoss = entryLow - (ATR_VOLATILITY_STOP_LOSS_MULTIPLIER * atr);
    // Batasi risiko maksimal agar tidak lebih dalam dari -8%
    const maxRiskFloor = entryLow * MAX_STOP_LOSS_DRAWDOWN_RATIO;
    dynamicStopLoss = Math.max(maxRiskFloor, Math.min(percentStopLoss, atrStopLoss));
  }

  // Jika Supertrend lower band tersedia dan berada di bawah entryLow, pertimbangkan sebagai level support
  const stLower = Number(technicals.supertrend?.lowerBand || (technicals.supertrend?.trend === 'bullish' ? technicals.supertrend?.value : null));
  if (stLower && stLower < entryLow && stLower >= entryLow * MAX_STOP_LOSS_DRAWDOWN_RATIO) {
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
