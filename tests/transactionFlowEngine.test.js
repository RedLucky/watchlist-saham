/**
 * @fileoverview Unit tests for the Hybrid Transaction Flow Engine (TASK-4108).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOW_PERIOD_DAYS,
  FLOW_PERIOD_LABELS,
  clampNumber,
  sharesToLots,
  computeDailyBuyingRatio,
  resolveKseiFlowWeights,
  buildDailyFlowSeries,
  aggregateFlowWindow,
  calculateTransactionFlows,
} from '../src/lib/transactionFlowEngine.js';

describe('transactionFlowEngine — utility helpers', () => {
  it('clampNumber clamps finite numbers and defaults non-finite values to min', () => {
    assert.equal(clampNumber(5, 0, 10), 5);
    assert.equal(clampNumber(-3, 0, 10), 0);
    assert.equal(clampNumber(25, 0, 10), 10);
    assert.equal(clampNumber(NaN, 2, 8), 2);
    assert.equal(clampNumber(undefined, 1, 5), 1);
  });

  it('sharesToLots converts shares to 100-share BEI lots and handles invalid inputs', () => {
    assert.equal(sharesToLots(10000), 100);
    assert.equal(sharesToLots(150), 2);
    assert.equal(sharesToLots(0), 0);
    assert.equal(sharesToLots(NaN), 0);
    assert.equal(sharesToLots(null), 0);
  });
});

describe('transactionFlowEngine — computeDailyBuyingRatio', () => {
  it('computes high buying pressure when candle closes near intraday high with positive return', () => {
    const ratio = computeDailyBuyingRatio({
      close: 1050,
      high: 1060,
      low: 1000,
      prevClose: 1000,
    });
    assert.ok(ratio > 0.75 && ratio <= 0.9, `Expected strong buy ratio, got ${ratio}`);
  });

  it('computes low buying pressure when candle closes near intraday low with negative return', () => {
    const ratio = computeDailyBuyingRatio({
      close: 950,
      high: 1000,
      low: 945,
      prevClose: 1000,
    });
    assert.ok(ratio >= 0.1 && ratio < 0.25, `Expected weak buy ratio, got ${ratio}`);
  });

  it('falls back to momentum ratio when intraday high equals low (flat or ARA/ARB lock)', () => {
    const flatUp = computeDailyBuyingRatio({
      close: 1100,
      high: 1100,
      low: 1100,
      prevClose: 1000,
    });
    const flatUnchanged = computeDailyBuyingRatio({
      close: 1000,
      high: 1000,
      low: 1000,
      prevClose: 1000,
    });
    assert.ok(flatUp > 0.7);
    assert.equal(flatUnchanged, 0.5);
  });
});

describe('transactionFlowEngine — resolveKseiFlowWeights', () => {
  it('returns default 35% foreign and 65% domestic weights when kseiLatest is null', () => {
    const weights = resolveKseiFlowWeights(null);
    assert.equal(weights.foreignWeight, 0.35);
    assert.equal(weights.domesticWeight, 0.65);
    assert.equal(weights.foreignTilt, 0);
    assert.equal(weights.domesticTilt, 0);
  });

  it('extracts foreignPercent and computes positive/negative tilts from KSEI deltas', () => {
    const weights = resolveKseiFlowWeights({
      foreignPercent: 60,
      freeFloatShares: 1_000_000_000,
      deltaForeign: 40_000_000,
      deltaPension: -10_000_000,
      deltaMutualFund: -10_000_000,
      deltaInsurance: 0,
    });
    assert.equal(weights.foreignWeight, 0.6);
    assert.equal(weights.domesticWeight, 0.4);
    assert.ok(weights.foreignTilt > 0);
    assert.ok(weights.domesticTilt < 0);
  });

  it('returns zero tilts when freeFloatShares and secNum are zero', () => {
    const weights = resolveKseiFlowWeights({
      foreignPercent: 95, // clamped to 0.85
      freeFloatShares: 0,
      deltaForeign: 500_000,
    });
    assert.equal(weights.foreignWeight, 0.85);
    assert.equal(weights.domesticWeight, 0.15);
    assert.equal(weights.foreignTilt, 0);
    assert.equal(weights.domesticTilt, 0);
  });
});

describe('transactionFlowEngine — buildDailyFlowSeries & aggregateFlowWindow', () => {
  it('returns empty array when no prices, volumes, or idxFlow exist', () => {
    const series = buildDailyFlowSeries({});
    assert.deepEqual(series, []);
    const emptyAgg = aggregateFlowWindow([], '1d');
    assert.equal(emptyAgg.source, 'empty');
    assert.equal(emptyAgg.days, 0);
    assert.equal(emptyAgg.dominantPlayer, 'BALANCED');
  });

  it('uses official IDX foreignBuy and foreignSell when idxFlow records are provided', () => {
    const idxFlow = [
      {
        date: '2026-10-08',
        close: 5000,
        volume: 1_000_000,
        value: 5_000_000_000,
        foreignBuy: 600_000,
        foreignSell: 200_000,
      },
    ];
    const series = buildDailyFlowSeries({
      prices: [5000],
      volumes: [1_000_000],
      idxFlow,
    });

    assert.equal(series.length, 1);
    assert.equal(series[0].source, 'idx');
    assert.equal(series[0].foreignBuyShares, 600_000);
    assert.equal(series[0].foreignSellShares, 200_000);
    assert.equal(series[0].domesticBuyShares, 400_000);
    assert.equal(series[0].domesticSellShares, 800_000);

    const summary = aggregateFlowWindow(series, '1d');
    assert.equal(summary.source, 'idx');
    assert.equal(summary.idxDays, 1);
    assert.equal(summary.foreign.inflowRp, 3_000_000_000);
    assert.equal(summary.foreign.outflowRp, 1_000_000_000);
    assert.equal(summary.foreign.netflowRp, 2_000_000_000);
    assert.equal(summary.foreign.inflowLots, 6000);
    assert.equal(summary.foreign.outflowLots, 2000);
    assert.equal(summary.foreign.netflowLots, 4000);
    assert.equal(summary.domestic.inflowRp, 2_000_000_000);
    assert.equal(summary.domestic.outflowRp, 4_000_000_000);
    assert.equal(summary.domestic.netflowRp, -2_000_000_000);
    assert.equal(summary.dominantPlayer, 'FOREIGN_ACCUMULATION');
  });

  it('classifies DOMESTIC_ACCUMULATION, FOREIGN_DISTRIBUTION, and DOMESTIC_DISTRIBUTION accurately', () => {
    // Domestic accumulation via IDX record where foreign sells and domestic buys
    const domAccBar = buildDailyFlowSeries({
      idxFlow: [
        {
          date: '2026-10-08',
          close: 1000,
          volume: 1_000_000,
          value: 1_000_000_000,
          foreignBuy: 100_000,
          foreignSell: 300_000,
        },
      ],
    });
    const domAccSummary = aggregateFlowWindow(domAccBar, '1d');
    assert.equal(domAccSummary.dominantPlayer, 'DOMESTIC_ACCUMULATION');

    // Estimated foreign distribution when candle drops sharply and foreign has negative tilt
    const fDistBar = buildDailyFlowSeries({
      prices: [1000, 930],
      highs: [1010, 990],
      lows: [990, 925],
      volumes: [500_000, 1_000_000],
      kseiLatest: {
        foreignPercent: 75,
        freeFloatShares: 10_000_000,
        deltaForeign: -1_000_000,
      },
    });
    const fDistSummary = aggregateFlowWindow(fDistBar.slice(-1), '1d');
    assert.equal(fDistSummary.dominantPlayer, 'FOREIGN_DISTRIBUTION');

    // Estimated domestic distribution whenforeign netflow is near 0% but domestic sells heavily
    const dDistBar = [
      {
        source: 'estimated',
        volume: 1_000_000,
        turnoverRp: 1_000_000_000,
        foreignBuyShares: 100_000,
        foreignSellShares: 110_000,
        foreignBuyRp: 100_000_000,
        foreignSellRp: 110_000_000, // -1% netflowPct (> -2.0%)
        domesticBuyShares: 200_000,
        domesticSellShares: 600_000,
        domesticBuyRp: 200_000_000,
        domesticSellRp: 600_000_000, // -40% netflowPct (<= -2.0%)
        activeBuyShares: 300_000,
        activeSellShares: 700_000,
        activeBuyRp: 300_000_000,
        activeSellRp: 700_000_000,
      },
    ];
    const dDistSummary = aggregateFlowWindow(dDistBar, '1d');
    assert.equal(dDistSummary.dominantPlayer, 'DOMESTIC_DISTRIBUTION');
  });
});

describe('transactionFlowEngine — calculateTransactionFlows multi-window integration', () => {
  it('computes 1d, 1w, 1m, and 1y windows and marks hybrid source when trailing IDX bars exist', () => {
    const prices = Array.from({ length: 260 }, (_, idx) => 2000 + idx * 5);
    const highs = prices.map((p) => p + 25);
    const lows = prices.map((p) => p - 15);
    const volumes = Array.from({ length: 260 }, () => 500_000);

    const idxFlow = [
      {
        date: '2026-10-08',
        close: prices[259],
        volume: 800_000,
        value: prices[259] * 800_000,
        foreignBuy: 500_000,
        foreignSell: 300_000,
      },
    ];

    const report = calculateTransactionFlows({
      price: prices[259],
      volume: 800_000,
      technicals: {
        prices,
        highs,
        lows,
        volumes,
        idxFlow,
        idxFlowUpdatedAt: '2026-10-08T10:30:00.000Z',
      },
      kseiLatest: {
        foreignPercent: 45,
        freeFloatShares: 500_000_000,
        deltaForeign: 5_000_000,
      },
    });

    assert.equal(report.updatedAt, '2026-10-08T10:30:00.000Z');
    assert.equal(report.hasIdxData, true);
    assert.equal(report.periods['1d'].days, FLOW_PERIOD_DAYS['1d']);
    assert.equal(report.periods['1d'].source, 'idx');
    assert.equal(report.periods['1w'].days, FLOW_PERIOD_DAYS['1w']);
    assert.equal(report.periods['1w'].source, 'hybrid');
    assert.equal(report.periods['1m'].days, FLOW_PERIOD_DAYS['1m']);
    assert.equal(report.periods['1y'].days, FLOW_PERIOD_DAYS['1y']);
    assert.equal(report.periods['1y'].label, FLOW_PERIOD_LABELS['1y']);
  });

  it('falls back to single bar from stockInput.price and stockInput.volume when technical arrays are empty', () => {
    const report = calculateTransactionFlows({
      price: 1500,
      volume: 200_000,
      technicals: {},
    });
    assert.equal(report.hasIdxData, false);
    assert.equal(report.periods['1d'].days, 1);
    assert.equal(report.periods['1d'].source, 'estimated');
    assert.equal(report.periods['1d'].totalLots, 2000);
  });
});

