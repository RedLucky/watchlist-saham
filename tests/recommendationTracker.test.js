import test from 'node:test';
import assert from 'node:assert/strict';
import { sendTradeOutcomeNotification } from '../src/lib/recommendationTracker.js';

test('1. sendTradeOutcomeNotification Constraints', async (t) => {
  await t.test('Mengabaikan status selain WIN atau LOSS (misal OPEN atau EXPIRED)', async () => {
    const resOpen = await sendTradeOutcomeNotification({
      recommendation: { ticker: 'BBCA', priceAtRecommend: 10000 },
      status: 'OPEN',
      exitPrice: 10000
    });
    assert.equal(resOpen, false, 'Status OPEN tidak boleh memicu notifikasi');

    const resExpired = await sendTradeOutcomeNotification({
      recommendation: { ticker: 'BBCA', priceAtRecommend: 10000 },
      status: 'EXPIRED',
      exitPrice: 10000
    });
    assert.equal(resExpired, false, 'Status EXPIRED tidak boleh memicu notifikasi');

    const resWaiting = await sendTradeOutcomeNotification({
      recommendation: { ticker: 'BBCA', priceAtRecommend: 10000 },
      status: 'WAITING_BUY',
      exitPrice: 10000
    });
    assert.equal(resWaiting, false, 'Status WAITING_BUY tidak boleh memicu notifikasi');
  });

  await t.test('Memproses status WIN dan LOSS tanpa error fatal saat webhook tersedia', async () => {
    // Test payload shape & safe execution
    const dummyRec = {
      id: 999999,
      ticker: 'TEST',
      name: 'Test Emiten',
      source: 'SYSTEM',
      style: 'swing',
      mode: 'balanced',
      priceAtRecommend: 1000,
      entryLow: 980,
      entryHigh: 1020,
      targetPrice: 1100,
      stopLoss: 940,
    };

    // When DISCORD_WEBHOOK_URL is set or not set, function must safely return boolean without throwing
    const winResult = await sendTradeOutcomeNotification({
      recommendation: dummyRec,
      status: 'WIN',
      exitPrice: 1100,
    });
    assert.equal(typeof winResult, 'boolean');

    const lossResult = await sendTradeOutcomeNotification({
      recommendation: dummyRec,
      status: 'LOSS',
      exitPrice: 940,
    });
    assert.equal(typeof lossResult, 'boolean');
  });
});
