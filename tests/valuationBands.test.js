import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateValuationBands, calculateAllValuationBands } from '../src/lib/valuationBands.js';

describe('Bloomberg PBND: Historical Valuation Bands Suite', () => {
  // Mock 20 historical prices centered around Rp 5.000 with some volatility
  const mockPrices = [
    4200, 4300, 4400, 4500, 4600, 4800, 4900, 5000, 5100, 5200,
    5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 4700, 5100
  ];

  it('1. Harus menghitung Mean, SD, dan kelima pita valuasi (+/-1SD, +/-2SD)', () => {
    const result = calculateValuationBands({
      historicalPrices: mockPrices,
      currentPrice: 5000,
      denominatorValue: 250, // EPS Rp 250 -> PER ~20x
      metricName: 'PE'
    });

    assert.ok(result, 'Hasil tidak boleh null');
    assert.strictEqual(result.metricName, 'PE');
    assert.strictEqual(result.currentMultiple, 20.0);
    assert.ok(result.mean > 0, 'Mean harus bernilai positif');
    assert.ok(result.sd > 0, 'Standar deviasi harus bernilai positif');

    // Cek urutan matematis: -2SD < -1SD < Mean < +1SD < +2SD
    assert.ok(result.bands.minus2Sd < result.bands.minus1Sd);
    assert.ok(result.bands.minus1Sd < result.bands.mean);
    assert.ok(result.bands.mean < result.bands.plus1Sd);
    assert.ok(result.bands.plus1Sd < result.bands.plus2Sd);

    // Cek harga pada pita juga terurut
    assert.ok(result.priceBands.minus2Sd < result.priceBands.minus1Sd);
    assert.ok(result.priceBands.minus1Sd < result.priceBands.mean);
    assert.ok(result.priceBands.mean < result.priceBands.plus1Sd);
    assert.ok(result.priceBands.plus1Sd < result.priceBands.plus2Sd);
  });

  it('2. Mengidentifikasi zona Diskon Ekstrem saat harga berada di bawah -1.5 SD', () => {
    const result = calculateValuationBands({
      historicalPrices: mockPrices,
      currentPrice: 3800, // Sangat murah dibanding rata-rata ~5100
      denominatorValue: 250,
      metricName: 'PE'
    });

    assert.ok(result.zScore <= -1.5, 'Z-Score harus <= -1.5');
    assert.strictEqual(result.zoneColor, 'emerald');
    assert.ok(result.zone.includes('Diskon Ekstrem'));
  });

  it('3. Mengidentifikasi zona Premi Ekstrem saat harga berada di atas +1.5 SD', () => {
    const result = calculateValuationBands({
      historicalPrices: mockPrices,
      currentPrice: 6500, // Sangat mahal dibanding rata-rata
      denominatorValue: 250,
      metricName: 'PE'
    });

    assert.ok(result.zScore >= 1.5, 'Z-Score harus >= 1.5');
    assert.strictEqual(result.zoneColor, 'rose');
    assert.ok(result.zone.includes('Premi Ekstrem'));
  });

  it('4. Menangani input kosong atau data tidak memadai secara aman tanpa crash', () => {
    const emptyResult = calculateValuationBands({
      historicalPrices: [],
      currentPrice: 5000,
      denominatorValue: 200
    });
    assert.strictEqual(emptyResult, null, 'Harus mengembalikan null jika data tidak cukup');

    const zeroDenom = calculateValuationBands({
      historicalPrices: mockPrices,
      currentPrice: 5000,
      denominatorValue: 0
    });
    assert.strictEqual(zeroDenom, null, 'Harus mengembalikan null jika denominator 0');
  });

  it('5. calculateAllValuationBands menghitung PE dan PBV sekaligus', () => {
    const all = calculateAllValuationBands({
      historicalPrices: mockPrices,
      currentPrice: 5000,
      eps: 250,
      bvps: 1200
    });

    assert.ok(all.pe, 'PE bands harus ada');
    assert.ok(all.pbv, 'PBV bands harus ada');
    assert.strictEqual(all.pe.metricName, 'PE');
    assert.strictEqual(all.pbv.metricName, 'PBV');
  });
});

