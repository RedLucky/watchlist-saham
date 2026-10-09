/**
 * @fileoverview Unit tests for market transaction flow and executive briefing in DatabaseProvider and market API logic.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { DatabaseProvider, invalidateStocksCache } from '../src/lib/providers/DatabaseProvider.js';
import { detectMarketMode, getModeConfig } from '../src/lib/modes.js';

const originalFindUnique = prisma.stockData.findUnique;
const originalFindMany = prisma.stockData.findMany;

afterEach(() => {
  prisma.stockData.findUnique = originalFindUnique;
  prisma.stockData.findMany = originalFindMany;
  invalidateStocksCache();
});

describe('Market Transaction Flow & Briefing Wiring', () => {
  it('DatabaseProvider.getMarketData() attaches transactionFlow and briefing with fallback to ^JKSE', async () => {
    invalidateStocksCache();

    prisma.stockData.findUnique = async ({ where }) => {
      if (where?.ticker === '^JKSE') {
        return {
          id: 999,
          ticker: '^JKSE',
          name: 'IHSG Composite',
          price: 7250,
          changePercent: 0.65,
          volume: 8_000_000_000n,
          avgVolume3mo: 7_500_000_000n,
          technicals: JSON.stringify({
            prices: [7100, 7150, 7200, 7250],
            volumes: [6_000_000_000, 7_000_000_000, 7_500_000_000, 8_000_000_000],
            highs: [7120, 7180, 7220, 7270],
            lows: [7080, 7130, 7190, 7230],
            ma20: 7120,
          }),
        };
      }
      return null;
    };

    prisma.stockData.findMany = async () => [
      { changePercent: 1.2 },
      { changePercent: 0.8 },
      { changePercent: -0.4 },
    ];

    const provider = new DatabaseProvider();
    const market = await provider.getMarketData();

    assert.ok(market);
    assert.equal(market.indexName, 'IHSG');
    assert.equal(market.indexValue, 7250);
    assert.equal(market.indexChange, 0.65);
    assert.equal(market.indexTrend, 'up');

    // Transaction flow checks
    assert.ok(market.transactionFlow, 'transactionFlow must be attached');
    assert.ok(market.transactionFlow.periods['1d'], '1d flow period must exist');
    assert.ok(market.transactionFlow.periods['1w'], '1w flow period must exist');
    assert.ok(market.transactionFlow.periods['1m'], '1m flow period must exist');
    assert.ok(market.transactionFlow.periods['1y'], '1y flow period must exist');
    assert.ok(market.transactionFlow.periods['1d'].totalTurnoverRp > 0);

    // Executive briefing checks
    assert.ok(market.briefing, 'briefing must be attached');
    assert.ok(market.briefing.headline, 'briefing headline must exist');
    assert.ok(market.briefing.status, 'briefing status must exist');
    assert.equal(market.briefing.keyPoints.length, 4, 'briefing must provide 4 key points');
    assert.ok(market.briefing.tacticalAdvice, 'tactical advice must be present');
  });

  it('formats /api/market payload structure including transactionFlow and briefing correctly', async () => {
    invalidateStocksCache();

    prisma.stockData.findUnique = async () => ({
      ticker: '^JKSE',
      price: 7300,
      changePercent: 0.5,
      volume: 5_000_000_000n,
      avgVolume3mo: 5_000_000_000n,
      technicals: JSON.stringify({
        prices: [7200, 7250, 7300],
        volumes: [4_000_000_000, 4_500_000_000, 5_000_000_000],
      }),
    });

    prisma.stockData.findMany = async () => [
      { changePercent: 0.5 },
      { changePercent: -0.2 },
    ];

    const provider = new DatabaseProvider();
    const marketData = await provider.getMarketData();
    const detectedMode = detectMarketMode(marketData);
    const modeConfig = getModeConfig(detectedMode);

    // Emulate /api/market response serialization
    const apiPayload = {
      index: {
        name: marketData.indexName,
        value: marketData.indexValue,
        change: marketData.indexChange,
        trend: marketData.indexTrend,
      },
      volume: {
        vsAverage: Number(Number(marketData.volumeVsAvg || 1).toFixed(2)),
      },
      advanceDecline: marketData.advanceDecline,
      autoMode: {
        name: modeConfig.name,
        label: modeConfig.label,
        emoji: modeConfig.emoji,
        description: modeConfig.description,
      },
      transactionFlow: marketData.transactionFlow || null,
      briefing: marketData.briefing || null,
      lastUpdated: new Date().toISOString(),
    };

    assert.equal(apiPayload.index.name, 'IHSG');
    assert.ok(apiPayload.transactionFlow);
    assert.ok(apiPayload.transactionFlow.periods['1d']);
    assert.ok(apiPayload.briefing);
    assert.equal(apiPayload.briefing.keyPoints.length, 4);
    assert.ok(apiPayload.lastUpdated);
  });
});

