import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateKseiOwnershipShift } from '../src/lib/kseiShiftEngine.js';

describe('Bloomberg OWN / HDS: KSEI Ownership Shift Suite', () => {
  it('1. Mendeteksi Smart Money Akumulasi Masif saat Institusi bertambah dan Ritel berkurang', () => {
    const kseiLatest = {
      date: '2026-08-31',
      secNum: 1000000000,
      institutionalPercent: 65.5,
      retailPercent: 12.0,
      foreignPercent: 35.0,
      controllerPercent: 55.0,
      freeFloatPercent: 45.0,
      local: { pf: 50000000, mf: 80000000, is: 40000000 }
    };

    const kseiHistory = [
      {
        date: '2026-07-31',
        institutionalPercent: 64.8, // naik +0.7%
        retailPercent: 12.5,        // turun -0.5%
        foreignPercent: 34.5
      }
    ];

    const result = calculateKseiOwnershipShift({ kseiLatest, kseiHistory });

    assert.ok(result);
    assert.strictEqual(result.institutionalPercent, 65.5);
    assert.strictEqual(result.retailPercent, 12.0);
    assert.ok(result.momShift);
    assert.strictEqual(result.momShift.diffInstPct, 0.7);
    assert.strictEqual(result.momShift.diffRetailPct, -0.5);
    assert.ok(result.verdict.includes('Akumulasi Masif'));
    assert.strictEqual(result.badgeColor, 'emerald');
  });

  it('2. Mendeteksi Distribusi ke Ritel saat Institusi melepas kepemilikan', () => {
    const kseiLatest = {
      date: '2026-08-31',
      secNum: 1000000000,
      institutionalPercent: 50.0,
      retailPercent: 25.0
    };

    const kseiHistory = [
      {
        date: '2026-07-31',
        institutionalPercent: 50.8, // turun -0.8%
        retailPercent: 24.3         // ritel naik +0.7%
      }
    ];

    const result = calculateKseiOwnershipShift({ kseiLatest, kseiHistory });
    assert.ok(result.verdict.includes('Distribusi ke Ritel'));
    assert.strictEqual(result.badgeColor, 'rose');
  });

  it('3. Menangani input tanpa riwayat (first time ingest) secara aman', () => {
    const kseiLatest = {
      date: '2026-08-31',
      secNum: 500000000,
      institutionalPercent: 40.0,
      retailPercent: 30.0
    };

    const result = calculateKseiOwnershipShift({ kseiLatest, kseiHistory: [] });
    assert.ok(result);
    assert.strictEqual(result.momShift, null);
    assert.strictEqual(result.verdict, 'Net Neutral / Stabil ⚖️');
  });

  it('4. Menangani input null tanpa error', () => {
    const result = calculateKseiOwnershipShift({});
    assert.strictEqual(result, null);
  });
});

