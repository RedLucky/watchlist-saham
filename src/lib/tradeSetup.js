// Trade Setup Calculator
// Calculates entry range, target price, stop loss, and risk/reward ratio based on trading style

export function calculateTradeSetup(stock, technicalResult, styleConfig) {
  const { ma9, ma20, ma50, resistance, support } = stock.technicals;
  const price = stock.price;
  const setup = technicalResult.setup;
  const { tp: targetPct, sl: stopLossPct } = styleConfig.exit;

  let entry, target, stopLoss;

  // Entry range logic (±1% of the relevant MA or breakout level)
  const entryBase = styleConfig.name === 'scalping' ? ma9 : ma20;
  
  if (setup === 'pullback') {
    entry = {
      low: Math.round(entryBase * 0.99),
      high: Math.round(entryBase * 1.01),
    };
    target = Math.round(price * (1 + targetPct / 100));
    stopLoss = Math.round(entryBase * (1 - stopLossPct / 100));
  } else if (setup === 'breakout' || setup === 'scalp') {
    entry = {
      low: Math.round(price * 0.99),
      high: Math.round(price * 1.01),
    };
    target = Math.round(price * (1 + targetPct / 100));
    stopLoss = Math.round(price * (1 - stopLossPct / 100));
  } else {
    // Default: current price area
    entry = {
      low: Math.round(price * 0.995),
      high: Math.round(price * 1.005),
    };
    target = Math.round(price * (1 + targetPct / 100));
    stopLoss = Math.round(price * (1 - (stopLossPct * 1.2) / 100));
  }

  // Ensure target is not below current price and stop loss is not above current price
  target = Math.max(target, Math.round(price * 1.01));
  stopLoss = Math.min(stopLoss, Math.round(price * 0.99));

  // Calculate risk/reward
  const avgEntry = (entry.low + entry.high) / 2;
  const reward = target - avgEntry;
  const risk = avgEntry - stopLoss;
  const riskReward = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;

  return {
    entry,
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
