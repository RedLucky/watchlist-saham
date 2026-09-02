/**
 * Technical Indicators — Centralized Calculation Module
 *
 * All technical indicator calculations live here. Used by syncService (data
 * persistence) and scoring modules (analysis).
 *
 * Key improvements over previous duplicated implementations:
 * - RSI uses Wilder's smoothing (EMA) instead of simple SMA
 * - ATR uses Wilder's smoothing for consistency
 * - All functions handle edge cases (NaN, empty arrays, insufficient data)
 * - Added MACD and Bollinger Bands
 */

/**
 * Simple Moving Average
 * Returns the MA value for the last `period` data points.
 */
export function calculateMA(prices, period) {
  const clean = sanitizePrices(prices);
  if (clean.length === 0 || period <= 0) return 0;
  if (clean.length < period) {
    // Not enough data for full period — compute MA from all available data
    return clean.reduce((a, b) => a + b, 0) / clean.length;
  }
  const slice = clean.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Exponential Moving Average
 * Returns the final EMA value for the full price series.
 */
export function calculateEMA(prices, period) {
  const clean = sanitizePrices(prices);
  if (clean.length === 0 || period <= 0) return 0;
  if (clean.length < period) return clean[clean.length - 1];

  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values
  let ema = clean.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < clean.length; i++) {
    ema = clean[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Relative Strength Index (Wilder's smoothing)
 *
 * Uses exponential moving average for gains/losses instead of SMA.
 * This is the standard RSI calculation used by most trading platforms.
 */
export function calculateRSI(prices, period = 14) {
  const clean = sanitizePrices(prices);
  if (clean.length < period + 1) return 50; // Insufficient data

  // Calculate initial average gain/loss using SMA
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = clean[i] - clean[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's smoothing for remaining data points
  for (let i = period + 1; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Average True Range (Wilder's smoothing)
 *
 * Uses Wilder's smoothing method for a more responsive ATR.
 * Requires historical data with { high, low, close } fields.
 */
export function calculateATR(historical, period = 14) {
  if (!Array.isArray(historical) || historical.length < period + 1) return 0;

  // Calculate True Ranges
  const trueRanges = [];
  for (let i = 1; i < historical.length; i++) {
    const high = Number(historical[i].high);
    const low = Number(historical[i].low);
    const prevClose = Number(historical[i - 1].close);
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(prevClose)) continue;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return 0;

  // Initial ATR = SMA of first `period` true ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Apply Wilder's smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * MACD (Moving Average Convergence Divergence)
 *
 * Returns { macdLine, signalLine, histogram }.
 * Standard settings: fast=12, slow=26, signal=9.
 */
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const clean = sanitizePrices(prices);
  if (clean.length < slowPeriod + signalPeriod) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }

  const fastK = 2 / (fastPeriod + 1);
  const slowK = 2 / (slowPeriod + 1);

  // Calculate fast and slow EMA series
  let fastEma = clean.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  
  // WARM-UP LOOP: iterasi fastEma agar catch-up sampai indeks slowPeriod
  for (let i = fastPeriod; i < slowPeriod; i++) {
    fastEma = clean[i] * fastK + fastEma * (1 - fastK);
  }

  let slowEma = clean.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;

  const macdSeries = [];
  // Sekarang fastEma dan slowEma ada di indeks yang sama (slowPeriod - 1)
  // Lanjutkan iterasi dari slowPeriod sampai akhir
  for (let i = slowPeriod; i < clean.length; i++) {
    fastEma = clean[i] * fastK + fastEma * (1 - fastK);
    slowEma = clean[i] * slowK + slowEma * (1 - slowK);
    macdSeries.push(fastEma - slowEma);
  }

  if (macdSeries.length < signalPeriod) {
    return { macdLine: macdSeries[macdSeries.length - 1] || 0, signalLine: 0, histogram: 0 };
  }

  // Signal line = EMA of MACD series
  const sigK = 2 / (signalPeriod + 1);
  let signalLine = macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdSeries.length; i++) {
    signalLine = macdSeries[i] * sigK + signalLine * (1 - sigK);
  }

  const macdLine = macdSeries[macdSeries.length - 1];
  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine,
  };
}

/**
 * Bollinger Bands
 *
 * Returns { upper, middle, lower, bandwidth }.
 */
export function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  const clean = sanitizePrices(prices);
  if (clean.length < period || period <= 0) {
    const lastPrice = clean[clean.length - 1] || 0;
    return { upper: lastPrice, middle: lastPrice, lower: lastPrice, bandwidth: 0 };
  }

  const slice = clean.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDev * stdDevMultiplier;
  const lower = middle - stdDev * stdDevMultiplier;
  const bandwidth = middle > 0 ? (upper - lower) / middle : 0;

  return { upper, middle, lower, bandwidth };
}

/**
 * Volume Moving Average
 *
 * Returns the average volume over the last `period` days.
 */
export function calculateVolumeMA(volumes, period = 20) {
  const clean = sanitizeVolumes(volumes);
  if (clean.length === 0 || period <= 0) return 0;
  const slice = clean.slice(-Math.min(period, clean.length));
  return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
}

/**
 * Double Exponential Moving Average (DEMA)
 * Formula: DEMA = 2 * EMA(P, n) - EMA(EMA(P, n), n)
 *
 * Reduces lag significantly compared to traditional EMA/SMA.
 * Returns the latest DEMA value.
 */
export function calculateDEMA(prices, period = 20) {
  const series = calculateDEMASeries(prices, period);
  return series.length > 0 ? series[series.length - 1] : 0;
}

/**
 * Double Exponential Moving Average Series
 * Returns the full array of DEMA values matching the price sequence.
 */
export function calculateDEMASeries(prices, period = 20) {
  const clean = sanitizePrices(prices);
  if (clean.length === 0 || period <= 0) return [];
  if (clean.length < period) return clean.map(() => clean[clean.length - 1]);

  const k = 2 / (period + 1);

  // 1. First EMA series (EMA1)
  const ema1 = new Array(clean.length);
  let seed1 = clean.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period - 1; i++) {
    ema1[i] = clean[i];
  }
  ema1[period - 1] = seed1;
  for (let i = period; i < clean.length; i++) {
    ema1[i] = clean[i] * k + ema1[i - 1] * (1 - k);
  }

  // 2. Second EMA series (EMA2 = EMA of EMA1)
  const ema2 = new Array(clean.length);
  const ema1Slice = ema1.slice(period - 1);
  if (ema1Slice.length < period) {
    // If not enough points for second smoothing, fallback to EMA1
    return ema1;
  }

  let seed2 = ema1Slice.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const startIdx = (period - 1) + (period - 1);
  for (let i = 0; i < Math.min(startIdx, clean.length); i++) {
    ema2[i] = ema1[i];
  }
  if (startIdx < clean.length) {
    ema2[startIdx] = seed2;
    for (let i = startIdx + 1; i < clean.length; i++) {
      ema2[i] = ema1[i] * k + ema2[i - 1] * (1 - k);
    }
  }

  // 3. DEMA = 2 * EMA1 - EMA2
  const dema = new Array(clean.length);
  for (let i = 0; i < clean.length; i++) {
    if (i < startIdx) {
      dema[i] = ema1[i];
    } else {
      dema[i] = 2 * ema1[i] - ema2[i];
    }
  }

  return dema;
}

/**
 * Supertrend Indicator
 *
 * Combines Average True Range (ATR) with median price to detect trend direction
 * and provide dynamic trailing stop loss levels.
 *
 * @param {Array<{high: number, low: number, close: number}>} historical - Candle history
 * @param {number} period - ATR lookback period (default 10)
 * @param {number} multiplier - ATR multiplier factor (default 3.0)
 * @returns {{
 *   value: number,
 *   trend: 'bullish' | 'bearish',
 *   direction: 1 | -1,
 *   upperBand: number,
 *   lowerBand: number,
 *   isReversal: boolean,
 *   history: Array<{ value: number, trend: 'bullish' | 'bearish', upperBand: number, lowerBand: number }>
 * }}
 */
export function calculateSupertrend(historical, period = 10, multiplier = 3.0) {
  if (!Array.isArray(historical) || historical.length < period + 1) {
    const lastClose = historical && historical.length > 0 ? Number(historical[historical.length - 1]?.close || 0) : 0;
    return {
      value: lastClose,
      trend: 'bullish',
      direction: 1,
      upperBand: lastClose,
      lowerBand: lastClose,
      isReversal: false,
      history: []
    };
  }

  // 1. Calculate True Ranges
  const trueRanges = [0]; // index 0 has no prev close
  for (let i = 1; i < historical.length; i++) {
    const high = Number(historical[i].high);
    const low = Number(historical[i].low);
    const prevClose = Number(historical[i - 1].close);
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  // 2. Calculate ATR Series with Wilder's Smoothing
  const atrSeries = new Array(historical.length).fill(0);
  if (trueRanges.length > period) {
    let initialATR = trueRanges.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
    atrSeries[period] = initialATR;
    for (let i = period + 1; i < historical.length; i++) {
      atrSeries[i] = (atrSeries[i - 1] * (period - 1) + trueRanges[i]) / period;
    }
  }

  // 3. Compute Basic Bands, Final Bands, and Trend
  const results = [];
  let prevFinalUpper = 0;
  let prevFinalLower = 0;
  let prevTrend = 1; // 1 = Bullish, -1 = Bearish

  for (let i = period; i < historical.length; i++) {
    const high = Number(historical[i].high);
    const low = Number(historical[i].low);
    const close = Number(historical[i].close);
    const prevClose = Number(historical[i - 1].close);
    const atr = atrSeries[i];

    const medianPrice = (high + low) / 2;
    const basicUpper = medianPrice + (multiplier * atr);
    const basicLower = medianPrice - (multiplier * atr);

    // Final Lower Band (Trailing upward only in uptrend)
    let finalLower = basicLower;
    if (i > period) {
      if (basicLower > prevFinalLower || prevClose < prevFinalLower) {
        finalLower = basicLower;
      } else {
        finalLower = prevFinalLower;
      }
    }

    // Final Upper Band (Trailing downward only in downtrend)
    let finalUpper = basicUpper;
    if (i > period) {
      if (basicUpper < prevFinalUpper || prevClose > prevFinalUpper) {
        finalUpper = basicUpper;
      } else {
        finalUpper = prevFinalUpper;
      }
    }

    // Determine Trend Direction
    let trend = prevTrend;
    if (prevTrend === 1 && close < finalLower) {
      trend = -1; // Reversal to Bearish
    } else if (prevTrend === -1 && close > finalUpper) {
      trend = 1;  // Reversal to Bullish
    }

    const supertrendValue = trend === 1 ? finalLower : finalUpper;

    results.push({
      value: Math.round(supertrendValue * 100) / 100,
      trend: trend === 1 ? 'bullish' : 'bearish',
      direction: trend,
      upperBand: Math.round(finalUpper * 100) / 100,
      lowerBand: Math.round(finalLower * 100) / 100,
    });

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevTrend = trend;
  }

  const latest = results.length > 0 ? results[results.length - 1] : {
    value: Number(historical[historical.length - 1]?.close || 0),
    trend: 'bullish',
    direction: 1,
    upperBand: 0,
    lowerBand: 0,
  };

  const secondLatest = results.length > 1 ? results[results.length - 2] : null;
  const isReversal = secondLatest ? secondLatest.trend !== latest.trend : false;

  return {
    value: latest.value,
    trend: latest.trend,
    direction: latest.direction,
    upperBand: latest.upperBand,
    lowerBand: latest.lowerBand,
    isReversal,
    history: results.slice(-30) // last 30 bars
  };
}

// ── Utility helpers ──────────────────────────────────────────────────────

function sanitizePrices(prices) {
  if (!Array.isArray(prices)) return [];
  return prices.map(Number).filter(Number.isFinite);
}

function sanitizeVolumes(volumes) {
  if (!Array.isArray(volumes)) return [];
  return volumes.map(Number).filter(v => Number.isFinite(v) && v >= 0);
}

