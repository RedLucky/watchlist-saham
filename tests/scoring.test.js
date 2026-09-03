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
import { applyHardFilter } from '../src/lib/scoring/hardFilter.js';
import { calculateSmartMoneyScore } from '../src/lib/scoring/smartMoney.js';

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
