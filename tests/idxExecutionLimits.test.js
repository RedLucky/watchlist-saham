import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateExecutionLimits,
  countTicksBetween
} from '../src/lib/idxExecutionLimits.js';

describe('Bloomberg ARA / ARB: Auto-Rejection Limits & Tick Distance Suite', () => {
  it('1. Menghitung batas ARA & ARB simetris untuk harga tier 2 (Rp 200 - 5.000, 25%)', () => {
    // Saham harga penutupan kemarin 1.000 (fraksi Rp 5)
    // ARA = 1.000 * 1.25 = 1.250
    // ARB = 1.000 * 0.75 = 750
    const result = calculateExecutionLimits({
      price: 1000,
      prevClose: 1000
    });

    assert.ok(result);
    assert.strictEqual(result.limitPct, 25);
    assert.strictEqual(result.araPrice, 1250);
    assert.strictEqual(result.arbPrice, 750);
  });

  it('2. Menghitung batas ARA 35% untuk saham harga < 200 (Tier 1)', () => {
    // Harga penutupan 100
    // ARA = 100 * 1.35 = 135 (fraksi Rp 1)
    // ARB = 100 * 0.65 = 65 (fraksi Rp 1)
    const result = calculateExecutionLimits({
      price: 100,
      prevClose: 100
    });

    assert.strictEqual(result.limitPct, 35);
    assert.strictEqual(result.araPrice, 135);
    assert.strictEqual(result.arbPrice, 65);
  });

  it('3. Menghitung batas ARA 20% untuk saham harga > 5.000 (Tier 3)', () => {
    // Harga penutupan 10.000 (fraksi Rp 25)
    // ARA = 10.000 * 1.20 = 12.000
    // ARB = 10.000 * 0.80 = 8.000
    const result = calculateExecutionLimits({
      price: 10000,
      prevClose: 10000
    });

    assert.strictEqual(result.limitPct, 20);
    assert.strictEqual(result.araPrice, 12000);
    assert.strictEqual(result.arbPrice, 8000);
  });

  it('4. Menghitung jarak fraksi harga (ticks) secara presisi', () => {
    // Dari 1000 ke 1050 (fraksi Rp 5) -> (1050 - 1000) / 5 = 10 fraksi
    const ticks = countTicksBetween(1000, 1050);
    assert.strictEqual(ticks, 10);

    // Dari 190 ke 210 (melintasi batas tier 200)
    // 190 -> 200 (step 1): 10 ticks
    // 200 -> 210 (step 2): 5 ticks
    // Total = 15 ticks
    const crossTierTicks = countTicksBetween(190, 210);
    assert.strictEqual(crossTierTicks, 15);
  });

  it('5. Mendeteksi status peringatan saat harga mendekati ARA (sisa <= 3 ticks)', () => {
    // Saham prev 1.000 -> ARA 1.250.
    // Misal harga saat ini 1.240 (sisa 2 ticks ke 1.250 karena fraksi 5)
    const result = calculateExecutionLimits({
      price: 1240,
      prevClose: 1000
    });

    assert.strictEqual(result.ticksToARA, 2);
    assert.strictEqual(result.proximity, 'NEAR_ARA');
    assert.ok(result.warningMessage.includes('2 fraksi'));
  });

  it('6. Menghasilkan tangga harga 7 level (Ladder) dengan urutan menurun', () => {
    const result = calculateExecutionLimits({
      price: 2000,
      prevClose: 2000
    });

    assert.ok(Array.isArray(result.ladder));
    assert.ok(result.ladder.length >= 3);
    assert.strictEqual(result.ladder[0].targetPrice, result.araPrice);
    assert.strictEqual(result.ladder[result.ladder.length - 1].targetPrice, result.arbPrice);
  });

  it('7. Menangani input kosong atau tidak valid tanpa crash', () => {
    const result = calculateExecutionLimits({ price: 0, prevClose: 0 });
    assert.strictEqual(result, null);
  });
});
