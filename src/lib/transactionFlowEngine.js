/**
 * @fileoverview Hybrid Transaction Flow Engine (Inflow, Outflow & Netflow)
 * Computes Domestic and Foreign transaction flows across 1D, 1W, 1M, and 1Y windows.
 * Uses official IDX Stock Summary (Ringkasan Saham) data when available and falls back
 * to OHLCV buying/selling pressure calibrated with KSEI ownership data.
 */

/** Trading days per analysis window on the Indonesia Stock Exchange (BEI). */
export const FLOW_PERIOD_DAYS = Object.freeze({
  '1d': 1,
  '1w': 5,
  '1m': 20,
  '1y': 250,
});

/** Human-readable labels for each period key. */
export const FLOW_PERIOD_LABELS = Object.freeze({
  '1d': 'Harian (1HK)',
  '1w': 'Mingguan (5HK)',
  '1m': 'Bulanan (20HK)',
  '1y': 'Tahunan (250HK)',
});

/** Standard BEI lot size (1 lot = 100 shares). */
const SHARES_PER_LOT = 100;

/** Default foreign participation share when KSEI data is unavailable. */
const DEFAULT_FOREIGN_SHARE = 0.35;

/** Bounds for foreign participation share in fallback estimation. */
const MIN_FOREIGN_SHARE = 0.05;
const MAX_FOREIGN_SHARE = 0.85;

/** Maximum directional tilt from KSEI monthly ownership shift. */
const MAX_KSEI_TILT = 0.12;

/**
 * Clamps a numeric value between a minimum and maximum bound.
 *
 * @param {number} value - Input number to clamp.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped number, or min if value is not finite.
 */
export function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

/**
 * Converts a share count into BEI lots (1 lot = 100 shares), rounded to nearest integer.
 *
 * @param {number} shares - Number of shares (lembar).
 * @returns {number} Equivalent number of lots.
 */
export function sharesToLots(shares) {
  const num = Number(shares);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num / SHARES_PER_LOT);
}

/**
 * Computes the active buying pressure ratio (0 to 1) for a single daily OHLC candle.
 * Combines Close Location Value (where the close sits inside the high-low range)
 * with day-over-day price change so gap-up candles still register positive inflow.
 *
 * @param {object} candle - Daily price bar.
 * @param {number} candle.close - Closing price.
 * @param {number} candle.high - Intraday high price.
 * @param {number} candle.low - Intraday low price.
 * @param {number} candle.prevClose - Previous day's closing price.
 * @returns {number} Buying pressure ratio in the range [0.1, 0.9].
 */
export function computeDailyBuyingRatio({ close, high, low, prevClose }) {
  const safeClose = Number(close) || 0;
  const safeHigh = Number(high) || safeClose;
  const safeLow = Number(low) || safeClose;
  const safePrev = Number(prevClose) || safeClose;

  const priceDeltaPct = safePrev > 0 ? (safeClose - safePrev) / safePrev : 0;
  // Logistic curve maps a +/-5% daily return smoothly toward 0.73 / 0.27
  const momentumRatio = 1 / (1 + Math.exp(-20 * priceDeltaPct));

  if (safeHigh > safeLow) {
    const clvRatio = (safeClose - safeLow) / (safeHigh - safeLow);
    const blended = clvRatio * 0.65 + momentumRatio * 0.35;
    return clampNumber(blended, 0.1, 0.9);
  }

  return clampNumber(momentumRatio, 0.15, 0.85);
}

/**
 * Extracts foreign participation weight and directional tilts from KSEI snapshot data.
 *
 * @param {object|null} kseiLatest - Latest KSEI monthly ownership record.
 * @returns {{ foreignWeight: number, domesticWeight: number, foreignTilt: number, domesticTilt: number }}
 */
export function resolveKseiFlowWeights(kseiLatest) {
  if (!kseiLatest || typeof kseiLatest !== 'object') {
    return {
      foreignWeight: DEFAULT_FOREIGN_SHARE,
      domesticWeight: 1 - DEFAULT_FOREIGN_SHARE,
      foreignTilt: 0,
      domesticTilt: 0,
    };
  }

  const rawForeignPct = Number(kseiLatest.foreignPercent);
  const foreignWeight = Number.isFinite(rawForeignPct) && rawForeignPct > 0
    ? clampNumber(rawForeignPct / 100, MIN_FOREIGN_SHARE, MAX_FOREIGN_SHARE)
    : DEFAULT_FOREIGN_SHARE;
  const domesticWeight = Number((1 - foreignWeight).toFixed(4));

  const floatShares = Number(kseiLatest.freeFloatShares || kseiLatest.secNum || 0);
  if (floatShares <= 0) {
    return { foreignWeight, domesticWeight, foreignTilt: 0, domesticTilt: 0 };
  }

  const deltaForeign = Number(kseiLatest.deltaForeign || 0);
  const deltaDomInst = Number(kseiLatest.deltaPension || 0)
    + Number(kseiLatest.deltaMutualFund || 0)
    + Number(kseiLatest.deltaInsurance || 0);

  // Scale monthly share shift relative to free float into a modest daily buy-ratio tilt
  const foreignTilt = clampNumber((deltaForeign / floatShares) * 2.5, -MAX_KSEI_TILT, MAX_KSEI_TILT);
  const domesticTilt = clampNumber((deltaDomInst / floatShares) * 2.5, -MAX_KSEI_TILT, MAX_KSEI_TILT);

  return { foreignWeight, domesticWeight, foreignTilt, domesticTilt };
}

/**
 * Builds normalized daily flow records combining official IDX flow records (when matched)
 * with OHLCV + KSEI estimated daily bars.
 *
 * @param {object} params - Input series for a stock.
 * @param {number[]} [params.prices=[]] - Historical daily close prices.
 * @param {number[]} [params.volumes=[]] - Historical daily volumes in shares.
 * @param {number[]} [params.highs=[]] - Historical daily highs.
 * @param {number[]} [params.lows=[]] - Historical daily lows.
 * @param {Array<object>} [params.idxFlow=[]] - Scraped IDX Ringkasan Saham daily records.
 * @param {object|null} [params.kseiLatest=null] - Latest KSEI snapshot.
 * @param {number} [params.fallbackPrice=0] - Current stock price when series is empty.
 * @param {number} [params.fallbackVolume=0] - Current stock volume when series is empty.
 * @returns {Array<object>} Chronological daily flow records (up to 250 days).
 */
export function buildDailyFlowSeries({
  prices = [],
  volumes = [],
  highs = [],
  lows = [],
  idxFlow = [],
  kseiLatest = null,
  fallbackPrice = 0,
  fallbackVolume = 0,
} = {}) {
  const rawPrices = Array.isArray(prices) && prices.length > 0
    ? prices
    : (fallbackPrice > 0 ? [fallbackPrice] : []);
  const rawVolumes = Array.isArray(volumes) && volumes.length > 0
    ? volumes
    : (fallbackVolume > 0 ? [fallbackVolume] : []);

  const len = Math.min(rawPrices.length, rawVolumes.length);
  const validIdxFlow = Array.isArray(idxFlow)
    ? idxFlow.filter((row) => row && Number(row.volume) > 0 && Number(row.close || row.price) > 0)
    : [];

  if (len === 0 && validIdxFlow.length === 0) {
    return [];
  }

  const kseiWeights = resolveKseiFlowWeights(kseiLatest);
  const totalBars = Math.max(len, validIdxFlow.length);
  const startIdx = Math.max(0, totalBars - FLOW_PERIOD_DAYS['1y']);
  const series = [];

  for (let i = startIdx; i < totalBars; i++) {
    // Align trailing IDX flow records with the end of the OHLCV array
    const idxOffset = i - (totalBars - validIdxFlow.length);
    const idxRecord = idxOffset >= 0 ? validIdxFlow[idxOffset] : null;

    const close = Number(rawPrices[i] ?? idxRecord?.close ?? fallbackPrice) || 0;
    const prevClose = i > 0 ? (Number(rawPrices[i - 1]) || close) : close;
    const high = Number(highs[i] ?? idxRecord?.high ?? close) || close;
    const low = Number(lows[i] ?? idxRecord?.low ?? close) || close;
    const volume = Math.max(0, Number(idxRecord?.volume ?? rawVolumes[i] ?? 0));

    if (close <= 0 || volume <= 0) continue;

    const buyRatio = computeDailyBuyingRatio({ close, high, low, prevClose });
    series.push(createSingleDayFlowBar({
      close,
      volume,
      buyRatio,
      idxRecord,
      kseiWeights,
    }));
  }

  return series;
}

/**
 * Computes a single day's domestic, foreign, and active money flow values.
 *
 * @param {object} params - Day inputs.
 * @param {number} params.close - Closing price.
 * @param {number} params.volume - Volume in shares.
 * @param {number} params.buyRatio - Active buying pressure ratio [0, 1].
 * @param {object|null} params.idxRecord - Scraped IDX Ringkasan Saham row if available.
 * @param {object} params.kseiWeights - KSEI foreign/domestic weights and tilts.
 * @returns {object} Single day flow breakdown.
 */
function createSingleDayFlowBar({ close, volume, buyRatio, idxRecord, kseiWeights }) {
  const turnoverRp = Number(idxRecord?.value) > 0
    ? Number(idxRecord.value)
    : Math.round(volume * close);
  const avgPrice = volume > 0 ? turnoverRp / volume : close;

  const activeBuyShares = Math.round(volume * buyRatio);
  const activeSellShares = Math.max(0, volume - activeBuyShares);

  if (idxRecord && idxRecord.foreignBuy != null && idxRecord.foreignSell != null) {
    const fBuyShares = clampNumber(idxRecord.foreignBuy, 0, volume);
    const fSellShares = clampNumber(idxRecord.foreignSell, 0, volume);
    const dBuyShares = Math.max(0, volume - fBuyShares);
    const dSellShares = Math.max(0, volume - fSellShares);

    return {
      source: 'idx',
      volume,
      turnoverRp,
      foreignBuyShares: fBuyShares,
      foreignSellShares: fSellShares,
      foreignBuyRp: Math.round(fBuyShares * avgPrice),
      foreignSellRp: Math.round(fSellShares * avgPrice),
      domesticBuyShares: dBuyShares,
      domesticSellShares: dSellShares,
      domesticBuyRp: Math.round(dBuyShares * avgPrice),
      domesticSellRp: Math.round(dSellShares * avgPrice),
      activeBuyShares,
      activeSellShares,
      activeBuyRp: Math.round(activeBuyShares * avgPrice),
      activeSellRp: Math.round(activeSellShares * avgPrice),
    };
  }

  const foreignVol = Math.round(volume * kseiWeights.foreignWeight);
  const domesticVol = Math.max(0, volume - foreignVol);

  const fBuyRatio = clampNumber(buyRatio + kseiWeights.foreignTilt, 0.08, 0.92);
  const dBuyRatio = clampNumber(buyRatio + kseiWeights.domesticTilt, 0.08, 0.92);

  const fBuyShares = Math.round(foreignVol * fBuyRatio);
  const fSellShares = Math.max(0, foreignVol - fBuyShares);
  const dBuyShares = Math.round(domesticVol * dBuyRatio);
  const dSellShares = Math.max(0, domesticVol - dBuyShares);

  return {
    source: 'estimated',
    volume,
    turnoverRp,
    foreignBuyShares: fBuyShares,
    foreignSellShares: fSellShares,
    foreignBuyRp: Math.round(fBuyShares * avgPrice),
    foreignSellRp: Math.round(fSellShares * avgPrice),
    domesticBuyShares: dBuyShares,
    domesticSellShares: dSellShares,
    domesticBuyRp: Math.round(dBuyShares * avgPrice),
    domesticSellRp: Math.round(dSellShares * avgPrice),
    activeBuyShares,
    activeSellShares,
    activeBuyRp: Math.round(activeBuyShares * avgPrice),
    activeSellRp: Math.round(activeSellShares * avgPrice),
  };
}

/**
 * Aggregates a slice of daily flow bars into a period summary (1D, 1W, 1M, or 1Y).
 *
 * @param {Array<object>} bars - Slice of daily flow records for the target window.
 * @param {string} periodKey - Period identifier ('1d' | '1w' | '1m' | '1y').
 * @returns {object} Aggregated inflow, outflow, and netflow metrics for Domestic and Foreign.
 */
export function aggregateFlowWindow(bars = [], periodKey = '1d') {
  const safeBars = Array.isArray(bars) ? bars : [];
  if (safeBars.length === 0) {
    return createEmptyWindowSummary(periodKey);
  }

  let totalVolume = 0;
  let totalTurnoverRp = 0;
  let fInRp = 0;
  let fOutRp = 0;
  let fInShares = 0;
  let fOutShares = 0;
  let dInRp = 0;
  let dOutRp = 0;
  let dInShares = 0;
  let dOutShares = 0;
  let actInRp = 0;
  let actOutRp = 0;
  let actInShares = 0;
  let actOutShares = 0;
  let idxCount = 0;

  for (const b of safeBars) {
    totalVolume += b.volume;
    totalTurnoverRp += b.turnoverRp;
    fInRp += b.foreignBuyRp;
    fOutRp += b.foreignSellRp;
    fInShares += b.foreignBuyShares;
    fOutShares += b.foreignSellShares;
    dInRp += b.domesticBuyRp;
    dOutRp += b.domesticSellRp;
    dInShares += b.domesticBuyShares;
    dOutShares += b.domesticSellShares;
    actInRp += b.activeBuyRp;
    actOutRp += b.activeSellRp;
    actInShares += b.activeBuyShares;
    actOutShares += b.activeSellShares;
    if (b.source === 'idx') idxCount++;
  }

  const source = idxCount === safeBars.length
    ? 'idx'
    : (idxCount > 0 ? 'hybrid' : 'estimated');

  const foreign = buildParticipantSummary({
    inflowRp: fInRp,
    outflowRp: fOutRp,
    inflowShares: fInShares,
    outflowShares: fOutShares,
    totalTurnoverRp,
  });

  const domestic = buildParticipantSummary({
    inflowRp: dInRp,
    outflowRp: dOutRp,
    inflowShares: dInShares,
    outflowShares: dOutShares,
    totalTurnoverRp,
  });

  const activeFlow = buildParticipantSummary({
    inflowRp: actInRp,
    outflowRp: actOutRp,
    inflowShares: actInShares,
    outflowShares: actOutShares,
    totalTurnoverRp,
  });

  return {
    period: periodKey,
    label: FLOW_PERIOD_LABELS[periodKey] || periodKey,
    days: safeBars.length,
    idxDays: idxCount,
    source,
    totalTurnoverRp,
    totalVolumeShares: totalVolume,
    totalLots: sharesToLots(totalVolume),
    foreign,
    domestic,
    activeFlow,
    dominantPlayer: classifyDominantFlow(foreign, domestic),
  };
}

/**
 * Formats participant (Foreign, Domestic, or Active) inflow/outflow/netflow metrics.
 *
 * @param {object} params - Raw participant totals.
 * @param {number} params.inflowRp - Gross buy in Rupiah.
 * @param {number} params.outflowRp - Gross sell in Rupiah.
 * @param {number} params.inflowShares - Gross buy in shares.
 * @param {number} params.outflowShares - Gross sell in shares.
 * @param {number} params.totalTurnoverRp - Total market turnover in Rupiah.
 * @returns {object} Formatted participant metrics with Lots and percentages.
 */
function buildParticipantSummary({
  inflowRp,
  outflowRp,
  inflowShares,
  outflowShares,
  totalTurnoverRp,
}) {
  const netflowRp = inflowRp - outflowRp;
  const inflowLots = sharesToLots(inflowShares);
  const outflowLots = sharesToLots(outflowShares);
  const netflowLots = inflowLots - outflowLots;
  const grossHalf = (inflowRp + outflowRp) / 2;

  const shareOfTurnoverPct = totalTurnoverRp > 0
    ? Number(((grossHalf / totalTurnoverRp) * 100).toFixed(1))
    : 0;
  const netflowPct = totalTurnoverRp > 0
    ? Number(((netflowRp / totalTurnoverRp) * 100).toFixed(2))
    : 0;

  return {
    inflowRp,
    outflowRp,
    netflowRp,
    inflowLots,
    outflowLots,
    netflowLots,
    shareOfTurnoverPct,
    netflowPct,
  };
}

/**
 * Classifies whether Foreign or Domestic participants are driving accumulation or distribution.
 *
 * @param {object} foreign - Foreign flow summary.
 * @param {object} domestic - Domestic flow summary.
 * @returns {string} Dominant flow classification label.
 */
function classifyDominantFlow(foreign, domestic) {
  const fPct = foreign?.netflowPct || 0;
  const dPct = domestic?.netflowPct || 0;

  if (fPct >= 2.0) return 'FOREIGN_ACCUMULATION';
  if (dPct >= 2.0 && fPct < 2.0) return 'DOMESTIC_ACCUMULATION';
  if (fPct <= -2.0) return 'FOREIGN_DISTRIBUTION';
  if (dPct <= -2.0) return 'DOMESTIC_DISTRIBUTION';
  return 'BALANCED';
}

/**
 * Returns a zeroed summary object when no historical bars exist.
 *
 * @param {string} periodKey - Period key ('1d' | '1w' | '1m' | '1y').
 * @returns {object} Empty period summary.
 */
function createEmptyWindowSummary(periodKey) {
  const emptySide = {
    inflowRp: 0,
    outflowRp: 0,
    netflowRp: 0,
    inflowLots: 0,
    outflowLots: 0,
    netflowLots: 0,
    shareOfTurnoverPct: 0,
    netflowPct: 0,
  };
  return {
    period: periodKey,
    label: FLOW_PERIOD_LABELS[periodKey] || periodKey,
    days: 0,
    idxDays: 0,
    source: 'empty',
    totalTurnoverRp: 0,
    totalVolumeShares: 0,
    totalLots: 0,
    foreign: { ...emptySide },
    domestic: { ...emptySide },
    activeFlow: { ...emptySide },
    dominantPlayer: 'BALANCED',
  };
}

/**
 * Computes the complete multi-timeframe (1D, 1W, 1M, 1Y) Domestic & Foreign
 * Inflow, Outflow, and Netflow report for a stock.
 *
 * @param {object} stockInput - Stock data containing technicals, kseiLatest, price, and volume.
 * @returns {object} Multi-timeframe transaction flow report (`periods['1d'|'1w'|'1m'|'1y']`).
 */
export function calculateTransactionFlows(stockInput = {}) {
  const technicals = stockInput?.technicals || {};
  const series = buildDailyFlowSeries({
    prices: technicals.prices,
    volumes: technicals.volumes,
    highs: technicals.highs,
    lows: technicals.lows,
    idxFlow: technicals.idxFlow,
    kseiLatest: stockInput?.kseiLatest || null,
    fallbackPrice: Number(stockInput?.price || 0),
    fallbackVolume: Number(stockInput?.volume || 0),
  });

  const periods = {};
  for (const [key, maxDays] of Object.entries(FLOW_PERIOD_DAYS)) {
    const slice = series.slice(-maxDays);
    periods[key] = aggregateFlowWindow(slice, key);
  }

  return {
    updatedAt: technicals.idxFlowUpdatedAt || null,
    hasIdxData: series.some((b) => b.source === 'idx'),
    periods,
  };
}

