import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateSectorRrg, QUADRANTS } from '../src/lib/sectorRrgEngine.js';

describe('Bloomberg RRG / SECT: Relative Rotation Graph Suite', () => {
  it('1. Mengklasifikasikan 4 kuadran rotasi sektoral dengan tepat', () => {
    const mockSectors = {
      Financials: { return5d: 3.0, volumeGrowth: 1.5, winnersRatio: 0.8 }, // Leading (RS > 100, Mom > 100)
      Energy: { return5d: 2.0, volumeGrowth: 0.7, winnersRatio: 0.2 },     // Weakening (RS > 100, Mom < 100)
      Technology: { return5d: -3.0, volumeGrowth: 0.8, winnersRatio: 0.3 }, // Lagging (RS < 100, Mom < 100)
      Healthcare: { return5d: -1.0, volumeGrowth: 1.6, winnersRatio: 0.9 }, // Improving (RS < 100, Mom > 100)
    };

    const results = calculateSectorRrg({
      sectorPerformance: mockSectors,
      benchmarkReturn: 0
    });

    assert.strictEqual(results.length, 4);

    const financials = results.find(s => s.sector === 'Financials');
    const energy = results.find(s => s.sector === 'Energy');
    const technology = results.find(s => s.sector === 'Technology');
    const healthcare = results.find(s => s.sector === 'Healthcare');

    assert.strictEqual(financials.quadrant, QUADRANTS.LEADING);
    assert.strictEqual(financials.badgeColor, 'emerald');
    assert.ok(financials.rsRatio > 100);
    assert.ok(financials.rsMomentum > 100);

    assert.strictEqual(energy.quadrant, QUADRANTS.WEAKENING);
    assert.strictEqual(energy.badgeColor, 'amber');
    assert.ok(energy.rsRatio > 100);
    assert.ok(energy.rsMomentum < 100);

    assert.strictEqual(technology.quadrant, QUADRANTS.LAGGING);
    assert.strictEqual(technology.badgeColor, 'rose');
    assert.ok(technology.rsRatio < 100);
    assert.ok(technology.rsMomentum < 100);

    assert.strictEqual(healthcare.quadrant, QUADRANTS.IMPROVING);
    assert.strictEqual(healthcare.badgeColor, 'blue');
    assert.ok(healthcare.rsRatio < 100);
    assert.ok(healthcare.rsMomentum > 100);
  });

  it('2. Menghitung excess return dan sorting berdasarkan RS-Ratio descending', () => {
    const mockSectors = {
      S1: { return5d: 1.0, volumeGrowth: 1.0, winnersRatio: 0.5 },
      S2: { return5d: 5.0, volumeGrowth: 1.0, winnersRatio: 0.5 },
      S3: { return5d: -2.0, volumeGrowth: 1.0, winnersRatio: 0.5 },
    };

    const results = calculateSectorRrg({
      sectorPerformance: mockSectors,
      benchmarkReturn: 1.0
    });

    assert.strictEqual(results[0].sector, 'S2');
    assert.strictEqual(results[0].excessReturn, 4.0);
    assert.strictEqual(results[1].sector, 'S1');
    assert.strictEqual(results[1].excessReturn, 0.0);
    assert.strictEqual(results[2].sector, 'S3');
    assert.strictEqual(results[2].excessReturn, -3.0);
  });

  it('3. Menangani input kosong atau undefined dengan aman', () => {
    const res1 = calculateSectorRrg({});
    const res2 = calculateSectorRrg({ sectorPerformance: null });

    assert.deepStrictEqual(res1, []);
    assert.deepStrictEqual(res2, []);
  });
});
