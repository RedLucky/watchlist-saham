import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculatePortfolioRisk } from '../src/lib/portfolioRiskEngine.js';

describe('Bloomberg PORT & MARS: Portfolio Risk & Stress Testing Suite', () => {
  it('1. Menghitung Weighted Beta dan VaR 95% secara akurat', () => {
    // Portofolio 2 saham:
    // Saham A: 100 lembar @ 5.000 = Rp 500.000, beta 1.2
    // Saham B: 100 lembar @ 5.000 = Rp 500.000, beta 0.8
    // Total = Rp 1.000.000, Weighted Beta = 0.5 * 1.2 + 0.5 * 0.8 = 1.0
    const positions = [
      { ticker: 'BBCA', shares: 100, currentPrice: 5000, beta: 1.2, sector: 'Financials' },
      { ticker: 'TLKM', shares: 100, currentPrice: 5000, beta: 0.8, sector: 'Infrastructure' }
    ];

    const result = calculatePortfolioRisk({ positions });

    assert.ok(result);
    assert.strictEqual(result.totalValue, 1000000);
    assert.strictEqual(result.holdingCount, 2);
    assert.strictEqual(result.weightedBeta, 1.0);
    assert.strictEqual(result.riskProfile, 'Market Neutral / Balanced ⚖️');
    assert.strictEqual(result.topConcentrationPct, 50.0);

    // VaR 95% 1-day = 1.645 * 1.5% * 1.0 = ~2.47% -> Rp 24.675
    assert.ok(result.var95.pct > 2.0 && result.var95.pct < 3.0);
    assert.ok(result.var95.nominal > 20000 && result.var95.nominal < 30000);
  });

  it('2. Menghasilkan 4 Skenario Stress Testing (MARS) dengan perhitungan realistis', () => {
    const positions = [
      { ticker: 'ADRO', shares: 1000, currentPrice: 3000, beta: 1.5, sector: 'Energy', der: 0.4 },
      { ticker: 'BBRI', shares: 1000, currentPrice: 4500, beta: 1.1, sector: 'Financials', der: 5.5 }
    ];

    const result = calculatePortfolioRisk({ positions });

    assert.ok(result.stressScenarios);
    assert.strictEqual(result.stressScenarios.length, 4);

    // Skenario IHSG Crash: dampaknya negatif
    const crashScenario = result.stressScenarios.find(s => s.id === 'crash_ihsg');
    assert.ok(crashScenario.impactPct < 0);
    assert.ok(crashScenario.nominalImpact < 0);
    assert.strictEqual(crashScenario.projectedValue, result.totalValue + crashScenario.nominalImpact);

    // Skenario Commodity Shock: mendongkrak ADRO (Energy)
    const commodityScenario = result.stressScenarios.find(s => s.id === 'commodity_shock');
    assert.ok(commodityScenario.impactPct > 0);
  });

  it('3. Memberikan peringatan saat portofolio terlalu terkonsentrasi pada 1 saham (>35%)', () => {
    const positions = [
      { ticker: 'BREN', shares: 900, currentPrice: 1000, beta: 1.8, sector: 'Energy' }, // 90%
      { ticker: 'BBCA', shares: 100, currentPrice: 1000, beta: 0.9, sector: 'Financials' } // 10%
    ];

    const result = calculatePortfolioRisk({ positions });
    assert.strictEqual(result.topHolding, 'BREN');
    assert.strictEqual(result.topConcentrationPct, 90.0);
    assert.ok(result.warnings.some(w => w.includes('Konsentrasi tinggi')));
  });

  it('4. Menangani input kosong atau posisi tanpa nilai secara aman tanpa error', () => {
    const emptyResult = calculatePortfolioRisk({ positions: [] });
    assert.strictEqual(emptyResult, null);

    const zeroResult = calculatePortfolioRisk({
      positions: [{ ticker: 'TEST', shares: 0, currentPrice: 0 }]
    });
    assert.strictEqual(zeroResult, null);
  });
});
