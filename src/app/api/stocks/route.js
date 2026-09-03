// GET /api/stocks?mode=balanced|growth|conservative|defensive|auto&style=scalping|daily|swing
// Returns scored and filtered stocks.

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { scoreAllStocks } from '@/lib/scoring/index';
import { detectMarketMode, getModeConfig, getStyleConfig } from '@/lib/modes';
import { calculateSectorStrengths } from '@/lib/sectorRotation';
import { calculateTradeSetup } from '@/lib/tradeSetup';
import { generateExplanations } from '@/lib/explanations';
import { calculateDEMA, calculateSupertrend } from '@/lib/indicators';
import { prisma } from '@/lib/prisma';
import { initBackgroundSync } from '@/lib/worker';
import { updateExistingRecommendations } from '@/lib/recommendationTracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Start background worker
initBackgroundSync();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedTicker = searchParams.get('ticker');
  const allList = searchParams.get('all') === 'true';

  if (allList) {
    const list = await prisma.stockData.findMany({
      select: { ticker: true, name: true, price: true, changePercent: true },
      orderBy: { ticker: 'asc' }
    });
    return NextResponse.json(list);
  }

  let modeName = searchParams.get('mode') || 'auto';
  let styleName = searchParams.get('style') || 'swing';

  // Initialize Data Provider
  const provider = getActiveProvider();
  const [marketData, sectorPerformance, providerStocks] = await Promise.all([
    provider.getMarketData(),
    provider.getSectorPerformance(),
    provider.getStocks()
  ]);

  if (requestedTicker) {
    const cleanTicker = requestedTicker.toUpperCase().trim();
    const s = providerStocks.find(x => x.ticker === cleanTicker);
    if (s) {
      return NextResponse.json({
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        price: s.price,
        changePercent: s.changePercent ?? 0,
        isSyariah: s.isSyariah || false,
        sharesOutstanding: s.sharesOutstanding || null,
        kseiLatest: s.kseiLatest || null,
        kseiHistory: s.kseiHistory || [],
        ownership: s.ownership || null,
        smartMoney: s.smartMoney || null,
      });
    }
  }

  // 1. Market Mode Context
  let detection = 'user';
  if (modeName === 'auto') {
    modeName = detectMarketMode(marketData);
    detection = 'auto';
  }
  const selectedMode = getModeConfig(modeName);
  const modeConfig = {
    ...selectedMode,
    weights: { ...selectedMode.weights },
  };

  // Apply custom weights if provided
  const customWeightsRaw = searchParams.get('cw');
  if (modeName === 'custom' && customWeightsRaw) {
    try {
      const parsedWeights = JSON.parse(decodeURIComponent(customWeightsRaw));
      // Ensure all required fields exist and they total 100
      const total = Object.values(parsedWeights).reduce((a, b) => a + Number(b), 0);
      if (total === 100) {
         modeConfig.weights = { ...modeConfig.weights, ...parsedWeights };
      }
    } catch (e) {
      console.error("Failed to parse custom weights", e);
    }
  }

  // 2. Trading Style Context
  const styleConfig = getStyleConfig(styleName);

  // 3. Sector Strengths
  const { map: sectorMap } = calculateSectorStrengths(sectorPerformance);

  // 4. Score all stocks
  const scoredStocks = scoreAllStocks(providerStocks, modeConfig.weights, styleConfig, sectorMap, modeConfig.name);

  // 5. Apply score threshold first (without max limit yet).
  const passedByScore = scoredStocks.filter(s => s.score >= modeConfig.threshold);

  // 6. Build enriched candidates (trade setup + explanations)
  const candidates = passedByScore.map(s => {
    const tradeSetup = calculateTradeSetup(s.rawData, s.subScores.technical, styleConfig);
    const sectorStrength = sectorMap[s.sector];
    const explanations = generateExplanations(s.rawData, s.subScores, tradeSetup, sectorStrength);

    const subScoresClean = {};
    Object.entries(s.subScores).forEach(([key, value]) => {
      subScoresClean[key] = {
        score: value.score,
        label: value.label,
        weight: value.weight,
        details: value.details,
      };
    });

    // ── Supertrend & DEMA Signal Engine ──────────────────────────────────
    const rawTech = s.rawData?.technicals || {};
    const prices = Array.isArray(rawTech.prices) && rawTech.prices.length > 0 ? rawTech.prices : [s.price];
    const highs = Array.isArray(rawTech.highs) && rawTech.highs.length > 0 ? rawTech.highs : prices;
    const lows = Array.isArray(rawTech.lows) && rawTech.lows.length > 0 ? rawTech.lows : prices;
    
    const candleData = prices.map((p, idx) => ({
      high: highs[idx] ?? p,
      low: lows[idx] ?? p,
      close: p
    }));

    const dema20 = calculateDEMA(prices, 20);
    const supertrend = calculateSupertrend(candleData, 10, 3.0);

    const isBullSuper = supertrend.trend === 'bullish';
    const isAboveDema = s.price >= dema20;

    let signalType = 'NEUTRAL';
    let signalLabel = 'Wait / Netral';
    let signalBadge = '⚪ WAIT';
    let signalColor = 'slate';

    if (isBullSuper && isAboveDema) {
      if (supertrend.isReversal) {
        signalType = 'STRONG_BUY';
        signalLabel = 'Strong Buy (Supertrend Reversal + Di Atas DEMA20)';
        signalBadge = '🚀 S. BUY';
        signalColor = 'emerald';
      } else {
        signalType = 'BUY';
        signalLabel = 'Buy (Supertrend Bullish + Di Atas DEMA20)';
        signalBadge = '🟢 BUY';
        signalColor = 'emerald';
      }
    } else if (!isBullSuper && !isAboveDema) {
      signalType = 'SELL';
      signalLabel = 'Sell / Avoid (Supertrend Bearish + Di Bawah DEMA20)';
      signalBadge = '🔴 SELL';
      signalColor = 'rose';
    } else if (isBullSuper && !isAboveDema) {
      signalType = 'PULLBACK';
      signalLabel = 'Pullback Support (Supertrend Bullish, Retest DEMA20)';
      signalBadge = '🟡 PULLBACK';
      signalColor = 'amber';
    } else if (!isBullSuper && isAboveDema) {
      signalType = 'BREAKOUT';
      signalLabel = 'Spekulatif Breakout (Di Atas DEMA20, Uji Supertrend)';
      signalBadge = '🔵 TEST BO';
      signalColor = 'blue';
    }

    const supertrendDema = {
      signal: signalType,
      label: signalLabel,
      badge: signalBadge,
      color: signalColor,
      dema20: Math.round(dema20),
      supertrendValue: Math.round(supertrend.value),
      supertrendTrend: supertrend.trend,
      isReversal: supertrend.isReversal,
    };

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      isSyariah: s.rawData?.isSyariah || false,
      isDividendTrap: s.rawData?.isDividendTrap || false,
      changePercent: s.rawData?.changePercent || 0,
      kseiLatest: s.rawData?.kseiLatest || null,
      kseiHistory: s.rawData?.kseiHistory || [],
      ownership: s.rawData?.ownership || null,
      sharesOutstanding: s.rawData?.sharesOutstanding || null,
      score: s.score,
      subScores: subScoresClean,
      supertrendDema,
      entry: tradeSetup.entry,
      target: tradeSetup.target,
      stopLoss: tradeSetup.stopLoss,
      riskReward: tradeSetup.riskReward,
      riskLevel: tradeSetup.riskLevel,
      setup: tradeSetup.setup,
      sectorBoost: s.sectorBoost,
      shareholders: s.rawData?.shareholders || [],
      smartMoney: s.rawData?.smartMoney || null,
      explanations,
    };
  });

  // 7. Quality Gate to improve relevance/win-rate profile.
  const qualityGate = styleConfig.qualityGate || {};
  const modeTightener =
    modeConfig.name === 'defensive' ? 0.2 :
    modeConfig.name === 'conservative' ? 0.1 :
    modeConfig.name === 'growth' ? -0.05 : 0;
  const minTechnical = Math.max(0, (qualityGate.minTechnicalScore ?? 0) + (modeTightener * 10));
  const minRiskReward = Math.max(1.0, (qualityGate.minRiskReward ?? 0) + modeTightener);
  const requireActionableSetup = Boolean(qualityGate.requireActionableSetup);

  const passedQuality = modeConfig.name === 'custom'
    ? candidates
    : candidates.filter((stock) => {
        const technicalScore = Number(stock.subScores?.technical?.score || 0);
        const rr = Number(stock.riskReward || 0);
        const setupName = String(stock.setup || '').toLowerCase();
        const actionable = setupName !== 'none';

        if (technicalScore < minTechnical) return false;
        if (rr < minRiskReward) return false;
        if (requireActionableSetup && !actionable) return false;
        return true;
      });

  // 8. Apply maxStocks limit after quality filtering.
  const stocks = passedQuality.slice(0, modeConfig.maxStocks);

  // Run win-rate history maintenance in the background:
  // this checks OPEN recommendations and closes them on TP/SL/expiry.
  void updateExistingRecommendations(providerStocks).catch(err => {
    console.error('DB Background Task Error:', err);
  });

  return NextResponse.json({
    timestamp: Date.now(),
    mode: {
      name: modeConfig.name,
      label: modeConfig.label,
      emoji: modeConfig.emoji,
      description: modeConfig.description,
      detection,
      threshold: modeConfig.threshold,
      maxStocks: modeConfig.maxStocks,
    },
    style: {
      name: styleConfig.name,
      label: styleConfig.label,
      emoji: styleConfig.emoji,
      description: styleConfig.description,
      riskLevel: styleConfig.riskLevel,
      riskColor: styleConfig.riskColor,
      marketInfluence: styleConfig.marketInfluence ?? 0.5,
    },
    stocks,
    totalFiltered: scoredStocks.length,
    totalPassedScoreGate: passedByScore.length,
    totalPassedQualityGate: passedQuality.length,
    totalPassed: stocks.length,
    lastUpdated: new Date().toISOString(),
  });
}

