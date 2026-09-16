import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateWaccAndEconomicValue } from '../src/lib/waccEngine.js';

describe('Bloomberg WACC & EVA: Economic Value Added Suite', () => {
  it('1. Menghitung WACC dan ROIC dengan benar pada emiten berstruktur modal sehat', () => {
    // Model emiten: Market Cap 100 Triliun, Utang 20 Triliun, Laba Operasi 15 Triliun
    const result = calculateWaccAndEconomicValue({
      marketCap: 100e12,
      totalDebt: 20e12,
      totalEquity: 80e12,
      totalRevenue: 50e12,
      operatingIncome: 15e12,
      beta: 1.0,
      riskFreeRate: 6.5,
      equityRiskPremium: 5.5,
      taxRate: 0.22,
      costOfDebt: 8.0
    });

    assert.ok(result, 'Hasil tidak boleh null');

    // Ke = 6.5 + 1.0 * 5.5 = 12.0%
    assert.strictEqual(result.costOfEquity, 12.0);

    // Kd after tax = 8.0 * (1 - 0.22) = 6.24%
    assert.strictEqual(result.afterTaxCostOfDebt, 6.24);

    // We = 100 / 120 = 83.3%, Wd = 20 / 120 = 16.7%
    // WACC = (0.8333 * 12) + (0.1667 * 6.24) = 10.0 + 1.04 = ~11.04%
    assert.ok(result.wacc >= 10.5 && result.wacc <= 11.5, `WACC harus ~11%, aktual: ${result.wacc}`);

    // NOPAT = 15T * (1 - 0.22) = 11.7 Triliun
    // Invested Capital = 80T + 20T = 100 Triliun
    // ROIC = 11.7 / 100 * 100 = 11.7%
    assert.ok(result.roic >= 11.0 && result.roic <= 12.5, `ROIC harus ~11.7%, aktual: ${result.roic}`);

    // Economic Spread = ROIC - WACC
    assert.ok(Number.isFinite(result.economicSpread));
  });

  it('2. Mengklasifikasikan Super Value Creator saat ROIC jauh di atas WACC', () => {
    // Emiten super profitabel (contoh: consumer goods / bank papan atas dengan margin tinggi)
    const result = calculateWaccAndEconomicValue({
      marketCap: 100e12,
      totalDebt: 5e12,
      totalEquity: 40e12,
      totalRevenue: 60e12,
      operatingIncome: 20e12, // Operating Profit sangat tinggi
      beta: 0.8
    });

    assert.ok(result.economicSpread >= 5.0, 'Spread harus >= 5%');
    assert.strictEqual(result.badgeColor, 'emerald');
    assert.ok(result.verdict.includes('Super Value Creator'));
  });

  it('3. Mengklasifikasikan Value Destroyer saat ROIC di bawah WACC', () => {
    // Emiten utang besar dan laba tipis
    const result = calculateWaccAndEconomicValue({
      marketCap: 20e12,
      totalDebt: 50e12,
      totalEquity: 10e12,
      totalRevenue: 30e12,
      operatingIncome: 2e12, // Laba operasi tipis tertekan beban utang
      beta: 1.4,
      costOfDebt: 10.0
    });

    assert.ok(result.economicSpread < 0, 'Economic spread harus negatif');
    assert.ok(result.verdict.includes('Destroyer'));
  });

  it('4. Menangani emiten tanpa utang (all-equity structure) dengan aman', () => {
    const result = calculateWaccAndEconomicValue({
      marketCap: 50e12,
      totalDebt: 0,
      totalEquity: 50e12,
      totalRevenue: 20e12,
      operatingIncome: 5e12
    });

    assert.ok(result, 'Hasil tidak boleh null');
    assert.strictEqual(result.weightOfDebtPct, 0);
    assert.strictEqual(result.weightOfEquityPct, 100);
    assert.strictEqual(result.wacc, result.costOfEquity);
  });

  it('5. Menangani input kosong atau market cap nol tanpa crash', () => {
    const result = calculateWaccAndEconomicValue({
      marketCap: 0,
      totalDebt: 0
    });
    assert.strictEqual(result, null, 'Harus null jika total capital <= 0');
  });
});
