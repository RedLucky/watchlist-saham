/**
 * Unit Test Suite: Modul Perhitungan & Skoring Dividen (BEI / IDX)
 *
 * Menguji:
 * 1. calculateRawDividendYield: Akumulasi TTM DPS (Interim + Final), Layer 1-3, Sanity Guard
 * 2. calculateDividendScore: Bobot Yield (50%), Payout Ratio (30%), Consistency Streak (20%)
 * 3. Normalisasi Mata Uang Emiten Pelapor USD (ADRO, ITMG, dsb)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRawDividendYield, calculateDividendScore } from '../src/lib/scoring/dividend.js';

describe('1. Raw TTM Dividend Yield (calculateRawDividendYield)', () => {
  const now = new Date();
  const dateStr = (monthsAgo) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toISOString().split('T')[0];
  };

  test('Layer 1: Akumulasi dividen 12 bulan terakhir (Interim + Final) dibagi harga pasar', () => {
    const stock = {
      price: 5000,
      dividendHistory: [
        { TanggalCum: dateStr(3), CashDividenPerSaham: 100, MataUang: 'IDR' }, // Interim Rp 100
        { TanggalCum: dateStr(8), CashDividenPerSaham: 150, MataUang: 'IDR' }, // Final Rp 150 (Total TTM = 250)
        { TanggalCum: dateStr(18), CashDividenPerSaham: 200, MataUang: 'IDR' } // 18 bulan lalu (di luar 12 bulan)
      ],
      fundamentals: {}
    };

    const yieldVal = calculateRawDividendYield(stock);
    // Total TTM DPS = 250 -> Yield = (250 / 5000) * 100 = 5.0%
    assert.equal(yieldVal, 5.0);
  });

  test('Sanity Guard: Membatasi yield anomali ekstrem korporasi > 35%', () => {
    const stockWithExtremeDiv = {
      price: 1000,
      dividendHistory: [
        { TanggalCum: dateStr(2), CashDividenPerSaham: 800, MataUang: 'IDR' } // 80% yield!
      ],
      fundamentals: {
        dividendYield: 8.0 // Summary wajar
      }
    };

    const yieldVal = calculateRawDividendYield(stockWithExtremeDiv);
    // Sanity guard: fallback ke summary wajar (8%) atau max 30%
    assert.ok(yieldVal <= 30, `Yield ekstrem harus disanitasi <= 30%, didapat ${yieldVal}`);
  });

  test('Saham tanpa riwayat dividen menghasilkan 0%', () => {
    const growthStock = {
      price: 2000,
      dividendHistory: [],
      fundamentals: {}
    };
    const yieldVal = calculateRawDividendYield(growthStock);
    assert.equal(yieldVal, 0);
  });
});

describe('2. Sistem Skoring Dividen 0-100 (calculateDividendScore)', () => {
  const now = new Date();
  const dateStr = (monthsAgo) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toISOString().split('T')[0];
  };

  test('Dividend Aristocrat (Yield tinggi, Payout seimbang, Streak >= 5 thn) mendapat skor >= 85', () => {
    const aristocrat = {
      price: 5000,
      dividendHistory: [
        { TanggalCum: dateStr(4), CashDividenPerSaham: 350, MataUang: 'IDR' } // 7% yield
      ],
      fundamentals: {
        payoutRatio: 55, // Sehat (30-85%)
        dividendStreakYears: 7 // Prima (>= 5 thn)
      }
    };

    const result = calculateDividendScore(aristocrat);
    assert.ok(result.score >= 85, `Skor dividen aristocrat harus >= 85, didapat ${result.score}`);
    assert.equal(result.metrics.dividendYield, 7.0);
    assert.equal(result.metrics.streakYears, 7);
  });

  test('Saham menahan laba (No dividend) mendapat skor 0', () => {
    const zeroDivStock = {
      price: 3000,
      dividendHistory: [],
      fundamentals: {
        payoutRatio: 0,
        dividendStreakYears: 0
      }
    };

    const result = calculateDividendScore(zeroDivStock);
    assert.equal(result.score, 0);
    assert.equal(result.metrics.dividendYield, 0);
  });

  test('Payout ratio tidak berkelanjutan (> 92%) mendapat penalti risiko', () => {
    const dangerousStock = {
      price: 1000,
      dividendHistory: [
        { TanggalCum: dateStr(2), CashDividenPerSaham: 60, MataUang: 'IDR' } // 6% yield
      ],
      fundamentals: {
        payoutRatio: 140, // Membagikan lebih dari laba bersih (berbahaya)
        dividendStreakYears: 1
      }
    };

    const result = calculateDividendScore(dangerousStock);
    // Skor yield 100 * 0.5 = 50, payout ratio hanya 30 * 0.3 = 9, streak 1 thn 15 * 0.2 = 3 -> Total ~62
    assert.ok(result.score < 75, `Saham dengan payout berisiko harus tertekan di bawah 75, didapat ${result.score}`);
  });
});
