import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCompositeScore,
  getScoreTone,
  getTargetStatus,
  getTargetProgress,
  summarizeCollection,
} from '../src/lib/collectionCardUtils.js';

test('getCompositeScore', async (t) => {
  await t.test('memakai bobot 45/35/10/10', () => {
    assert.equal(getCompositeScore({ fundamental: 80, technical: 60, trending: 40, smartMoney: 20 }), 63);
  });

  await t.test('sub-skor kosong dianggap 50', () => {
    assert.equal(getCompositeScore({}), 50);
    assert.equal(getCompositeScore(), 50);
    assert.equal(getCompositeScore({ fundamental: 100, technical: null }), 73);
  });
});

test('getScoreTone', async (t) => {
  await t.test('batas ambang 80 / 65 / 50', () => {
    assert.equal(getScoreTone(80), 'excellent');
    assert.equal(getScoreTone(79), 'good');
    assert.equal(getScoreTone(65), 'good');
    assert.equal(getScoreTone(64), 'fair');
    assert.equal(getScoreTone(50), 'fair');
    assert.equal(getScoreTone(49), 'poor');
  });

  await t.test('null bila skor tidak ada', () => {
    assert.equal(getScoreTone(null), null);
    assert.equal(getScoreTone(undefined), null);
    assert.equal(getScoreTone(NaN), null);
  });
});

test('getTargetStatus', async (t) => {
  await t.test('target beli kena bila harga <= targetBuy', () => {
    assert.deepEqual(getTargetStatus(1000, 1000, 1500), { isBuyHit: true, isSellHit: false });
  });

  await t.test('target jual kena bila harga >= targetSell', () => {
    assert.deepEqual(getTargetStatus(1500, 1000, 1500), { isBuyHit: false, isSellHit: true });
  });

  await t.test('tidak kena bila harga di antara target atau target kosong', () => {
    assert.deepEqual(getTargetStatus(1200, 1000, 1500), { isBuyHit: false, isSellHit: false });
    assert.deepEqual(getTargetStatus(1200, null, null), { isBuyHit: false, isSellHit: false });
  });

  await t.test('harga 0 / kosong tidak pernah dianggap kena', () => {
    assert.deepEqual(getTargetStatus(0, 1000, 1500), { isBuyHit: false, isSellHit: false });
    assert.deepEqual(getTargetStatus(undefined, 1000, 1500), { isBuyHit: false, isSellHit: false });
  });
});

test('getTargetProgress', async (t) => {
  await t.test('posisi harga di antara target beli dan jual', () => {
    assert.equal(getTargetProgress(1250, 1000, 1500), 50);
    assert.equal(getTargetProgress(1000, 1000, 1500), 0);
    assert.equal(getTargetProgress(1500, 1000, 1500), 100);
  });

  await t.test('dibatasi 0–100', () => {
    assert.equal(getTargetProgress(900, 1000, 1500), 0);
    assert.equal(getTargetProgress(2000, 1000, 1500), 100);
  });

  await t.test('null bila data tidak lengkap atau rentang tidak valid', () => {
    assert.equal(getTargetProgress(1200, null, 1500), null);
    assert.equal(getTargetProgress(1200, 1000, null), null);
    assert.equal(getTargetProgress(0, 1000, 1500), null);
    assert.equal(getTargetProgress(1200, 1500, 1500), null);
    assert.equal(getTargetProgress(1200, 1500, 1000), null);
  });
});

test('summarizeCollection', async (t) => {
  await t.test('menghitung jumlah, target kena, naik/turun dan rata-rata perubahan', () => {
    const items = [
      { targetBuy: 1000, targetSell: 2000, stock: { price: 900, changePercent: -2 } }, // buy hit, loser
      { targetBuy: 1000, targetSell: 2000, stock: { price: 2100, changePercent: 4 } }, // sell hit, gainer
      { targetBuy: null, targetSell: null, stock: { price: 500, changePercent: 0 } }, // flat
      { stock: { price: 700 } }, // no change data
    ];
    assert.deepEqual(summarizeCollection(items), {
      count: 4,
      buyHits: 1,
      sellHits: 1,
      gainers: 1,
      losers: 1,
      avgChange: (4 - 2 + 0) / 3,
    });
  });

  await t.test('koleksi kosong', () => {
    assert.deepEqual(summarizeCollection([]), {
      count: 0, buyHits: 0, sellHits: 0, gainers: 0, losers: 0, avgChange: null,
    });
    assert.equal(summarizeCollection().count, 0);
  });

  await t.test('item tanpa stock tidak membuat error', () => {
    assert.equal(summarizeCollection([{}, null]).count, 2);
  });
});
