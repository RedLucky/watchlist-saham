import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateVolumeProfile } from '../src/lib/volumeProfileEngine.js';

describe('Bloomberg GP: Volume Profile & Value Area Suite', () => {
  it('1. Menghitung POC (Point of Control) dan Value Area (VAH & VAL) secara akurat', () => {
    // Model harga 1000 s/d 1100 dengan konsentrasi volume terbesar di harga 1050
    const prices =  [1000, 1020, 1040, 1050, 1050, 1050, 1060, 1080, 1100];
    const volumes = [100,  200,  500,  5000, 6000, 4000, 800,  300,  100];

    const result = calculateVolumeProfile({
      prices,
      volumes,
      currentPrice: 1055,
      numBins: 10
    });

    assert.ok(result);
    assert.ok(result.pocPrice >= 1040 && result.pocPrice <= 1060, `POC harus ~1050, aktual: ${result.pocPrice}`);
    assert.ok(result.vahPrice >= result.pocPrice, 'VAH harus >= POC');
    assert.ok(result.valPrice <= result.pocPrice, 'VAL harus <= POC');
    assert.strictEqual(result.badgeColor, 'blue');
    assert.ok(result.positionStatus.includes('Value Area'));
  });

  it('2. Mengidentifikasi Bullish Breakout saat harga diperdagangkan di atas VAH', () => {
    const prices =  [1000, 1010, 1020, 1030, 1040, 1050];
    const volumes = [100,  200,  3000, 4000, 500,  200];

    // Current price di 1100 (jauh di atas konsentrasi volume)
    const result = calculateVolumeProfile({
      prices,
      volumes,
      currentPrice: 1100
    });

    assert.strictEqual(result.badgeColor, 'emerald');
    assert.ok(result.positionStatus.includes('Di Atas Value Area'));
  });

  it('3. Menangani data kosong atau tidak cukup (<5 bar) secara aman', () => {
    const result = calculateVolumeProfile({
      prices: [1000, 1010],
      volumes: [100, 200]
    });

    assert.strictEqual(result, null);
  });
});
