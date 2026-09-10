import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function equivalent to computeStats PnL logic in api/history/route.js
function calculateWinRateMetrics(items) {
  const waiting = items.filter(r => r.status === 'WAITING_BUY').length;
  const open = items.filter(r => r.status === 'OPEN').length;
  const wins = items.filter(r => r.status === 'WIN').length;
  const losses = items.filter(r => r.status === 'LOSS').length;
  const expired = items.filter(r => r.status === 'EXPIRED' || r.status === 'CANCELLED').length;
  const resolvedTrades = wins + losses;
  const winRateNum = resolvedTrades > 0 ? Math.round((wins / resolvedTrades) * 100) : 0;

  let cumulativePnl = 0;
  let winSum = 0;
  let lossSum = 0;

  const resolvedItems = items.filter(r => r.status === 'WIN' || r.status === 'LOSS');
  for (const r of resolvedItems) {
    const entry = Number(r.priceAtRecommend || r.entryLow || 0);
    const exit = r.exitPrice != null
      ? Number(r.exitPrice)
      : (r.status === 'WIN' ? Number(r.targetPrice || entry) : Number(r.stopLoss || entry));
    if (entry > 0) {
      const pnl = ((exit - entry) / entry) * 100;
      cumulativePnl += pnl;
      if (r.status === 'WIN') {
        winSum += pnl;
      } else {
        lossSum += pnl;
      }
    }
  }

  const avgWin = wins > 0 ? winSum / wins : 0;
  const avgLoss = losses > 0 ? lossSum / losses : 0;
  const payoffRatio = Math.abs(avgLoss) > 0 ? Number((avgWin / Math.abs(avgLoss)).toFixed(2)) : (avgWin > 0 ? 99 : 0);
  const winRateFraction = resolvedTrades > 0 ? wins / resolvedTrades : 0;
  const expectancy = (winRateFraction * avgWin) + ((1 - winRateFraction) * avgLoss);

  return {
    total: items.length,
    waiting,
    open,
    wins,
    losses,
    winRate: `${winRateNum}%`,
    winRateNum,
    cumulativePnl: Number(cumulativePnl.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    payoffRatio,
    expectancy: Number(expectancy.toFixed(2)),
    isNetProfit: cumulativePnl >= 0,
  };
}

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

