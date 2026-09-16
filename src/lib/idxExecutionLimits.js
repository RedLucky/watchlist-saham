import { getIDXPriceStep, roundToIDXTick } from './tradeSetup.js';

/**
 * IDX Auto-Rejection Limit Constants
 */
export const IDX_LIMIT_PCT_TIER_1 = 35; // < 200
export const IDX_LIMIT_PCT_TIER_2 = 25; // 200 - 5000
export const IDX_LIMIT_PCT_TIER_3 = 20; // > 5000
export const IDX_LIMIT_PCT_ACCELERATION = 10; // Papan Akselerasi
export const IDX_REGULAR_BOARD_MIN_PRICE = 50;

/**
 * Helper to count the exact number of official IDX ticks between two prices.
 * Guaranteed positive integer, returns 0 if prices are equal.
 */
export function countTicksBetween(priceA, priceB) {
  const p1 = Math.min(priceA, priceB);
  const p2 = Math.max(priceA, priceB);

  if (p1 === p2 || !Number.isFinite(p1) || !Number.isFinite(p2) || p1 <= 0) {
    return 0;
  }

  let current = p1;
  let ticks = 0;
  // Safety guard against infinite loops
  const MAX_TICKS = 2000;

  while (current < p2 && ticks < MAX_TICKS) {
    const step = getIDXPriceStep(current);
    current += step;
    ticks++;
  }

  return ticks;
}

/**
 * Calculates Official IDX Auto-Rejection (ARA / ARB) and Execution Limits
 */
export function calculateExecutionLimits({
  price = 0,
  prevClose = null,
  isAccelerationBoard = false
}) {
  const safeCurrent = Math.max(0, Number(price) || 0);
  const safePrev = Math.max(0, Number(prevClose) || safeCurrent);

  if (safePrev <= 0) {
    return null;
  }

  // 1. Determine Auto-Rejection Percentage based on BEI Rules
  let limitPct = IDX_LIMIT_PCT_TIER_2;
  if (isAccelerationBoard) {
    limitPct = IDX_LIMIT_PCT_ACCELERATION;
  } else if (safePrev < 200) {
    limitPct = IDX_LIMIT_PCT_TIER_1;
  } else if (safePrev <= 5000) {
    limitPct = IDX_LIMIT_PCT_TIER_2;
  } else {
    limitPct = IDX_LIMIT_PCT_TIER_3;
  }

  // 2. Compute ARA & ARB Price rounded to exact tick fractions
  const rawARA = safePrev * (1 + limitPct / 100);
  const araPrice = roundToIDXTick(rawARA, 'down');

  const rawARB = safePrev * (1 - limitPct / 100);
  const calculatedARB = roundToIDXTick(rawARB, 'up');
  const arbPrice = isAccelerationBoard
    ? Math.max(1, calculatedARB)
    : Math.max(IDX_REGULAR_BOARD_MIN_PRICE, calculatedARB);

  // 3. Compute Tick Distance from Current Price
  const ticksToARA = safeCurrent > 0 && safeCurrent <= araPrice
    ? countTicksBetween(safeCurrent, araPrice)
    : 0;

  const ticksToARB = safeCurrent >= arbPrice
    ? countTicksBetween(arbPrice, safeCurrent)
    : 0;

  // 4. Proximity Warning Check
  let proximity = 'NORMAL';
  let warningMessage = null;
  if (safeCurrent >= araPrice) {
    proximity = 'AT_ARA';
    warningMessage = 'Saham menyentuh Auto Rejection Atas (ARA) 🚀';
  } else if (ticksToARA > 0 && ticksToARA <= 3) {
    proximity = 'NEAR_ARA';
    warningMessage = `Hanya ${ticksToARA} fraksi harga menuju ARA`;
  } else if (safeCurrent <= arbPrice) {
    proximity = 'AT_ARB';
    warningMessage = 'Saham terkunci Auto Rejection Bawah (ARB) 🩸';
  } else if (ticksToARB > 0 && ticksToARB <= 3) {
    proximity = 'NEAR_ARB';
    warningMessage = `Hanya ${ticksToARB} fraksi harga menuju ARB`;
  }

  // 5. Build 7-Step Price Ladder (ARB to ARA)
  const ladderSteps = [
    { label: 'ARA', targetPrice: araPrice, isLimit: true },
    { label: '+10%', targetPrice: roundToIDXTick(safePrev * 1.10) },
    { label: '+5%', targetPrice: roundToIDXTick(safePrev * 1.05) },
    { label: 'Current', targetPrice: safeCurrent, isCurrent: true },
    { label: '-5%', targetPrice: roundToIDXTick(safePrev * 0.95) },
    { label: '-10%', targetPrice: roundToIDXTick(safePrev * 0.90) },
    { label: 'ARB', targetPrice: arbPrice, isLimit: true }
  ];

  // Filter and sanitize ladder steps to remain between ARB and ARA
  const cleanLadder = ladderSteps
    .filter(s => s.targetPrice >= arbPrice && s.targetPrice <= araPrice)
    .map(s => {
      const changeFromPrev = safePrev > 0
        ? Number(((s.targetPrice - safePrev) / safePrev * 100).toFixed(2))
        : 0;
      const ticksDiff = countTicksBetween(Math.min(safeCurrent, s.targetPrice), Math.max(safeCurrent, s.targetPrice));
      return {
        ...s,
        changeFromPrev,
        ticksFromCurrent: s.targetPrice >= safeCurrent ? ticksDiff : -ticksDiff
      };
    })
    // Sort descending (highest price at top)
    .sort((a, b) => b.targetPrice - a.targetPrice);

  return {
    limitPct,
    prevClose: safePrev,
    currentPrice: safeCurrent,
    araPrice,
    arbPrice,
    ticksToARA,
    ticksToARB,
    araGainPctFromCurrent: safeCurrent > 0 ? Number(((araPrice - safeCurrent) / safeCurrent * 100).toFixed(2)) : limitPct,
    arbLossPctFromCurrent: safeCurrent > 0 ? Number(((arbPrice - safeCurrent) / safeCurrent * 100).toFixed(2)) : -limitPct,
    proximity,
    warningMessage,
    ladder: cleanLadder
  };
}

