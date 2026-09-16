import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeDiscreteLots } from '../src/lib/lotOptimizer.js';

test('1. Knapsack Lot Optimizer Suite (Budget & Lot Precision)', async (t) => {
  const sampleStocks = [
    { ticker: 'BBCA', price: 10250, targetWeightPct: 40, priorityRank: 1, dividendYield: 3.2, estimatedGrowth: 10.0 }, // 1 Lot = Rp 1.025.000
    { ticker: 'BMRI', price: 6800, targetWeightPct: 30, priorityRank: 2, dividendYield: 4.8, estimatedGrowth: 9.0 },   // 1 Lot = Rp 680.000
    { ticker: 'ASII', price: 5100, targetWeightPct: 20, priorityRank: 3, dividendYield: 6.5, estimatedGrowth: 6.0 },   // 1 Lot = Rp 510.000
    { ticker: 'ICBP', price: 11500, targetWeightPct: 10, priorityRank: 4, dividendYield: 3.0, estimatedGrowth: 8.0 }   // 1 Lot = Rp 1.150.000
  ];

  await t.test('Tidak boleh melebihi anggaran (Zero Overbudget)', () => {
    const budget = 4000000; // Rp 4.000.000
    const result = optimizeDiscreteLots(sampleStocks, budget);

    assert.ok(result.totalSpent <= budget, `Total belanja (${result.totalSpent}) melebihi anggaran (${budget})`);
    assert.equal(result.totalSpent + result.remainingCash, budget);
    assert.ok(result.utilizationPct > 0 && result.utilizationPct <= 100);
  });

  await t.test('Semua lot harus bilangan bulat non-negatif', () => {
    const budget = 3500000;
    const result = optimizeDiscreteLots(sampleStocks, budget);

    for (const [ticker, lots] of Object.entries(result.optimalLots)) {
      assert.ok(Number.isInteger(lots), `Lot untuk ${ticker} harus integer, dapat: ${lots}`);
      assert.ok(lots >= 0, `Lot untuk ${ticker} tidak boleh negatif`);
    }
  });

  await t.test('Penyerapan kas maksimal: sisa kas tidak boleh cukup membeli 1 lot saham prioritas termurah', () => {
    const budget = 5000000; // Rp 5.000.000
    const result = optimizeDiscreteLots(sampleStocks, budget);

    // Saham termurah adalah ASII (Rp 510.000 per lot)
    const cheapestLotCost = 510000;
    assert.ok(
      result.remainingCash < cheapestLotCost,
      `Sisa kas (Rp ${result.remainingCash}) masih cukup membeli 1 lot saham termurah (Rp ${cheapestLotCost})!`
    );
    assert.ok(result.utilizationPct >= 89.0, `Efisiensi penyerapan modal harus tinggi, dapat: ${result.utilizationPct}%`);
  });

  await t.test('Menangani anggaran kecil secara aman tanpa crash', () => {
    const smallBudget = 600000; // Hanya cukup 1 lot ASII (Rp 510.000)
    const result = optimizeDiscreteLots(sampleStocks, smallBudget);

    assert.ok(result.totalSpent <= smallBudget);
    assert.equal(result.optimalLots.ASII, 1);
    assert.equal(result.optimalLots.BBCA, 0);
    assert.equal(result.remainingCash, 90000);
    assert.equal(result.totalSpent, 510000);
  });

  await t.test('Menangani anggaran 0 atau input kosong dengan aman', () => {
    const zeroResult = optimizeDiscreteLots(sampleStocks, 0);
    assert.equal(zeroResult.totalSpent, 0);
    assert.equal(zeroResult.remainingCash, 0);
    assert.equal(zeroResult.utilizationPct, 0);

    const emptyResult = optimizeDiscreteLots([], 2000000);
    assert.equal(emptyResult.totalSpent, 0);
    assert.equal(emptyResult.remainingCash, 2000000);
  });
});
