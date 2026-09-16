import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeDividendTrap } from '../src/lib/dividendTrapEngine.js';

describe('Bloomberg DTRP & DVD: Dividend Trap & Run-Rate Engine', () => {
  it('1. Menangani non-dividend payer dengan verdict yang tepat', () => {
    const result = analyzeDividendTrap({
      dividendYield: 0,
      price: 1000
    });

    assert.strictEqual(result.isDividendPayer, false);
    assert.strictEqual(result.verdict, 'Non-Dividend Payer');
    assert.strictEqual(result.runRate, null);
  });

  it('2. Mengklasifikasikan Dividend Aristocrat dengan skor keamanan tinggi', () => {
    const result = analyzeDividendTrap({
      dividendYield: 5.5,
      payoutRatio: 50.0,
      fcf: 10e12,
      netProfit: 12e12,
      totalDividendsPaid: 6e12,
      der: 0.6,
      dividendStreakYears: 12,
      price: 9000,
      sector: 'Financials'
    });

    assert.strictEqual(result.isDividendPayer, true);
    assert.ok(result.safetyScore >= 80, `Skor keamanan harus >= 80, aktual: ${result.safetyScore}`);
    assert.strictEqual(result.trapRisk, 'Rendah');
    assert.strictEqual(result.badgeColor, 'emerald');
    assert.ok(result.positiveFactors.some(f => f.includes('Aristocrat')));
  });

  it('3. Mendeteksi Dividend Trap berbahaya saat Payout Ratio > 100% dan FCF negatif', () => {
    const result = analyzeDividendTrap({
      dividendYield: 14.5,
      payoutRatio: 125.0,
      fcf: -2e12,
      netProfit: 1e12,
      der: 3.2,
      dividendStreakYears: 1,
      price: 1500,
      sector: 'Energy'
    });

    assert.strictEqual(result.isDividendPayer, true);
    assert.ok(result.safetyScore < 45, `Skor keamanan harus < 45, aktual: ${result.safetyScore}`);
    assert.strictEqual(result.trapRisk, 'Tinggi');
    assert.strictEqual(result.badgeColor, 'rose');
    assert.ok(result.verdict.includes('Dividend Trap'));
    assert.ok(result.riskFactors.some(r => r.includes('Free Cash Flow')));
  });

  it('4. Menghitung 12-Month Dividend Run-Rate (DVD) dengan benar', () => {
    // Harga 5000, Yield 10% -> DPS = 500
    // 1 Lot = 100 lembar -> Annual/lot = 50.000, Monthly/lot = ~4.167, Daily/lot = ~137
    const result = analyzeDividendTrap({
      dividendYield: 10.0,
      payoutRatio: 60.0,
      price: 5000,
      dividendStreakYears: 5
    });

    assert.ok(result.runRate);
    assert.strictEqual(result.runRate.yieldPct, 10.0);
    assert.strictEqual(result.runRate.annualDps, 500);
    assert.strictEqual(result.runRate.annualPerLot, 50000);
    assert.strictEqual(result.runRate.monthlyPerLot, Math.round(50000 / 12));
    assert.strictEqual(result.runRate.dailyPerLot, Math.round(50000 / 365));
  });

  it('5. Menangani input ekstrem atau nilai null tanpa error', () => {
    const result = analyzeDividendTrap({
      dividendYield: -5,
      payoutRatio: null,
      fcf: null,
      price: NaN
    });

    assert.strictEqual(result.isDividendPayer, false);
    assert.strictEqual(result.safetyScore, 50);
  });
});

