// Shared style signal logic used by both live scoring and backtest.
// Returns a normalized setup so trading style rules stay consistent.

export function evaluateStyleSignal(styleName, ctx) {
  const safeStyle = String(styleName || 'swing');
  const price = Number(ctx?.price || 0);
  const shortMA = Number(ctx?.shortMA || 0);
  const longMA = Number(ctx?.longMA || 0);
  const ma20 = Number(ctx?.ma20 || shortMA || 0);
  const rsi = Number(ctx?.rsi || 50);
  const volumeRatio = Number(ctx?.volumeRatio || 1);
  const volSpike = Number(ctx?.volSpike || 1.1);
  const resistance = Number(ctx?.resistance);
  const yesterdayHigh = Number(ctx?.yesterdayHigh);
  const isBullishCandle = Boolean(ctx?.isBullishCandle);

  const hasTrend = price > shortMA && shortMA > longMA;
  const shortMAAboveLongMA = shortMA > longMA;
  const distanceToMA20 = ma20 > 0 ? Math.abs(price - ma20) / ma20 : 1;
  const breakoutByResistance =
    Number.isFinite(resistance) && resistance > 0 && price > resistance * 0.98 && volumeRatio >= 1.3;
  const breakoutByYesterdayHigh =
    Number.isFinite(yesterdayHigh) && yesterdayHigh > 0 && price > yesterdayHigh && volumeRatio >= 1.3;
  const isBreakout = breakoutByResistance || breakoutByYesterdayHigh;

  if (safeStyle === 'scalping') {
    const rsiGood = rsi >= 50 && rsi <= 70;
    if (hasTrend && rsiGood && volumeRatio >= volSpike) {
      return { setup: 'scalp', actionable: true, strength: 'strong' };
    }
    if (price > shortMA && rsiGood) {
      return { setup: 'scalp', actionable: true, strength: 'medium' };
    }
    return { setup: 'none', actionable: false, strength: 'weak' };
  }

  if (safeStyle === 'daily') {
    const rsiGood = rsi >= 45 && rsi <= 65;
    const nearMA20 = distanceToMA20 <= 0.02;
    if (price > shortMA && rsiGood && (nearMA20 || isBreakout)) {
      return { setup: isBreakout ? 'breakout' : 'pullback', actionable: true, strength: 'strong' };
    }
    if (price > shortMA && rsiGood) {
      return { setup: 'momentum', actionable: true, strength: 'medium' };
    }
    return { setup: 'none', actionable: false, strength: 'weak' };
  }

  // swing
  const rsiGood = rsi >= 40 && rsi <= 60;
  if (shortMAAboveLongMA && distanceToMA20 <= 0.025 && rsiGood && isBullishCandle) {
    return { setup: 'pullback', actionable: true, strength: 'strong' };
  }
  if (shortMAAboveLongMA && rsiGood) {
    return { setup: 'swing', actionable: true, strength: 'medium' };
  }
  return { setup: 'none', actionable: false, strength: 'weak' };
}
