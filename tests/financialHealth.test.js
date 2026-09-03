/**
 * Unit Test Suite: Modul Financial Health & Valuation (BEI / IDX)
 *
 * Menguji:
 * 1. roundToIdxTick: Pembulatan fraksi harga resmi Bursa Efek Indonesia (5 fraksi)
 * 2. isFinancialSector: Deteksi cerdas & multi-alias sektor perbankan/keuangan
 * 3. calculatePiotroskiFScore: 9 kriteria akuntansi Joseph Piotroski
 * 4. calculateAltmanZScore: Model Emerging Market 4-variabel dan bypass bank
 * 5. calculateGrahamValuation: Intrinsic Value, Graham Number, MoS, sensitivitas SUN yield
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToIdxTick,
  isFinancialSector,
  calculatePiotroskiFScore,
  calculateAltmanZScore,
  calculateGrahamValuation
} from '../src/lib/scoring/financialHealth.js';

describe('1. Fraksi Harga Resmi BEI (roundToIdxTick)', () => {
  test('Harga < Rp 200: Fraksi Rp 1', () => {
    assert.equal(roundToIdxTick(50), 50);
    assert.equal(roundToIdxTick(123.4), 123);
    assert.equal(roundToIdxTick(199.6), 200);
  });

  test('Harga Rp 200 s/d < Rp 500: Fraksi Rp 2', () => {
    assert.equal(roundToIdxTick(201), 202);
    assert.equal(roundToIdxTick(245.8), 246);
    assert.equal(roundToIdxTick(499), 500);
  });

  test('Harga Rp 500 s/d < Rp 2.000: Fraksi Rp 5', () => {
    assert.equal(roundToIdxTick(502), 500);
    assert.equal(roundToIdxTick(503), 505);
    assert.equal(roundToIdxTick(1243), 1245);
    assert.equal(roundToIdxTick(1998), 2000);
  });

  test('Harga Rp 2.000 s/d < Rp 5.000: Fraksi Rp 10', () => {
    assert.equal(roundToIdxTick(2004), 2000);
    assert.equal(roundToIdxTick(2006), 2010);
    assert.equal(roundToIdxTick(3416), 3420);
    assert.equal(roundToIdxTick(4992), 4990);
  });

  test('Harga >= Rp 5.000: Fraksi Rp 25', () => {
    assert.equal(roundToIdxTick(5010), 5000);
    assert.equal(roundToIdxTick(5015), 5025);
    assert.equal(roundToIdxTick(9413), 9425);
    assert.equal(roundToIdxTick(9400), 9400);
  });

  test('Edge cases: input 0, negatif, atau non-finite mengembalikan 0', () => {
    assert.equal(roundToIdxTick(0), 0);
    assert.equal(roundToIdxTick(-100), 0);
    assert.equal(roundToIdxTick(NaN), 0);
  });
});

describe('2. Deteksi Fleksibel Sektor Finansial (isFinancialSector)', () => {
  test('Mendeteksi alias perbankan dan finansial', () => {
    assert.equal(isFinancialSector('Financials'), true);
    assert.equal(isFinancialSector('financials'), true);
    assert.equal(isFinancialSector('Finance'), true);
    assert.equal(isFinancialSector('FINANCIAL SERVICES'), true);
    assert.equal(isFinancialSector('Banking'), true);
    assert.equal(isFinancialSector('Keuangan'), true);
    assert.equal(isFinancialSector('Bank Central Asia'), true);
  });

  test('Menolak sektor non-finansial', () => {
    assert.equal(isFinancialSector('Consumer Non-Cyclicals'), false);
    assert.equal(isFinancialSector('Energy'), false);
    assert.equal(isFinancialSector('Basic Materials'), false);
    assert.equal(isFinancialSector('Technology'), false);
    assert.equal(isFinancialSector(''), false);
    assert.equal(isFinancialSector(null), false);
  });
});

describe('3. Piotroski F-Score (calculatePiotroskiFScore)', () => {
  test('Perusahaan sehat prima menghasilkan skor tinggi (>= 7)', () => {
    const solidCorp = {
      roe: 22,
      roa: 12,
      opm: 25,
      eps: 350,
      freeCashflow: 1500000000,
      operatingCashflow: 2000000000,
      netIncome: 1200000000, // OCF > Net Income (Kualitas akrual baik)
      der: 0.4,
      currentRatio: 2.1,
      revenueGrowth: 15,
      netProfit: [800, 1000, 1200] // Pertumbuhan laba berurutan
    };
    const score = calculatePiotroskiFScore(solidCorp, 'Consumer Non-Cyclicals');
    assert.ok(score >= 8, `Skor harus >= 8, didapat ${score}`);
  });

  test('Perusahaan tertekan / rugi menghasilkan skor rendah (<= 3)', () => {
    const distressedCorp = {
      roe: -10,
      roa: -5,
      opm: -8,
      eps: -50,
      freeCashflow: -500000,
      operatingCashflow: -200000,
      netIncome: -600000,
      der: 4.5,
      currentRatio: 0.6,
      revenueGrowth: -12,
      netProfit: [500, 200, -600]
    };
    const score = calculatePiotroskiFScore(distressedCorp, 'Basic Materials');
    assert.ok(score <= 3, `Skor harus <= 3, didapat ${score}`);
  });

  test('Sektor bank mendapatkan proteksi untuk kriteria DER & Current Ratio', () => {
    const bankData = {
      roe: 18,
      roa: 3.0,
      opm: 40,
      eps: 400,
      operatingCashflow: 5000000000,
      netIncome: 4000000000,
      der: 6.0, // Wajar untuk bank
      currentRatio: 1.1, // Wajar untuk bank
      revenueGrowth: 8,
      netProfit: [3000, 3500, 4000]
    };
    const score = calculatePiotroskiFScore(bankData, 'Financials');
    assert.ok(score >= 7, `Bank sehat harus mendapatkan skor >= 7, didapat ${score}`);
  });
});

describe('4. Altman Z\'\'-Score Emerging Market (calculateAltmanZScore)', () => {
  test('Sektor non-keuangan sehat berada di Zona Aman (> 2.60)', () => {
    const healthyData = {
      currentRatio: 2.2,
      der: 0.35,
      roa: 15,
      opm: 22,
      marketCap: 100000000000,
      totalDebt: 15000000000,
      totalRevenue: 80000000000
    };
    const zScore = calculateAltmanZScore(healthyData, 'Healthcare', 2500);
    assert.ok(zScore > 2.60, `Z-Score harus > 2.60 (Zona Aman), didapat ${zScore}`);
  });

  test('Sektor bank di-bypass dengan nilai default aman 3.0', () => {
    const bankData = { der: 6.5, roe: 20 };
    const zScore = calculateAltmanZScore(bankData, 'Financials', 9800);
    assert.equal(zScore, 3.0);
  });
});

describe('5. Benjamin Graham Valuation & Yield Dinamis (calculateGrahamValuation)', () => {
  const stock = {
    fundamentals: {
      eps: 500,
      bookValue: 2000,
      netProfit: [1000, 1150, 1320, 1500] // CAGR ~14.4%
    },
    price: 4000
  };

  test('Graham Number: sqrt(22.5 * EPS * BVPS) dibulatkan ke fraksi BEI', () => {
    const val = calculateGrahamValuation({ ...stock, bondYield: 6.5 });
    // sqrt(22.5 * 500 * 2000) = sqrt(22,500,000) = 4743.41 -> dibulatkan fraksi Rp 10 -> 4740
    assert.equal(val.grahamNumber, 4740);
  });

  test('Sensitivitas Yield: Yield naik -> Nilai Wajar turun (Inverse Relationship)', () => {
    const valLowYield = calculateGrahamValuation({ ...stock, bondYield: 6.0 });
    const valHighYield = calculateGrahamValuation({ ...stock, bondYield: 7.5 });

    assert.ok(valLowYield.fairValue > valHighYield.fairValue, 'Fair Value pada yield 6% harus lebih tinggi dari yield 7.5%');
    assert.ok(valLowYield.marginOfSafety > valHighYield.marginOfSafety, 'Margin of Safety pada yield 6% harus lebih besar');
  });

  test('CAGR capped maksimum 25% demi prinsip kehati-hatian', () => {
    const hyperGrowth = {
      fundamentals: {
        eps: 100,
        netProfit: [10, 1000] // CAGR ekstrem > 9000%
      },
      price: 1000
    };
    const val = calculateGrahamValuation({ ...hyperGrowth, bondYield: 6.5 });
    assert.equal(val.cappedCagrPercent, 25, 'CAGR valuasi harus dibatasi maksimum 25%');
    assert.ok(val.cagrPercent > 25, 'Raw CAGR historis tetap tersimpan asli');
    assert.ok(val.fairValue > 0);
  });
});
