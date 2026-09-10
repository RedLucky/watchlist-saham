import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMonitorMetrics,
  parsePrice,
  calculateTargetSellFromPercent,
  calculateTargetPercentFromPrices,
} from '../src/lib/tradeSetup.js';

test('1. Monitor Metrics Calculation Suite (Kalkulasi Pantau Untung & Rugi)', async (t) => {
  await t.test('Menghitung nominal untung/rugi, persentase, dan risk/reward ratio secara tepat', () => {
    // Entry: 10.000, TP: 11.500 (+15%), SL: 9.500 (-5%)
    const res = calculateMonitorMetrics('10000', '11500', '9500');

    assert.equal(res.validEntry, true);
    assert.equal(res.validTarget, true);
    assert.equal(res.validStopLoss, true);
    assert.equal(res.profitNominal, 1500);
    assert.equal(res.profitPercent, 15);
    assert.equal(res.lossNominal, 500);
    assert.equal(res.lossPercent, 5);
    assert.equal(res.rrRatio, 3.0); // Reward (1500) / Risk (500) = 3.0x
  });

  await t.test('Mampu menangani string yang diformat dengan pemisah ribuan atau teks Rp', () => {
    const res = calculateMonitorMetrics('Rp 5.000', '5.500', '4.750');

    assert.equal(res.validEntry, true);
    assert.equal(res.profitNominal, 500);
    assert.equal(res.profitPercent, 10);
    assert.equal(res.lossNominal, 250);
    assert.equal(res.lossPercent, 5);
    assert.equal(res.rrRatio, 2.0);
  });

  await t.test('Fallback aman jika input kosong, null, atau tidak lengkap tanpa melempar error', () => {
    const emptyRes = calculateMonitorMetrics('', '', '');
    assert.equal(emptyRes.validEntry, false);
    assert.equal(emptyRes.hasProfit, false);
    assert.equal(emptyRes.hasLoss, false);
    assert.equal(emptyRes.profitNominal, null);
    assert.equal(emptyRes.lossNominal, null);
    assert.equal(emptyRes.rrRatio, null);

    const partialRes = calculateMonitorMetrics('1000', '', '');
    assert.equal(partialRes.validEntry, true);
    assert.equal(partialRes.hasProfit, false);
    assert.equal(partialRes.hasLoss, false);
    assert.equal(partialRes.profitNominal, null);
  });

  await t.test('Fallback aman terhadap pembagian dengan nol (division by zero) dan angka non-angka', () => {
    const zeroRes = calculateMonitorMetrics('0', '1000', '500');
    assert.equal(zeroRes.validEntry, false);
    assert.equal(zeroRes.profitPercent, null);

    const nanRes = calculateMonitorMetrics('abc', 'def', 'xyz');
    assert.equal(nanRes.validEntry, false);
    assert.equal(nanRes.profitNominal, null);
    assert.equal(nanRes.lossNominal, null);
  });
});

test('2. Two-Way Price & Percentage Helper Suite (Clean Code Helpers)', async (t) => {
  await t.test('parsePrice membersihkan angka mata uang Indonesia secara akurat', () => {
    assert.equal(parsePrice('Rp 10.000'), 10000);
    assert.equal(parsePrice('10.000,50'), 10000.5);
    assert.equal(parsePrice('1500'), 1500);
    assert.equal(parsePrice(2500), 2500);
    assert.equal(Number.isNaN(parsePrice('')), true);
    assert.equal(Number.isNaN(parsePrice(null)), true);
  });

  await t.test('calculateTargetSellFromPercent menghitung harga jual dan membulatkan ke fraksi BEI', () => {
    // Buy 1.000, +10% -> 1.100 (Fraksi Rp 5)
    assert.equal(calculateTargetSellFromPercent('1000', '10'), '1100');
    // Buy Rp 5.000, +7% -> 5.350 (Fraksi Rp 25)
    assert.equal(calculateTargetSellFromPercent('Rp 5.000', '7'), '5350');
    // Input tidak valid fallback ke string kosong
    assert.equal(calculateTargetSellFromPercent('', '10'), '');
    assert.equal(calculateTargetSellFromPercent('1000', ''), '');
  });

  await t.test('calculateTargetPercentFromPrices menghitung persentase return 2 desimal', () => {
    // Buy 1.000, Sell 1.150 -> 15.00%
    assert.equal(calculateTargetPercentFromPrices('1000', '1150'), '15.00');
    // Buy Rp 5.000, Sell Rp 4.750 -> -5.00%
    assert.equal(calculateTargetPercentFromPrices('Rp 5.000', 'Rp 4.750'), '-5.00');
    // Input tidak valid fallback ke string kosong
    assert.equal(calculateTargetPercentFromPrices('', '1150'), '');
    assert.equal(calculateTargetPercentFromPrices('0', '1150'), '');
  });
});
