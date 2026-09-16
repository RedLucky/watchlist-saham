import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBrokerConcentration } from '../src/lib/brokerConcentrationEngine.js';

describe('Bloomberg BRKR: Broker Concentration & Bandarmologi Suite', () => {
  it('1. Menghitung rasio konsentrasi CR1, CR3, CR5 dengan benar', () => {
    const result = calculateBrokerConcentration({
      brokerData: {
        cr1: 30.0,
        cr3: 65.0,
        cr5: 80.0,
        bfi: 25.0
      }
    });

    assert.ok(result);
    assert.strictEqual(result.cr3, 65.0);
    assert.strictEqual(result.isConcentrated, true);
    assert.strictEqual(result.verdict, 'Akumulasi Masif (Big Accumulation) 🐋');
    assert.strictEqual(result.badgeColor, 'emerald');
  });

  it('2. Mengestimasi konsentrasi dari dinamika volume jika data broker eksplisit kosong', () => {
    const result = calculateBrokerConcentration({
      technicals: {
        volumes: [1000, 1200, 1100, 1500, 5000] // lonjakan volume
      }
    });

    assert.ok(result);
    assert.ok(result.cr3 > 40);
    assert.ok(result.cr1 < result.cr3);
    assert.ok(result.cr5 > result.cr3);
  });

  it('3. Menangani input kosong tanpa crash', () => {
    const result = calculateBrokerConcentration({});
    assert.ok(result);
    assert.strictEqual(result.cr3, 45.0);
  });
});

