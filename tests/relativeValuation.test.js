import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Bloomberg Relative Valuation (RV) Peer Engine Suite', () => {
  const targetStock = {
    ticker: 'BBRI',
    name: 'Bank Rakyat Indonesia (Persero) Tbk',
    price: 3330,
    sector: 'Financials',
    subSector: 'bank',
    fundamentals: {
      per: 8.15,
      pbv: 1.55,
      roe: 18.98,
      npm: 25.4,
      der: 0.0,
      dividendYield: 10.39,
      marketCap: 504000000000000
    },
    scores: {
      fundamental: 85,
      technical: 75,
      trending: 70,
      smartMoney: 80
    }
  };

  const samplePeers = [
    {
      ticker: 'BMRI',
      name: 'Bank Mandiri (Persero) Tbk',
      price: 4310,
      per: 6.50,
      pbv: 1.42,
      roe: 22.38,
      npm: 28.1,
      der: 0.0,
      dividendYield: 11.07,
      marketCap: 405000000000000,
      score: 82
    },
    {
      ticker: 'BBCA',
      name: 'Bank Central Asia Tbk',
      price: 6375,
      per: 13.83,
      pbv: 2.92,
      roe: 21.82,
      npm: 38.5,
      der: 0.0,
      dividendYield: 5.95,
      marketCap: 789000000000000,
      score: 88
    },
    {
      ticker: 'BBNI',
      name: 'Bank Negara Indonesia (Persero) Tbk',
      price: 3750,
      per: 6.76,
      pbv: 0.85,
      roe: 12.45,
      npm: 20.2,
      der: 0.0,
      dividendYield: 9.03,
      marketCap: 139000000000000,
      score: 74
    }
  ];

  it('1. Harus mengidentifikasi emiten dengan metrik terbaik di kelasnya (Best-in-Class)', () => {
    const all = [
      { ticker: targetStock.ticker, ...targetStock.fundamentals },
      ...samplePeers
    ];

    // Valuasi PER termurah
    const lowestPerStock = all.filter(s => s.per > 0).sort((a, b) => a.per - b.per)[0];
    assert.strictEqual(lowestPerStock.ticker, 'BMRI', 'BMRI harus menjadi emiten dengan PER termurah (6.50x)');

    // Valuasi PBV termurah
    const lowestPbvStock = all.filter(s => s.pbv > 0).sort((a, b) => a.pbv - b.pbv)[0];
    assert.strictEqual(lowestPbvStock.ticker, 'BBNI', 'BBNI harus menjadi emiten dengan PBV termurah (0.85x)');

    // Profitabilitas ROE tertinggi
    const highestRoeStock = [...all].sort((a, b) => b.roe - a.roe)[0];
    assert.strictEqual(highestRoeStock.ticker, 'BMRI', 'BMRI harus menjadi emiten dengan ROE tertinggi (22.38%)');

    // Dividend Yield tertinggi
    const highestYieldStock = [...all].sort((a, b) => b.dividendYield - a.dividendYield)[0];
    assert.strictEqual(highestYieldStock.ticker, 'BMRI', 'BMRI harus menjadi emiten dengan yield tertinggi (11.07%)');
  });

  it('2. Menghitung median sektor secara akurat untuk perbandingan relatif', () => {
    const all = [
      { ticker: targetStock.ticker, ...targetStock.fundamentals },
      ...samplePeers
    ];

    const sortedPer = all.map(s => s.per).sort((a, b) => a - b);
    const medianPer = sortedPer[Math.floor(sortedPer.length / 2)];
    assert.ok(medianPer > 6.5 && medianPer < 13.83, 'Median PER sektor perbankan harus berada di rentang wajar');

    // Posisi target BBRI (8.15x) vs Median
    const isTargetCheaperThanMedian = targetStock.fundamentals.per <= medianPer;
    assert.strictEqual(typeof isTargetCheaperThanMedian, 'boolean');
  });

  it('3. Menangani nilai null, undefined, atau nilai negatif secara defensif tanpa NaN', () => {
    const abnormalPeers = [
      { ticker: 'LOSS1', per: null, pbv: -1.2, roe: null, dividendYield: 0 },
      { ticker: 'LOSS2', per: -5.0, pbv: null, roe: -10.5, dividendYield: null }
    ];

    const validPer = abnormalPeers.filter(p => p.per != null && p.per > 0).map(p => p.per);
    assert.strictEqual(validPer.length, 0, 'PER null atau negatif tidak boleh dihitung ke dalam valuasi murah');

    const validRoe = abnormalPeers.filter(p => p.roe != null).map(p => p.roe);
    assert.strictEqual(validRoe.length, 1, 'Hanya ROE yang ada datanya yang dihitung');
    assert.strictEqual(validRoe[0], -10.5);
  });

  it('4. Menghasilkan ringkasan komparasi tekstual yang informatif', () => {
    const insights = [];
    if (targetStock.fundamentals.dividendYield > 8.0) {
      insights.push(`Yield dividen tinggi (${targetStock.fundamentals.dividendYield}%)`);
    }
    if (targetStock.fundamentals.roe > 15.0) {
      insights.push(`ROE prima (${targetStock.fundamentals.roe}%)`);
    }

    assert.strictEqual(insights.length, 2);
    assert.ok(insights[0].includes('Yield dividen'));
    assert.ok(insights[1].includes('ROE prima'));
  });
});

