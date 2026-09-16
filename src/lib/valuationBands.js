/**
 * Bloomberg Valuation Bands Engine (PBND / VBND)
 * 
 * Computes historical P/E and P/BV valuation bands (Mean, +/-1 SD, +/-2 SD)
 * and determines statistical valuation extremes for institutional equity research.
 */

import { roundToIDXTick } from './tradeSetup.js';

/**
 * Standard deviation calculation helper (sample SD)
 */
function calculateStdDev(values, mean) {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Calculate Valuation Bands for a single metric (PE or PBV)
 * @param {Array<number>} historicalPrices - Historical closing prices
 * @param {number} currentPrice - Current market price
 * @param {number} denominatorValue - Current EPS (for PE) or current BVPS (for PBV)
 * @param {string} metricName - 'PE' | 'PBV'
 */
export function calculateValuationBands({
  historicalPrices = [],
  currentPrice = 0,
  denominatorValue = 0,
  metricName = 'PE'
}) {
  const price = Math.max(0, Number(currentPrice) || 0);
  const denom = Number(denominatorValue) || 0;

  if (price <= 0 || denom <= 0 || !Array.isArray(historicalPrices) || historicalPrices.length < 10) {
    return null;
  }

  // Generate historical multiples from closing prices
  const multiples = historicalPrices
    .map(p => Number(p?.close ?? p))
    .filter(p => Number.isFinite(p) && p > 0)
    .map(p => p / denom)
    .filter(m => Number.isFinite(m) && m > 0 && m < 150); // filter out abnormal spikes

  if (multiples.length < 10) return null;

  const sum = multiples.reduce((acc, val) => acc + val, 0);
  const mean = sum / multiples.length;
  const sd = calculateStdDev(multiples, mean);

  if (sd <= 0) return null;

  const currentMultiple = price / denom;
  const zScore = Number(((currentMultiple - mean) / sd).toFixed(2));

  // Multiple levels
  const minus2Sd = Math.max(0.1, mean - (2 * sd));
  const minus1Sd = Math.max(0.1, mean - (1 * sd));
  const plus1Sd = mean + (1 * sd);
  const plus2Sd = mean + (2 * sd);

  // Price targets at each valuation band
  const priceMinus2Sd = roundToIDXTick(minus2Sd * denom);
  const priceMinus1Sd = roundToIDXTick(minus1Sd * denom);
  const priceMean = roundToIDXTick(mean * denom);
  const pricePlus1Sd = roundToIDXTick(plus1Sd * denom);
  const pricePlus2Sd = roundToIDXTick(plus2Sd * denom);

  // Determine Valuation Zone
  let zone = 'Fair Mean';
  let zoneColor = 'blue';
  let zoneDesc = 'Valuasi berada di sekitar rata-rata historis (Fair Value).';

  if (zScore <= -1.5) {
    zone = 'Diskon Ekstrem (<-1.5 SD)';
    zoneColor = 'emerald';
    zoneDesc = `Valuasi ${metricName} berada di zona diskon historis langka (<-1.5 SD). Potensi peluang akumulasi defensif.`;
  } else if (zScore <= -0.5) {
    zone = 'Undervalued (-1 SD)';
    zoneColor = 'teal';
    zoneDesc = `Valuasi ${metricName} berada di bawah rata-rata historis (-1 SD). Margin of safety menarik.`;
  } else if (zScore >= 1.5) {
    zone = 'Premi Ekstrem (>+1.5 SD)';
    zoneColor = 'rose';
    zoneDesc = `Valuasi ${metricName} berada di zona ekspansi premium historis (>+1.5 SD). Waspadai potensi koreksi normalisasi mean.`;
  } else if (zScore >= 0.5) {
    zone = 'Overvalued (+1 SD)';
    zoneColor = 'amber';
    zoneDesc = `Valuasi ${metricName} berada di atas rata-rata historis (+1 SD).`;
  }

  return {
    metricName,
    currentMultiple: Number(currentMultiple.toFixed(2)),
    currentPrice: price,
    mean: Number(mean.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    zScore,
    zone,
    zoneColor,
    zoneDesc,
    bands: {
      minus2Sd: Number(minus2Sd.toFixed(2)),
      minus1Sd: Number(minus1Sd.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      plus1Sd: Number(plus1Sd.toFixed(2)),
      plus2Sd: Number(plus2Sd.toFixed(2)),
    },
    priceBands: {
      minus2Sd: priceMinus2Sd,
      minus1Sd: priceMinus1Sd,
      mean: priceMean,
      plus1Sd: pricePlus1Sd,
      plus2Sd: pricePlus2Sd,
    },
    upsideToMeanPct: priceMean > 0 ? Number((((priceMean - price) / price) * 100).toFixed(1)) : 0
  };
}

/**
 * Convenience method to calculate both PE and PBV bands
 */
export function calculateAllValuationBands({
  historicalPrices = [],
  currentPrice = 0,
  eps = 0,
  bvps = 0
}) {
  const peBands = calculateValuationBands({
    historicalPrices,
    currentPrice,
    denominatorValue: eps,
    metricName: 'PE'
  });

  const pbvBands = calculateValuationBands({
    historicalPrices,
    currentPrice,
    denominatorValue: bvps,
    metricName: 'PBV'
  });

  return {
    pe: peBands,
    pbv: pbvBands
  };
}
