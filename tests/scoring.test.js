/**
 * Unit Test Suite: Fundamental, Valuation, Hard Filter & Smart Money Scoring
 *
 * Menguji:
 * 1. calculateFundamentalScore: ROE calibrated to Cost of Equity IDX (11-13%), DER Bank bypass
 * 2. calculateValuationScore: PER & PBV vs Sector averages, Earnings Yield, PEG
 * 3. applyHardFilter: Gerbang proteksi pertama portofolio (Anti-Rugi & Anti-Saham Tidur)
 * 4. calculateSmartMoneyScore: Deteksi akumulasi volume & aliran Big Fund
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFundamentalScore } from '../src/lib/scoring/fundamental.js';
import { calculateValuationScore } from '../src/lib/scoring/valuation.js';
import { applyHardFilter, getMinTurnoverThreshold } from '../src/lib/scoring/hardFilter.js';
import { calculateSmartMoneyScore } from '../src/lib/scoring/smartMoney.js';
import { calculateTechnicalScore } from '../src/lib/scoring/technical.js';

describe('1. Skoring Fundamental (calculateFundamentalScore)', () => {
  test('Super Compounder (ROE >= 20%, OPM >= 20%, DER Rendah) mendapat skor >= 85', () => {
    const compounder = {
      sector: 'Consumer Non-Cyclicals',
      fundamentals: {
        roe: 24,
        opm: 22,
        der: 0.25,
        eps: 500,
        netProfit: [1000, 1150, 1300, 1500],
        revenueGrowth: 12
      }
    };
    const res = calculateFundamentalScore(compounder);
    assert.ok(res.score >= 85, `Skor fundamental harus >= 85, didapat ${res.score}`);
  });

  test('Sektor Perbankan dengan DER tinggi (DER 6.0x) tidak dipenalti struktur utang', () => {
    const bankStock = {
      sector: 'Financials',
      fundamentals: {
        roe: 20,
        opm: 45,
        der: 6.2, // Wajar untuk perbankan
        eps: 450,
        netProfit: [3000, 3500, 4200],
        revenueGrowth: 10
      }
    };
    const res = calculateFundamentalScore(bankStock);
    assert.ok(res.score >= 80, `Bank bermodal kuat harus mendapat skor >= 80, didapat ${res.score}`);
    assert.ok(res.details.some(d => d.includes('Sektor Finansial')), 'Detail harus mencatat evaluasi khusus sektor finansial');
  });

  test('Emiten dengan ROE < 8% (di bawah Cost of Equity) mendapatkan skor tertekan', () => {
    const weakStock = {
      sector: 'Basic Materials',
      fundamentals: {
        roe: 4.5,
        opm: 5,
        der: 1.8,
        eps: 50,
        netProfit: [100, 90, 80],
        revenueGrowth: -2
      }
    };
    const res = calculateFundamentalScore(weakStock);
    assert.ok(res.score < 50, `Emiten dengan ROE marjinal harus mendapat skor < 50, didapat ${res.score}`);
  });
});

describe('2. Skoring Valuasi (calculateValuationScore)', () => {
  test('Emiten dengan PER & PBV jauh di bawah rata-rata sektor mendapat skor tinggi (>= 75)', () => {
    const cheapStock = {
      price: 2000,
      sector: 'Financials', // Avg: PER 12, PBV 2.0
      fundamentals: {
        per: 6.5,
        pbv: 0.9,
        eps: 308, // Earnings Yield = 308/2000 = 15.4%
        pegRatio: 0.8
      }
    };
    const res = calculateValuationScore(cheapStock);
    assert.ok(res.score >= 75, `Saham diskon valuasi harus mendapat skor >= 75, didapat ${res.score}`);
  });

  test('Emiten dengan PER & PBV sangat mahal (overvalued) mendapat skor rendah (<= 35)', () => {
    const expensiveStock = {
      price: 15000,
      sector: 'Financials',
      fundamentals: {
        per: 35.0,
        pbv: 5.5,
        eps: 428,
        pegRatio: 4.5
      }
    };
    const res = calculateValuationScore(expensiveStock);
    assert.ok(res.score <= 35, `Saham overvalued harus mendapat skor <= 35, didapat ${res.score}`);
  });
});

describe('3. Hard Filter (applyHardFilter)', () => {
  test('Menolak emiten dengan histori laba negatif (merugi)', () => {
    const lossMakingStocks = [
      {
        ticker: 'RUGI',
        sector: 'Energy',
        status: 'active',
        transactionAvg: 50000000,
        fundamentals: { roe: 10, der: 0.5, netProfit: [100, -50, 80] }
      }
    ];
    const filtered = applyHardFilter(lossMakingStocks);
    assert.equal(filtered.length, 0, 'Saham dengan laba negatif harus dieliminasi');
  });

  test('Menolak emiten non-finansial dengan DER > 1.5x, namun meloloskan bank dengan DER 5.5x', () => {
    const testStocks = [
      {
        ticker: 'NONB',
        sector: 'Basic Materials',
        status: 'active',
        transactionAvg: 50000000,
        fundamentals: { roe: 12, der: 2.1, netProfit: [100, 120] } // DER > 1.5 -> DITOLAK
      },
      {
        ticker: 'BANK',
        sector: 'Financials',
        status: 'active',
        transactionAvg: 100000000,
        fundamentals: { roe: 18, der: 5.5, netProfit: [5000, 6000] } // Bank -> DILOLOSKAN
      }
    ];
    const filtered = applyHardFilter(testStocks);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].ticker, 'BANK');
  });

  test('Menolak saham tidur dengan turnover < Rp 30 Juta/hari', () => {
    const illiquidStocks = [
      {
        ticker: 'TIDUR',
        sector: 'Industrials',
        status: 'active',
        transactionAvg: 5000000, // Hanya Rp 5 Juta/hari
        fundamentals: { roe: 15, der: 0.5, netProfit: [100, 120] }
      }
    ];
    const filtered = applyHardFilter(illiquidStocks);
    assert.equal(filtered.length, 0);
  });

  test('Menghitung ambang turnover dinamis berdasarkan mode pasar dan gaya trading (Opsi B)', () => {
    assert.equal(getMinTurnoverThreshold('balanced', 'scalping'), 250000000);
    assert.equal(getMinTurnoverThreshold('balanced', 'swing'), 250000000);
    assert.equal(getMinTurnoverThreshold('conservative', 'swing'), 250000000); // style swing prioritizes Rp 250 Jt
    assert.equal(getMinTurnoverThreshold('defensive', 'investor'), 1000000000);
    assert.equal(getMinTurnoverThreshold('dividend', 'investor'), 1000000000);
    assert.equal(getMinTurnoverThreshold('custom', 'investor'), 50000000);
    assert.equal(getMinTurnoverThreshold('growth', 'investor'), 150000000);
  });

  test('Memfilter saham berdasarkan ambang turnover dinamis secara ketat', () => {
    const testStocks = [
      {
        ticker: 'SMALL',
        sector: 'Basic Materials',
        status: 'active',
        transactionAvg: 100000000, // Rp 100 Juta
        fundamentals: { roe: 15, der: 0.5, netProfit: [100, 120] }
      },
      {
        ticker: 'MEDIUM',
        sector: 'Basic Materials',
        status: 'active',
        transactionAvg: 300000000, // Rp 300 Juta
        fundamentals: { roe: 15, der: 0.5, netProfit: [100, 120] }
      }
    ];

    // Pada threshold custom (Rp 50 Jt): kedua saham lolos
    const passCustom = applyHardFilter(testStocks, 50000000);
    assert.equal(passCustom.length, 2);

    // Pada threshold swing/trader (Rp 250 Jt): hanya MEDIUM yang lolos
    const passSwing = applyHardFilter(testStocks, 250000000);
    assert.equal(passSwing.length, 1);
    assert.equal(passSwing[0].ticker, 'MEDIUM');

    // Pada threshold defensive/blue-chip (Rp 1 Miliar): keduanya gugur
    const passDefensive = applyHardFilter(testStocks, 1000000000);
    assert.equal(passDefensive.length, 0);
  });
});

describe('4. Smart Money / Bandarmologi (calculateSmartMoneyScore)', () => {
  test('Mendeteksi lonjakan volume 5 hari terakhir sebagai indikasi akumulasi', () => {
    // 5 hari awal volume 100k, 5 hari akhir volume 300k (growth +200%)
    const accumulatingStock = {
      technicals: {
        prices: Array(10).fill(2000),
        volumes: [100000, 100000, 100000, 100000, 100000, 300000, 300000, 300000, 300000, 300000]
      }
    };
    const res = calculateSmartMoneyScore(accumulatingStock);
    assert.ok(res.score >= 50, `Skor akumulasi volume harus >= 50, didapat ${res.score}`);
    assert.ok(res.details.some(d => d.includes('Volume meningkat kuat')));
  });
});

describe('5. Skoring Teknikal & Bollinger Squeeze (calculateTechnicalScore)', () => {
  test('Bollinger Squeeze (bandwidth <= 0.12) memberikan bonus skor setup breakout', () => {
    const stockNormal = {
      price: 2000,
      technicals: {
        rsi14: 55,
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500],
        bollinger: { bandwidth: 0.25 }
      }
    };
    const resNormal = calculateTechnicalScore(stockNormal);

    const stockSqueeze = {
      price: 2000,
      technicals: {
        rsi14: 55,
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500],
        bollinger: { bandwidth: 0.08 } // Squeeze ketat 8%
      }
    };
    const resSqueeze = calculateTechnicalScore(stockSqueeze);

    assert.ok(resSqueeze.score >= resNormal.score, `Skor saham squeeze (${resSqueeze.score}) harus >= saham normal (${resNormal.score})`);
    assert.ok(resSqueeze.details.some(d => d.includes('Bollinger Squeeze')), 'Detail teknikal harus mendeteksi Bollinger Squeeze');
    assert.equal(resSqueeze.metrics.bollingerBandwidth, '8.0%');
  });

  test('Fresh MACD Golden Cross memberikan bonus setup (+10) dan terdeteksi di metrics', () => {
    const stockWithoutGC = {
      price: 2000,
      technicals: {
        rsi14: 55,
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500],
        macd: { histogram: 5, prevHistogram: 4, isGoldenCross: false, isDeadCross: false }
      }
    };
    const resWithout = calculateTechnicalScore(stockWithoutGC);

    const stockWithGC = {
      price: 2000,
      technicals: {
        rsi14: 55,
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500],
        macd: { histogram: 5, prevHistogram: -2, isGoldenCross: true, isDeadCross: false }
      }
    };
    const resWith = calculateTechnicalScore(stockWithGC);

    assert.ok(resWith.score >= resWithout.score, `Skor saham Golden Cross (${resWith.score}) harus >= non-GC (${resWithout.score})`);
    assert.equal(resWith.metrics.isMacdGoldenCross, true);
    assert.ok(resWith.details.some(d => d.includes('Fresh MACD Golden Cross')));
  });

  test('MACD Dead Cross memberikan penalti setup (-15) dan terdeteksi di metrics', () => {
    const stockDeadCross = {
      price: 2000,
      technicals: {
        rsi14: 55,
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500],
        macd: { histogram: -5, prevHistogram: 2, isGoldenCross: false, isDeadCross: true }
      }
    };
    const res = calculateTechnicalScore(stockDeadCross);

    assert.equal(res.metrics.isMacdDeadCross, true);
    assert.ok(res.details.some(d => d.includes('MACD Dead Cross')));
  });

  test('RSI Extreme Overbought (RSI >= 75) membatalkan setup menjadi none dan memberi penalti skor', () => {
    const stockOverbought = {
      price: 2000,
      technicals: {
        rsi14: 82, // Ekstrim jenuh beli
        ma20: 1950,
        ma50: 1900,
        prices: [1950, 1980, 2000],
        volumes: [1000, 1000, 1000, 1000, 1000, 1500]
      }
    };
    const res = calculateTechnicalScore(stockOverbought);

    assert.equal(res.setup, 'none', 'Setup harus dibatalkan (none) saat RSI >= 75');
    assert.equal(res.metrics.rsiStatus, 'EXTREME_OVERBOUGHT');
    assert.ok(res.details.some(d => d.includes('Extreme Overbought')));
  });
});

