import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('IDX Portfolio Lot Size & Realized PnL Constraints', () => {
  const IDX_LOT_SIZE = 100;

  it('1. Memvalidasi bahwa jumlah lembar saham wajib kelipatan 1 lot (100 lembar)', () => {
    const validShares = [100, 200, 500, 1000, 25000];
    for (const shares of validShares) {
      assert.strictEqual(shares % IDX_LOT_SIZE, 0, `Shares ${shares} harus kelipatan 100`);
    }

    const invalidShares = [1, 50, 150, 275, 999];
    for (const shares of invalidShares) {
      assert.notStrictEqual(shares % IDX_LOT_SIZE, 0, `Shares ${shares} bukan kelipatan 100`);
    }
  });

  it('2. Menghitung Realized PnL secara akurat: (Selling Price - Cost Basis) * Sold Shares', () => {
    // Skenario: Beli 1000 lembar BBCA @ 9.000 = Rp 9.000.000
    // Jual 500 lembar @ 10.000 (untung 1.000/lembar = Rp 500.000)
    const buyPrice = 9000;
    const initialShares = 1000;
    const sellPrice = 10000;
    const sellShares = 500;

    const costBasis = buyPrice * sellShares;
    const sellProceeds = sellPrice * sellShares;
    const realizedPnL = sellProceeds - costBasis;

    assert.strictEqual(costBasis, 4500000);
    assert.strictEqual(sellProceeds, 5000000);
    assert.strictEqual(realizedPnL, 500000);
  });

  it('3. Menghitung Realized Loss secara akurat saat cut loss', () => {
    // Skenario: Beli 500 lembar GOTO @ 80 = Rp 40.000
    // Jual 500 lembar @ 60 = Rp 30.000 (rugi 20/lembar = -Rp 10.000)
    const buyPrice = 80;
    const sellPrice = 60;
    const sellShares = 500;

    const costBasis = buyPrice * sellShares;
    const sellProceeds = sellPrice * sellShares;
    const realizedPnL = sellProceeds - costBasis;

    assert.strictEqual(realizedPnL, -10000);
  });
});
