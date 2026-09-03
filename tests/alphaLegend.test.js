/**
 * Unit Test Suite: Alpha Legends Strategy Engine (10 Tokoh Investor Dunia)
 *
 * Menguji:
 * 1. Warren Buffett (Wide Moat & High ROE Compounders)
 * 2. Ben Graham Enterprising (Deep Value & Diskon Aset)
 * 3. Peter Lynch Slow Growers (Dividend Champions)
 * 4. Peter Lynch Fast Growers (High Growth & PEG Ratio)
 * 5. Penetapan maxMatchScore dan bestLegend
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlphaLegends } from '../src/lib/alphaLegendEngine.js';

describe('1. Alpha Legends Match Score Engine (evaluateAlphaLegends)', () => {
  test('Warren Buffett: Emiten Wide Moat & ROE tinggi mendapat Match Score >= 85%', () => {
    const moatStock = {
      symbol: 'MOAT',
      name: 'Moat Consumer Corp',
      sector: 'Consumer Non-Cyclicals',
      price: 8000,
      roe: 25, // Target >= 15%
      opm: 28, // Target >= 15%
      der: 0.3, // Target <= 1.0
      profitGrowth: 12, // Target >= 8%
      per: 16, // Target <= 20
      pbv: 3.2, // Target <= 3.5
      eps: 500
    };

    const [res] = evaluateAlphaLegends([moatStock]);
    const buffett = res.evaluationDetails.buffett;

    assert.ok(buffett.matchScore >= 85, `Buffett Match Score harus >= 85%, didapat ${buffett.matchScore}%`);
    assert.equal(buffett.pass, true);
    assert.equal(res.passedFormulaKeys.includes('buffett'), true);
  });

  test('Ben Graham Enterprising: Saham Deep Value (PER <= 10, PBV <= 1.0) mendapat Match Score >= 80%', () => {
    const deepValueStock = {
      symbol: 'BARG',
      name: 'Bargain Asset Corp',
      sector: 'Industrials',
      price: 1500,
      per: 7.5, // Target <= 10
      pbv: 0.65, // Target <= 1.0 (Diskon aset)
      der: 0.4, // Target <= 1.0
      roe: 10, // Target >= 8%
      eps: 200
    };

    const [res] = evaluateAlphaLegends([deepValueStock]);
    const graham = res.evaluationDetails.graham_enterprising;

    assert.ok(graham.matchScore >= 80, `Graham Enterprising Match Score harus >= 80%, didapat ${graham.matchScore}%`);
    assert.equal(graham.pass, true);
  });

  test('Peter Lynch Slow Growers: Saham Dividen Champions (Yield >= 6%, Streak >= 5 thn) mendapat Match Score >= 80%', () => {
    const divChampion = {
      symbol: 'CHAMP',
      name: 'Dividend Champion Corp',
      sector: 'Energy',
      price: 3500,
      divYield: 7.5, // Target >= 6%
      dividendStreakYears: 8, // Target >= 5 Thn
      per: 9.5, // Target <= 15
      der: 0.5 // Target <= 1.2
    };

    const [res] = evaluateAlphaLegends([divChampion]);
    const lynchSlow = res.evaluationDetails.lynch_slow;

    assert.ok(lynchSlow.matchScore >= 80, `Lynch Slow Growers Match Score harus >= 80%, didapat ${lynchSlow.matchScore}%`);
    assert.equal(lynchSlow.pass, true);
  });

  test('Penetapan maxMatchScore dan bestLegend bekerja dengan akurat', () => {
    const testStock = {
      symbol: 'TEST',
      name: 'Test Stock Corp',
      sector: 'Consumer Non-Cyclicals',
      price: 5000,
      roe: 26,
      opm: 30,
      der: 0.2,
      profitGrowth: 15,
      per: 14,
      pbv: 2.8,
      eps: 350,
      divYield: 3.5,
      dividendStreakYears: 3
    };

    const [res] = evaluateAlphaLegends([testStock]);
    assert.ok(res.maxMatchScore >= 85, `maxMatchScore harus >= 85, didapat ${res.maxMatchScore}`);
    assert.ok(typeof res.bestLegend === 'string' && res.bestLegend.length > 0, 'bestLegend harus berupa string tokoh investor');
  });
});
