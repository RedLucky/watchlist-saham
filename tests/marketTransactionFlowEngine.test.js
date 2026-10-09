/**
 * @fileoverview Unit tests for aggregateMarketTransactionFlows and generateMarketBriefing.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateMarketTransactionFlows,
  generateMarketBriefing,
  calculateTransactionFlows,
} from '../src/lib/transactionFlowEngine.js';

describe('aggregateMarketTransactionFlows', () => {
  it('returns empty period summaries when given empty inputs without ihsgStock', () => {
    const report = aggregateMarketTransactionFlows([], null);
    assert.ok(report);
    assert.equal(report.ticker, '^JKSE');
    assert.equal(report.name, 'IHSG Composite');
    assert.ok(report.periods['1d']);
    assert.ok(report.periods['1w']);
    assert.ok(report.periods['1m']);
    assert.ok(report.periods['1y']);
    assert.equal(report.periods['1d'].totalTurnoverRp, 0);
    assert.equal(report.periods['1d'].dominantPlayer, 'BALANCED');
    assert.equal(report.periods['1d'].source, 'empty');
  });

  it('aggregates bottom-up flows correctly across multiple stocks with pre-calculated transactionFlow', () => {
    const stockA = {
      ticker: 'BBCA',
      transactionFlow: {
        periods: {
          '1d': {
            totalTurnoverRp: 1_000_000_000,
            totalVolumeShares: 100_000,
            totalLots: 1000,
            source: 'idx',
            foreign: {
              inflowRp: 600_000_000,
              outflowRp: 200_000_000,
              inflowLots: 600,
              outflowLots: 200,
            },
            domestic: {
              inflowRp: 400_000_000,
              outflowRp: 800_000_000,
              inflowLots: 400,
              outflowLots: 800,
            },
            activeFlow: {
              inflowRp: 550_000_000,
              outflowRp: 450_000_000,
              inflowLots: 550,
              outflowLots: 450,
            },
          },
          '1w': {
            totalTurnoverRp: 5_000_000_000,
            totalVolumeShares: 500_000,
            totalLots: 5000,
            source: 'idx',
            foreign: {
              inflowRp: 3_000_000_000,
              outflowRp: 1_000_000_000,
              inflowLots: 3000,
              outflowLots: 1000,
            },
            domestic: {
              inflowRp: 2_000_000_000,
              outflowRp: 4_000_000_000,
              inflowLots: 2000,
              outflowLots: 4000,
            },
            activeFlow: {
              inflowRp: 2_600_000_000,
              outflowRp: 2_400_000_000,
              inflowLots: 2600,
              outflowLots: 2400,
            },
          },
        },
      },
    };

    const stockB = {
      ticker: 'BBRI',
      transactionFlow: {
        periods: {
          '1d': {
            totalTurnoverRp: 2_000_000_000,
            totalVolumeShares: 200_000,
            totalLots: 2000,
            source: 'estimated',
            foreign: {
              inflowRp: 800_000_000,
              outflowRp: 1_000_000_000,
              inflowLots: 800,
              outflowLots: 1000,
            },
            domestic: {
              inflowRp: 1_200_000_000,
              outflowRp: 1_000_000_000,
              inflowLots: 1200,
              outflowLots: 1000,
            },
            activeFlow: {
              inflowRp: 900_000_000,
              outflowRp: 1_100_000_000,
              inflowLots: 900,
              outflowLots: 1100,
            },
          },
          '1w': {
            totalTurnoverRp: 10_000_000_000,
            totalVolumeShares: 1_000_000,
            totalLots: 10000,
            source: 'estimated',
            foreign: {
              inflowRp: 4_000_000_000,
              outflowRp: 5_000_000_000,
              inflowLots: 4000,
              outflowLots: 5000,
            },
            domestic: {
              inflowRp: 6_000_000_000,
              outflowRp: 5_000_000_000,
              inflowLots: 6000,
              outflowLots: 5000,
            },
            activeFlow: {
              inflowRp: 4_800_000_000,
              outflowRp: 5_200_000_000,
              inflowLots: 4800,
              outflowLots: 5200,
            },
          },
        },
      },
    };

    const market = aggregateMarketTransactionFlows([stockA, stockB]);
    assert.equal(market.periods['1d'].totalTurnoverRp, 3_000_000_000);
    assert.equal(market.periods['1d'].totalLots, 3000);
    assert.equal(market.periods['1d'].source, 'hybrid'); // 1 idx + 1 estimated
    assert.equal(market.periods['1d'].stockCount, 2);

    // Foreign 1d: inflow = 600M + 800M = 1.4B, outflow = 200M + 1000M = 1.2B -> netflow = +200M
    assert.equal(market.periods['1d'].foreign.inflowRp, 1_400_000_000);
    assert.equal(market.periods['1d'].foreign.outflowRp, 1_200_000_000);
    assert.equal(market.periods['1d'].foreign.netflowRp, 200_000_000);
    assert.equal(market.periods['1d'].foreign.netflowLots, 200);

    // Domestic 1d: inflow = 400M + 1200M = 1.6B, outflow = 800M + 1000M = 1.8B -> netflow = -200M
    assert.equal(market.periods['1d'].domestic.inflowRp, 1_600_000_000);
    assert.equal(market.periods['1d'].domestic.outflowRp, 1_800_000_000);
    assert.equal(market.periods['1d'].domestic.netflowRp, -200_000_000);
    assert.equal(market.periods['1d'].domestic.netflowLots, -200);

    // Weekly verification
    assert.equal(market.periods['1w'].totalTurnoverRp, 15_000_000_000);
    assert.equal(market.periods['1w'].totalLots, 15000);
  });

  it('falls back to indexStock calculations when stocks array is empty', () => {
    const ihsgStock = {
      ticker: '^JKSE',
      price: 7200,
      volume: 5_000_000_000,
      technicals: {
        prices: [7100, 7150, 7200],
        volumes: [4_000_000_000, 4_500_000_000, 5_000_000_000],
        highs: [7120, 7180, 7220],
        lows: [7080, 7130, 7190],
      },
    };

    const market = aggregateMarketTransactionFlows([], ihsgStock);
    assert.ok(market.periods['1d'].totalTurnoverRp > 0);
    assert.ok(market.periods['1d'].totalLots > 0);
    assert.ok(market.periods['1d'].foreign.inflowRp > 0);
  });

  it('computes flow on the fly for stocks without pre-calculated transactionFlow', () => {
    const rawStock = {
      ticker: 'TLKM',
      price: 3000,
      volume: 1000000,
      technicals: {
        prices: [2900, 2950, 3000],
        volumes: [800000, 900000, 1000000],
        highs: [2920, 2970, 3010],
        lows: [2890, 2940, 2980],
      },
    };

    const market = aggregateMarketTransactionFlows([rawStock]);
    assert.equal(market.periods['1d'].stockCount, 1);
    assert.ok(market.periods['1d'].totalTurnoverRp > 0);
  });
});

describe('generateMarketBriefing', () => {
  it('generates bullish_accumulation briefing when index is up with positive foreign netflow', () => {
    const marketData = {
      indexValue: 7350,
      indexChange: 0.85,
      indexTrend: 'up',
      advanceDecline: { advance: 320, decline: 150, unchanged: 130 },
      volumeVsAvg: 1.35,
    };
    const marketFlow = {
      periods: {
        '1d': {
          totalTurnoverRp: 12_500_000_000_000,
          foreign: { netflowRp: 850_000_000_000 },
          domestic: { netflowRp: -850_000_000_000 },
        },
        '1w': {
          foreign: { netflowRp: 2_400_000_000_000 },
        },
      },
    };

    const briefing = generateMarketBriefing(marketData, marketFlow);
    assert.equal(briefing.status, 'bullish_accumulation');
    assert.equal(briefing.sentimentTone, 'up');
    assert.equal(briefing.summaryBadge, 'Bullish Akumulasi Asing');
    assert.ok(briefing.headline.includes('+0.85%'));
    assert.ok(briefing.headline.includes('+Rp 850,0 M'));
    assert.equal(briefing.keyPoints.length, 4);
    assert.ok(briefing.tacticalAdvice.includes('inflow asing'));
  });

  it('generates bullish_divergence when index is up but foreign participants sell', () => {
    const marketData = {
      indexValue: 7100,
      indexChange: 0.45,
      indexTrend: 'up',
      advanceDecline: { advance: 280, decline: 180, unchanged: 100 },
      volumeVsAvg: 0.95,
    };
    const marketFlow = {
      periods: {
        '1d': {
          totalTurnoverRp: 9_000_000_000_000,
          foreign: { netflowRp: -350_000_000_000 },
        },
      },
    };

    const briefing = generateMarketBriefing(marketData, marketFlow);
    assert.equal(briefing.status, 'bullish_divergence');
    assert.equal(briefing.sentimentTone, 'warn');
    assert.equal(briefing.summaryBadge, 'Penguatan Didorong Domestik');
    assert.ok(briefing.tacticalAdvice.includes('false breakout'));
  });

  it('generates bearish_distribution when index is down with foreign net sell', () => {
    const marketData = {
      indexValue: 6950,
      indexChange: -1.2,
      indexTrend: 'down',
      advanceDecline: { advance: 110, decline: 390, unchanged: 80 },
      volumeVsAvg: 1.4,
    };
    const marketFlow = {
      periods: {
        '1d': {
          totalTurnoverRp: 14_000_000_000_000,
          foreign: { netflowRp: -1_200_000_000_000 },
        },
      },
    };

    const briefing = generateMarketBriefing(marketData, marketFlow);
    assert.equal(briefing.status, 'bearish_distribution');
    assert.equal(briefing.sentimentTone, 'down');
    assert.equal(briefing.summaryBadge, 'Distribusi Asing');
    assert.ok(briefing.tacticalAdvice.includes('defensif/dividen'));
  });

  it('generates bearish_accumulation when index is down but foreign participants absorb shares', () => {
    const marketData = {
      indexValue: 7050,
      indexChange: -0.35,
      indexTrend: 'down',
      advanceDecline: { advance: 180, decline: 260, unchanged: 120 },
      volumeVsAvg: 1.05,
    };
    const marketFlow = {
      periods: {
        '1d': {
          totalTurnoverRp: 10_000_000_000_000,
          foreign: { netflowRp: 400_000_000_000 },
        },
      },
    };

    const briefing = generateMarketBriefing(marketData, marketFlow);
    assert.equal(briefing.status, 'bearish_accumulation');
    assert.equal(briefing.sentimentTone, 'warn');
    assert.equal(briefing.summaryBadge, 'Koreksi Ditampung Asing');
    assert.ok(briefing.tacticalAdvice.includes('buy-on-weakness'));
  });

  it('handles empty or null parameters gracefully', () => {
    const briefing = generateMarketBriefing(null, null);
    assert.ok(briefing);
    assert.ok(briefing.headline);
    assert.equal(briefing.keyPoints.length, 4);
    assert.ok(briefing.tacticalAdvice);
  });
});

