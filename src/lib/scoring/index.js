// Scoring Orchestrator — menggabungkan semua sub-skor dengan bobot tergantung mode pasar & gaya trading

import { calculateFundamentalScore } from './fundamental.js';
import { calculateTechnicalScore } from './technical.js';
import { calculateSmartMoneyScore } from './smartMoney.js';
import { calculateTrendingScore } from './trending.js';
import { calculateValuationScore } from './valuation.js';
import { calculateLiquidityScore } from './liquidity.js';
import { calculateDividendScore } from './dividend.js';
import { applyHardFilter } from './hardFilter.js';

const SCORE_KEYS = ['fundamental', 'technical', 'smartMoney', 'trending', 'valuation', 'liquidity', 'dividend'];

export function scoreAllStocks(stocks, marketWeights, styleConfig, sectorStrengths = {}, modeName = 'balanced') {
  // Langkah 1: Hard filter
  const filtered = applyHardFilter(stocks);

  // Langkah 2: Gabungkan bobot mode pasar + gaya trading.
  const marketInfluence = clamp(Number(styleConfig.marketInfluence ?? 0.5), 0, 1);
  const styleInfluence = 1 - marketInfluence;
  const marketNormalized = normalizeWeights(marketWeights || {});
  const styleNormalized = normalizeWeights(styleConfig.weights || {});

  let weights = {};
  for (const key of SCORE_KEYS) {
    weights[key] =
      (marketNormalized[key] * marketInfluence) +
      (styleNormalized[key] * styleInfluence);
  }
  weights = normalizeWeights(weights);

  // Langkah 3: Beri skor pada setiap saham
  const scored = filtered.map(stock => {
    const fundamental = calculateFundamentalScore(stock);
    const technical = calculateTechnicalScore(stock, styleConfig);
    const smartMoney = calculateSmartMoneyScore(stock);
    const trending = calculateTrendingScore(stock);
    const valuation = calculateValuationScore(stock);
    const liquidity = calculateLiquidityScore(stock);
    const dividend = calculateDividendScore(stock);

    // Hitung bobot skor akhir
    const subScores = {
      fundamental: { ...fundamental, weight: weights.fundamental, label: 'Fundamental' },
      technical: { ...technical, weight: weights.technical, label: 'Teknikal' },
      smartMoney: { ...smartMoney, weight: weights.smartMoney, label: 'Smart Money' },
      trending: { ...trending, weight: weights.trending, label: 'Tren' },
      valuation: { ...valuation, weight: weights.valuation, label: 'Valuasi' },
      liquidity: { ...liquidity, weight: weights.liquidity, label: 'Likuiditas' },
      dividend: { ...dividend, weight: weights.dividend, label: 'Dividen' },
    };

    let finalScore =
      (fundamental.score * weights.fundamental / 100) +
      (technical.score * weights.technical / 100) +
      (smartMoney.score * weights.smartMoney / 100) +
      (trending.score * weights.trending / 100) +
      (valuation.score * weights.valuation / 100) +
      (liquidity.score * weights.liquidity / 100) +
      (dividend.score * weights.dividend / 100);

    // Gradual sector boost — top 3 sectors get decreasing bonus
    let sectorBoost = 0;
    if (styleConfig.name !== 'scalping') {
      const sectorStrength = sectorStrengths[stock.sector];
      if (sectorStrength && Number(sectorStrength.return5d || 0) > 0 && Number(sectorStrength.strength || 0) >= 50) {
        const rank = sectorStrength.rank || 999;
        if (rank === 1) {
          sectorBoost = getSectorBoost(modeName);
        } else if (rank === 2) {
          sectorBoost = Math.round(getSectorBoost(modeName) * 0.7);
        } else if (rank === 3) {
          sectorBoost = Math.round(getSectorBoost(modeName) * 0.4);
        }
        finalScore = Math.min(100, finalScore + sectorBoost);
      }
    }

    return {
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      price: stock.price,
      score: Math.round(finalScore),
      subScores,
      setup: technical.setup,
      sectorBoost,
      rawData: stock,
    };
  });

  // Langkah 4: Urutkan berdasarkan skor menurun
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

function normalizeWeights(inputWeights = {}) {
  const weights = {};
  const specified = SCORE_KEYS.filter((k) => Number.isFinite(Number(inputWeights[k])) && Number(inputWeights[k]) >= 0);
  const totalSpecified = specified.reduce((sum, k) => sum + Number(inputWeights[k]), 0);

  if (specified.length === 0) {
    const even = 100 / SCORE_KEYS.length;
    SCORE_KEYS.forEach((k) => { weights[k] = even; });
    return weights;
  }

  if (totalSpecified <= 0) {
    const even = 100 / SCORE_KEYS.length;
    SCORE_KEYS.forEach((k) => { weights[k] = even; });
    return weights;
  }

  const remainingKeys = SCORE_KEYS.filter((k) => !specified.includes(k));
  if (remainingKeys.length > 0) {
    const remainingWeight = Math.max(0, 100 - totalSpecified);
    const perRemaining = remainingWeight / remainingKeys.length;
    remainingKeys.forEach((k) => { weights[k] = perRemaining; });
  }

  specified.forEach((k) => { weights[k] = Math.max(0, Number(inputWeights[k])); });

  // final normalization to exactly 100
  const total = SCORE_KEYS.reduce((sum, k) => sum + (weights[k] || 0), 0) || 1;
  SCORE_KEYS.forEach((k) => {
    weights[k] = (weights[k] || 0) * 100 / total;
  });

  return weights;
}

function getSectorBoost(modeName) {
  if (modeName === 'growth') return 5;
  if (modeName === 'balanced') return 4;
  if (modeName === 'custom') return 4;
  if (modeName === 'conservative') return 3;
  if (modeName === 'defensive') return 2;
  return 3;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getScoreColor(score) {
  if (score >= 85) return 'green';
  if (score >= 70) return 'blue';
  if (score >= 60) return 'yellow';
  return 'grey';
}

export function getScoreLabel(score) {
  if (score >= 85) return 'Kuat';
  if (score >= 70) return 'Bagus';
  if (score >= 60) return 'Pantau';
  return 'Abaikan';
}

export function getRiskLevel(riskReward, tradingStyle) {
  if (tradingStyle === 'scalping') return { level: 'Tinggi', color: 'red' };
  if (tradingStyle === 'daily') return { level: 'Sedang', color: 'yellow' };
  return { level: 'Rendah', color: 'green' };
}
