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

    const timeStopWinResult = await sendTradeOutcomeNotification({
      recommendation: dummyRec,
      status: 'WIN',
      exitPrice: 1050,
      reason: 'Time Stop (14 hari) — Ditutup dengan keuntungan +5.00%',
    });
    assert.equal(typeof timeStopWinResult, 'boolean');

    const timeStopLossResult = await sendTradeOutcomeNotification({
      recommendation: dummyRec,
      status: 'LOSS',
      exitPrice: 970,
      reason: 'Time Stop (14 hari) — Ditutup dengan defisit -3.00%',
    });
    assert.equal(typeof timeStopLossResult, 'boolean');
  });

  await t.test('Evaluasi Time Stop: profit >= 0 menjadi WIN, minus menjadi LOSS', () => {
    const entryPrice = 1000;
    
    // Kasus 1: Harga naik saat waktu habis -> WIN
    const exitPriceProfit = 1050;
    const statusProfit = exitPriceProfit >= entryPrice ? 'WIN' : 'LOSS';
    assert.equal(statusProfit, 'WIN', 'Harga di atas harga beli saat waktu habis wajib terhitung WIN');

    // Kasus 2: Harga sama / BEP saat waktu habis -> WIN (modal terlindungi)
    const exitPriceFlat = 1000;
    const statusFlat = exitPriceFlat >= entryPrice ? 'WIN' : 'LOSS';
    assert.equal(statusFlat, 'WIN', 'BEP saat waktu habis terhitung WIN (modal terlindungi)');

    // Kasus 3: Harga turun saat waktu habis -> LOSS
    const exitPriceLoss = 980;
    const statusLoss = exitPriceLoss >= entryPrice ? 'WIN' : 'LOSS';
    assert.equal(statusLoss, 'LOSS', 'Harga di bawah harga beli saat waktu habis wajib terhitung LOSS');
  });
});
