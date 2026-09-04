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

  await t.test('Menggunakan ATR untuk bantalan Stop Loss jika volatilitas tinggi', () => {
    const volatileStock = {
      price: 2000,
      technicals: {
        atr14: 60, // 1.5 * 60 = 90 poin buffer di bawah entry
        prices: [1950, 1980, 2000],
      }
    };
    const volatileSetup = calculateTradeSetup(volatileStock, { setup: 'swing' }, {
      name: 'swing',
      exit: { tp: 5.0, sl: 2.5 }
    });
    // Default SL 2.5% dari 2000 adalah 1950 (50 poin). Dengan ATR 60, 1.5 * ATR = 90 -> SL dinamis ~ 1910
    assert.ok(volatileSetup.stopLoss <= volatileSetup.entry.low - 80, `Stop Loss (${volatileSetup.stopLoss}) harus memperhitungkan buffer ATR 1.5x`);
    assert.ok(volatileSetup.stopLoss >= volatileSetup.entry.low * 0.92, 'Stop Loss tidak boleh melampaui batas risiko -8%');
  });

  await t.test('Target Price menempel di bawah Resisten Swing High terdekat', () => {
    const swingStock = {
      price: 2000,
      technicals: {
        highs: [1980, 2010, 2050, 2120, 2110, 2100], // swing resistance = 2120
      }
    };
    const swingSetup = calculateTradeSetup(swingStock, { setup: 'swing' }, {
      name: 'swing',
      exit: { tp: 3.0, sl: 2.5 } // raw TP 3% = 2060
    });
    // Resistance adalah 2120. Step untuk 2120 adalah 10. Resisten target = 2120 - 10 = 2110 > raw target 2060.
    assert.ok(swingSetup.target >= 2110, `Target price (${swingSetup.target}) harus terjangkar pada swing high resistance 2120`);
  });
});

