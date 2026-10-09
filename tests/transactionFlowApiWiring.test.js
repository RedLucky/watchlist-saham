/**
 * @fileoverview Unit tests verifying transactionFlow wiring in DatabaseProvider and scoring pipeline (TASK-6341).
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { DatabaseProvider, invalidateStocksCache } from '../src/lib/providers/DatabaseProvider.js';
import { scoreAllStocks } from '../src/lib/scoring/index.js';
import { getModeConfig, getStyleConfig } from '../src/lib/modes.js';

const originalFindMany = prisma.stockData.findMany;

afterEach(() => {
  prisma.stockData.findMany = originalFindMany;
  invalidateStocksCache();
});

describe('DatabaseProvider & /api/stocks wiring — transactionFlow', () => {
  it('attaches multi-period transactionFlow (1d, 1w, 1m, 1y) to mapped stocks and preserves idxFlow', async () => {
    invalidateStocksCache();
    prisma.stockData.findMany = async () => [
      {
        id: 1,
        ticker: 'BBCA',
        name: 'Bank Central Asia Tbk',
        sector: 'Financials',
        subSector: 'Banking',
        price: 10000,
        changePercent: 1.5,
        volume: 50_000_000n,
        avgVolume3mo: 45_000_000n,
        sharesOutstanding: 123_275_050_000n,
        fundamentals: JSON.stringify({
          roe: 21.5,
          der: 0.8,
          per: 18.2,
          pbv: 4.1,
          netProfit: [40_000_000_000_000, 48_000_000_000_000, 54_000_000_000_000],
        }),
        technicals: JSON.stringify({
          prices: [9800, 9850, 9900, 9950, 10000],
          highs: [9850, 9900, 9950, 10000, 10050],
          lows: [9750, 9800, 9850, 9900, 9925],
          volumes: [40_000_000, 42_000_000, 44_000_000, 48_000_000, 50_000_000],
          idxFlow: [
            {
              date: '2026-10-08',
              close: 10000,
              volume: 50_000_000,
              value: 500_000_000_000,
              foreignBuy: 32_000_000,
              foreignSell: 18_000_000,
            },
          ],
          idxFlowUpdatedAt: '2026-10-08T10:30:00.000Z',
        }),
        kseiLatest: JSON.stringify({
          foreignPercent: 55,
          freeFloatShares: 50_000_000_000,
          deltaForeign: 120_000_000,
        }),
        shareholders: null,
        ownership: null,
        insiderTrades: null,
        dividendHistory: null,
      },
    ];

    const provider = new DatabaseProvider();
    const stocks = await provider.getStocks();

    assert.equal(stocks.length, 1);
    const bbca = stocks[0];
    assert.ok(bbca.transactionFlow, 'Expected transactionFlow to be attached on stock');
    assert.equal(bbca.transactionFlow.hasIdxData, true);
    assert.equal(bbca.transactionFlow.updatedAt, '2026-10-08T10:30:00.000Z');
    assert.equal(bbca.transactionFlow.periods['1d'].source, 'idx');
    assert.equal(bbca.transactionFlow.periods['1d'].foreign.netflowRp, 140_000_000_000);
    assert.equal(bbca.transactionFlow.periods['1d'].domestic.netflowRp, -140_000_000_000);
    assert.equal(bbca.transactionFlow.periods['1w'].source, 'hybrid');
    assert.equal(bbca.transactionFlow.periods['1w'].days, 5);

    // Ensure scoreAllStocks preserves rawData.transactionFlow for /api/stocks candidates
    const modeConfig = getModeConfig('balanced');
    const styleConfig = getStyleConfig('swing');
    const scored = scoreAllStocks(stocks, modeConfig.weights, styleConfig, {}, modeConfig.name);
    assert.equal(scored.length, 1);
    assert.deepEqual(scored[0].rawData.transactionFlow, bbca.transactionFlow);
  });
});

