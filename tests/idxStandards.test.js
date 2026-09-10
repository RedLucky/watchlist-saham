import test from 'node:test';
import assert from 'node:assert/strict';
import { getTradingDaysElapsed } from '../src/lib/recommendationTracker.js';
import { getIDXRiseLimitPct, calculateTradeSetup } from '../src/lib/tradeSetup.js';
import { detectMarketMode, getModeConfig, getStyleConfig } from '../src/lib/modes.js';

test('1. IDX Trading Days Calculation (getTradingDaysElapsed)', async (t) => {
  await t.test('Mengabaikan hari Sabtu dan Minggu (tidak menghitung akhir pekan)', () => {
    // Jumat sore 2026-09-04 18:00 WIB
    const fridayEvening = new Date('2026-09-04T11:00:00.000Z');
    // Minggu malam 2026-09-06 20:00 WIB
    const sundayNight = new Date('2026-09-06T13:00:00.000Z');
    
    const daysOverWeekend = getTradingDaysElapsed(fridayEvening, sundayNight);
    assert.equal(daysOverWeekend, 0, 'Akhir pekan (Sabtu-Minggu) tidak boleh menambah hari bursa');
  });

  await t.test('Menghitung hari kerja Senin s/d Jumat secara presisi', () => {
    // Jumat 2026-09-04 18:00 WIB ke Senin 2026-09-07 18:00 WIB -> 1 hari bursa (Senin)
    const friday = new Date('2026-09-04T11:00:00.000Z');
    const monday = new Date('2026-09-07T11:00:00.000Z');
    assert.equal(getTradingDaysElapsed(friday, monday), 1);

    // Jumat ke Selasa -> 2 hari bursa (Senin, Selasa)
    const tuesday = new Date('2026-09-08T11:00:00.000Z');
    assert.equal(getTradingDaysElapsed(friday, tuesday), 2);
  });
});

test('2. IDX Auto Rejection (ARA) Limits & Trade Setup Clamping', async (t) => {
  await t.test('Persentase ARA sesuai fraksi harga resmi BEI', () => {
    assert.equal(getIDXRiseLimitPct(150), 35, 'Harga < 200 ARA +35%');
    assert.equal(getIDXRiseLimitPct(450), 25, 'Harga 200-5000 ARA +25%');
    assert.equal(getIDXRiseLimitPct(1500), 25, 'Harga 200-5000 ARA +25%');
    assert.equal(getIDXRiseLimitPct(8000), 20, 'Harga > 5000 ARA +20%');
  });

  await t.test('Target Price tidak boleh melampaui batas harga ARA harian BEI', () => {
    const dummyStock = {
      price: 1000,
      technicals: {
        prices: [900, 950, 1000],
        highs: [900, 950, 1500], // Resisten masa lalu sangat tinggi (+50%)
        ma20: 950,
      }
    };
    const style = getStyleConfig('swing');
    const setup = calculateTradeSetup(dummyStock, { setup: 'breakout' }, style);

    // Harga 1000 memiliki batas ARA +25% -> Maksimal 1250
    assert.ok(setup.target <= 1250, `Target Rp ${setup.target} tidak boleh melebihi batas ARA Rp 1.250`);
  });
});

test('3. Market Adaptive Mode Detection Suite (detectMarketMode)', async (t) => {
  await t.test('Mendeteksi mode growth saat pasar uptrend, volume sehat, dan reli merata', () => {
    const market = {
      indexTrend: 'up',
      volumeVsAvg: 1.15,
      advanceDecline: { advance: 400, decline: 200 } // adRatio = 0.66
    };
    assert.equal(detectMarketMode(market), 'growth');
  });

  await t.test('Mendeteksi mode defensive saat indeks breakdown atau breadth anjlok', () => {
    const marketDown = {
      indexTrend: 'down',
      volumeVsAvg: 1.0,
      advanceDecline: { advance: 200, decline: 400 }
    };
    assert.equal(detectMarketMode(marketDown), 'defensive');

    const marketWeakBreadth = {
      indexTrend: 'sideways',
      volumeVsAvg: 1.0,
      advanceDecline: { advance: 150, decline: 450 } // adRatio = 0.25 (< 0.40)
    };
    assert.equal(detectMarketMode(marketWeakBreadth), 'defensive');
  });

  await t.test('Mendeteksi mode conservative saat reli luas namun tidak euforia ekstrem', () => {
    const market = {
      indexTrend: 'up',
      volumeVsAvg: 0.95,
      advanceDecline: { advance: 350, decline: 250 } // adRatio = 0.58
    };
    assert.equal(detectMarketMode(market), 'conservative');
  });
});

