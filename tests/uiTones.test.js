import test from 'node:test';
import assert from 'node:assert/strict';
import { getSignalBadgeClass, getRiskTone, getChangeTone } from '../src/lib/uiTones.js';

test('getSignalBadgeClass', async (t) => {
  await t.test('BUY dan STRONG_BUY → badge-up (tidak peka huruf besar/kecil)', () => {
    assert.equal(getSignalBadgeClass('BUY'), 'badge-up');
    assert.equal(getSignalBadgeClass('strong_buy'), 'badge-up');
  });

  await t.test('SELL dan STRONG_SELL → badge-down', () => {
    assert.equal(getSignalBadgeClass('SELL'), 'badge-down');
    assert.equal(getSignalBadgeClass('STRONG_SELL'), 'badge-down');
  });

  await t.test('sinyal lain atau kosong → badge-warn', () => {
    assert.equal(getSignalBadgeClass('HOLD'), 'badge-warn');
    assert.equal(getSignalBadgeClass(null), 'badge-warn');
    assert.equal(getSignalBadgeClass(undefined), 'badge-warn');
  });
});

test('getRiskTone', async (t) => {
  await t.test('memetakan setiap level risiko', () => {
    assert.deepEqual(getRiskTone('Rendah'), { text: 'text-up', badge: 'badge-up' });
    assert.deepEqual(getRiskTone('Sedang'), { text: 'text-ink', badge: '' });
    assert.deepEqual(getRiskTone('Menengah'), { text: 'text-warn', badge: 'badge-warn' });
    assert.deepEqual(getRiskTone('Tinggi'), { text: 'text-down', badge: 'badge-down' });
  });

  await t.test('level tidak dikenal dianggap berisiko (down)', () => {
    assert.equal(getRiskTone(undefined).text, 'text-down');
  });
});

test('getChangeTone', async (t) => {
  await t.test('positif → up, negatif → down', () => {
    assert.equal(getChangeTone(1.5), 'text-up');
    assert.equal(getChangeTone('-0.2'), 'text-down');
  });

  await t.test('nol atau bukan angka → muted', () => {
    assert.equal(getChangeTone(0), 'text-muted');
    assert.equal(getChangeTone(null), 'text-muted');
    assert.equal(getChangeTone('abc'), 'text-muted');
  });
});
