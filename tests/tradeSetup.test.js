import test from 'node:test';
import assert from 'node:assert/strict';
import { getIDXPriceStep, roundToIDXTick, calculateTradeSetup } from '../src/lib/tradeSetup.js';

test('1. IDX Tick Sizes (getIDXPriceStep)', async (t) => {
  await t.test('Harga < 200 menggunakan fraksi Rp 1', () => {
    assert.equal(getIDXPriceStep(50), 1);
    assert.equal(getIDXPriceStep(199), 1);
  });

  await t.test('Harga 200 - 500 menggunakan fraksi Rp 2', () => {
    assert.equal(getIDXPriceStep(200), 2);
    assert.equal(getIDXPriceStep(450), 2);
    assert.equal(getIDXPriceStep(498), 2);
  });

  await t.test('Harga 500 - 2.000 menggunakan fraksi Rp 5', () => {
    assert.equal(getIDXPriceStep(500), 5);
    assert.equal(getIDXPriceStep(690), 5);
    assert.equal(getIDXPriceStep(1995), 5);
  });

  await t.test('Harga 2.000 - 5.000 menggunakan fraksi Rp 10', () => {
    assert.equal(getIDXPriceStep(2000), 10);
    assert.equal(getIDXPriceStep(2720), 10);
    assert.equal(getIDXPriceStep(4990), 10);
  });

  await t.test('Harga >= 5.000 menggunakan fraksi Rp 25', () => {
    assert.equal(getIDXPriceStep(5000), 25);
    assert.equal(getIDXPriceStep(6675), 25);
    assert.equal(getIDXPriceStep(11275), 25);
  });
});

test('2. IDX Tick Rounding (roundToIDXTick)', async (t) => {
  await t.test('Membulatkan ke fraksi terdekat', () => {
    assert.equal(roundToIDXTick(2693), 2690);
    assert.equal(roundToIDXTick(2697), 2700);
    assert.equal(roundToIDXTick(6642), 6650);
    assert.equal(roundToIDXTick(11162), 11150);
  });

  await t.test('Pembulatan paksa ke atas (up) dan ke bawah (down)', () => {
    assert.equal(roundToIDXTick(2693, 'down'), 2690);
    assert.equal(roundToIDXTick(2693, 'up'), 2700);
    assert.equal(roundToIDXTick(6642, 'down'), 6625);
    assert.equal(roundToIDXTick(6642, 'up'), 6650);
  });
});

test('3. Trade Setup Constraints (calculateTradeSetup)', async (t) => {
  const dummyStock = {
    price: 2720,
    technicals: {
      ma9: 2700,
      ma20: 2600,
      resistance: 2800,
      support: 2500,
    }
  };

  const styleConfig = {
    name: 'scalping',
    label: 'Scalping',
    riskLevel: 'Tinggi',
    riskColor: 'red',
    exit: { tp: 2.0, sl: 1.0 }
  };

  const setup = calculateTradeSetup(dummyStock, { setup: 'scalp' }, styleConfig);

  await t.test('Semua harga mematuhi fraksi harga resmi BEI', () => {
    assert.equal(roundToIDXTick(setup.entry.low), setup.entry.low);
    assert.equal(roundToIDXTick(setup.entry.high), setup.entry.high);
    assert.equal(roundToIDXTick(setup.target), setup.target);
    assert.equal(roundToIDXTick(setup.stopLoss), setup.stopLoss);
  });

  await t.test('Stop Loss wajib secara ketat berada di bawah entry.low', () => {
    assert.ok(setup.stopLoss < setup.entry.low, `Stop Loss (${setup.stopLoss}) harus lebih rendah dari entry.low (${setup.entry.low})`);
    assert.ok(setup.entry.low < setup.entry.high, `entry.low (${setup.entry.low}) harus lebih rendah dari entry.high (${setup.entry.high})`);
    assert.ok(setup.entry.high < setup.target, `entry.high (${setup.entry.high}) harus lebih rendah dari target (${setup.target})`);
  });

  await t.test('Risk Reward ratio bernilai positif dan logis', () => {
    assert.ok(setup.riskReward > 0);
  });
});
