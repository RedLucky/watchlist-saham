import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWinRateMetrics } from '../src/lib/winRateStats.js';

test('1. Win Rate & Cumulative Return Engine Suite', async (t) => {
  await t.test('Menghitung akumulasi PnL, Avg Win, Avg Loss, dan Payoff Ratio secara akurat', () => {
    const sampleTrades = [
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1080 },   // +8.0%
      { status: 'WIN', priceAtRecommend: 2000, exitPrice: 2120 },   // +6.0%
      { status: 'LOSS', priceAtRecommend: 500, exitPrice: 485 },     // -3.0%
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },    // -3.0%
    ];

    const stats = calculateWinRateMetrics(sampleTrades);

    assert.equal(stats.winRate, '50%');
    assert.equal(stats.winRateNum, 50);
    assert.equal(stats.wins, 2);
    assert.equal(stats.losses, 2);
    assert.equal(stats.avgWin, 7.0);       // (8 + 6) / 2 = 7%
    assert.equal(stats.avgLoss, -3.0);     // (-3 + -3) / 2 = -3%
    assert.equal(stats.payoffRatio, 2.33); // 7.0 / 3.0 = 2.33x
    assert.equal(stats.cumulativePnl, 8.0); // +8 + 6 - 3 - 3 = +8.0%
    assert.equal(stats.expectancy, 2.0);   // (0.5 * 7) + (0.5 * -3) = +2.0%
    assert.equal(stats.isNetProfit, true);
  });

  await t.test('Membuktikan skenario pengguna: Win Rate 50% tetap menghasilkan untung jika Avg Win > Avg Loss', () => {
    // 5 win @ +6%, 5 loss @ -3%
    const trades = [
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1060 },
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1060 },
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1060 },
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1060 },
      { status: 'WIN', priceAtRecommend: 1000, exitPrice: 1060 },
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },
      { status: 'LOSS', priceAtRecommend: 1000, exitPrice: 970 },
    ];

    const stats = calculateWinRateMetrics(trades);

    assert.equal(stats.winRate, '50%');
    assert.equal(stats.cumulativePnl, 15.0); // +15% total keuntungan akumulasi
    assert.equal(stats.avgWin, 6.0);
    assert.equal(stats.avgLoss, -3.0);
    assert.equal(stats.payoffRatio, 2.0);
    assert.equal(stats.expectancy, 1.5);    // +1.5% ekspektansi per transaksi
    assert.equal(stats.isNetProfit, true);
  });

  await t.test('Menangani kasus tidak ada trade yang terselesaikan dengan aman tanpa NaN/Infinity', () => {
    const onlyWaiting = [
      { status: 'WAITING_BUY', priceAtRecommend: 1000 },
      { status: 'OPEN', priceAtRecommend: 1000 },
    ];

    const stats = calculateWinRateMetrics(onlyWaiting);

    assert.equal(stats.winRate, '0%');
    assert.equal(stats.cumulativePnl, 0);
    assert.equal(stats.avgWin, 0);
    assert.equal(stats.avgLoss, 0);
    assert.equal(stats.payoffRatio, 0);
    assert.equal(stats.expectancy, 0);
    assert.equal(stats.isNetProfit, true);
  });
});

