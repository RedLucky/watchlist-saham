import { roundToIDXTick } from './tradeSetup.js';

/**
 * Bloomberg GP: Volume Profile & Value Area Engine
 * 
 * Computes horizontal volume distribution across historical prices:
 * - POC (Point of Control): Price level with highest traded volume
 * - VAH (Value Area High) & VAL (Value Area Low): 70% Volume Value Area
 * - Volume bins for horizontal bar rendering
 */

export const VALUE_AREA_RATIO = 0.70; // Standard 70% Value Area
export const DEFAULT_NUM_BINS = 15;

export function calculateVolumeProfile({
  prices = [],
  volumes = [],
  currentPrice = 0,
  numBins = DEFAULT_NUM_BINS
}) {
  if (!Array.isArray(prices) || !Array.isArray(volumes) || prices.length < 5 || volumes.length < 5) {
    return null;
  }

  const length = Math.min(prices.length, volumes.length);
  const validPairs = [];
  let totalVolume = 0;

  for (let i = 0; i < length; i++) {
    const p = Number(prices[i]);
    const v = Number(volumes[i]);
    if (Number.isFinite(p) && p > 0 && Number.isFinite(v) && v > 0) {
      validPairs.push({ price: p, volume: v });
      totalVolume += v;
    }
  }

  if (validPairs.length < 5 || totalVolume <= 0) {
    return null;
  }

  // 1. Determine Min & Max Price Bounds
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  validPairs.forEach(pair => {
    if (pair.price < minPrice) minPrice = pair.price;
    if (pair.price > maxPrice) maxPrice = pair.price;
  });

  if (minPrice === maxPrice) {
    return null;
  }

  // 2. Create Bins
  const binCount = Math.max(5, Math.min(25, Number(numBins) || DEFAULT_NUM_BINS));
  const binSize = (maxPrice - minPrice) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const low = minPrice + i * binSize;
    const high = low + binSize;
    const mid = (low + high) / 2;
    return {
      index: i,
      low,
      high,
      midPrice: roundToIDXTick(mid),
      volume: 0,
      volumePct: 0
    };
  });

  // Distribute volume into bins
  validPairs.forEach(pair => {
    let binIdx = Math.floor((pair.price - minPrice) / binSize);
    if (binIdx >= binCount) binIdx = binCount - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx].volume += pair.volume;
  });

  // Calculate percentages and find Point of Control (POC)
  let maxBinVolume = 0;
  let pocBinIndex = 0;

  bins.forEach((bin, idx) => {
    bin.volumePct = Number(((bin.volume / totalVolume) * 100).toFixed(2));
    if (bin.volume > maxBinVolume) {
      maxBinVolume = bin.volume;
      pocBinIndex = idx;
    }
  });

  const pocPrice = bins[pocBinIndex].midPrice;

  // 3. Compute 70% Value Area (VAH & VAL) expanding outward from POC
  const targetVAVolume = totalVolume * VALUE_AREA_RATIO;
  let currentVAVolume = bins[pocBinIndex].volume;
  let upIdx = pocBinIndex;
  let downIdx = pocBinIndex;

  while (currentVAVolume < targetVAVolume && (upIdx < binCount - 1 || downIdx > 0)) {
    const nextUpVolume = upIdx + 1 < binCount ? bins[upIdx + 1].volume : -1;
    const nextDownVolume = downIdx - 1 >= 0 ? bins[downIdx - 1].volume : -1;

    if (nextUpVolume >= nextDownVolume && nextUpVolume !== -1) {
      upIdx++;
      currentVAVolume += nextUpVolume;
    } else if (nextDownVolume !== -1) {
      downIdx--;
      currentVAVolume += nextDownVolume;
    } else if (nextUpVolume !== -1) {
      upIdx++;
      currentVAVolume += nextUpVolume;
    } else {
      break;
    }
  }

  const valPrice = bins[downIdx].midPrice;
  const vahPrice = bins[upIdx].midPrice;

  // Mark bins whether they fall inside Value Area
  bins.forEach(bin => {
    bin.isInValueArea = bin.index >= downIdx && bin.index <= upIdx;
    bin.isPOC = bin.index === pocBinIndex;
  });

  // 4. Market Position Classification
  const safeCurrent = Number(currentPrice) || validPairs[validPairs.length - 1].price;
  let positionStatus = 'Di Dalam Value Area (Equilibrium / Fair Value) ⚖️';
  let badgeColor = 'blue';

  if (safeCurrent > vahPrice) {
    positionStatus = 'Di Atas Value Area (Bullish Premium / Breakout) 🚀';
    badgeColor = 'emerald';
  } else if (safeCurrent < valPrice) {
    positionStatus = 'Di Bawah Value Area (Diskon / Oversold) 💎';
    badgeColor = 'indigo';
  }

  return {
    totalVolume,
    pocPrice,
    vahPrice,
    valPrice,
    currentPrice: safeCurrent,
    positionStatus,
    badgeColor,
    bins
  };
}

