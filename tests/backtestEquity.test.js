import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_CAPITAL,
  buildEquityCurve,
  getEquityRange,
  toSvgCoords,
  toPathData,
  closeAreaPath,
  summarizeTrades,
} from '../src/lib/backtestEquity.js';

const TRADES = [
  { pnlPercent: 10, exitDate: '2026-01-10' },
  { pnlPercent: -5, exitDate: '2026-02-10' },
  { pnlPercent: 20, exitDate: '2026-03-10' },
];

test('buildEquityCurve', async (t) => {
  await t.test('titik pertama adalah modal awal sebelum trade', () => {
    const curve = buildEquityCurve([]);
    assert.equal(curve.points.length, 1);
    assert.deepEqual(curve.points[0], { step: 0, date: 'Mulai', capital: INITIAL_CAPITAL, drawdown: 0 });
  });

  await t.test('modal berlipatCompound setiap trade', () => {
    const curve = buildEquityCurve(TRADES);
    // 10.000.000 -> 11.000.000 -> 10.450.000 -> 12.540.000
    assert.deepEqual(curve.points.map((p) => p.capital), [INITIAL_CAPITAL, 11_000_000, 10_450_000, 12_540_000]);
    assert.equal(curve.finalCapital, 12_540_000);
    assert.equal(curve.peakCapital, 12_540_000);
  });

  await t.test('drawdown diukur dari puncak berjalan', () => {
    const curve = buildEquityCurve(TRADES);
    // After the -5% trade: (11.0jt - 10.45jt) / 11.0jt = 5%
    assert.equal(curve.points[2].drawdown, 5);
    assert.equal(curve.maxDrawdown, 5);
  });

  await t.test('netReturn dihitung dari modal awal', () => {
    const curve = buildEquityCurve(TRADES);
    assert.equal(Number(curve.netReturn.toFixed(2)), 25.4);
  });

  await t.test('modal awal kustom dihormati', () => {
    const curve = buildEquityCurve([{ pnlPercent: 100 }], 1_000_000);
    assert.equal(curve.finalCapital, 2_000_000);
    assert.equal(curve.netReturn, 100);
  });

  await t.test('tanggal keluar dipakai, lalu tanggal masuk sebagai cadangan', () => {
    const curve = buildEquityCurve([{ pnlPercent: 1, exitDate: 'X', entryDate: 'Y' }, { pnlPercent: 1, entryDate: 'Z' }]);
    assert.equal(curve.points[1].date, 'X');
    assert.equal(curve.points[2].date, 'Z');
  });
});

test('getEquityRange', async (t) => {
  await t.test('membuat ruang 5% di atas dan bawah modal awal', () => {
    const range = getEquityRange([INITIAL_CAPITAL]);
    assert.equal(range.min, INITIAL_CAPITAL * 0.95);
    assert.equal(range.max, INITIAL_CAPITAL * 1.05);
  });

  await t.test('range tidak pernah nol (menghindari divide by zero)', () => {
    // With a flat curve the padding still applies, so ask for the degenerate case directly.
    assert.equal(getEquityRange([INITIAL_CAPITAL]).range > 0, true);
    const flat = getEquityRange([], INITIAL_CAPITAL);
    assert.ok(flat.range > 0, 'range harus selalu positif');
  });
});

test('toSvgCoords', async (t) => {
  const curve = buildEquityCurve(TRADES);
  const opts = { width: 800, height: 200, padding: 20 };

  await t.test('x membentang dari padding ke lebar - padding', () => {
    const coords = toSvgCoords(curve.points, opts);
    assert.equal(coords.length, 4);
    assert.equal(coords[0].x, 20);
    assert.equal(coords[3].x, 780);
  });

  await t.test('modal lebih tinggi berarti y lebih kecil', () => {
    const coords = toSvgCoords(curve.points, opts);
    assert.ok(coords[3].y < coords[1].y, 'puncak modal harus lebih tinggi di grafik');
  });

  await t.test('skala drawdown minimal 10%', () => {
    const coords = toSvgCoords(curve.points, { ...opts, metric: 'drawdown', height: 60 });
    const deep = coords[2];
    // 5% drawdown pada skala minimum 10% memakai setengah tinggi area
    assert.ok(deep.y > opts.padding && deep.y < opts.height - opts.padding);
  });
});

test('toPathData & closeAreaPath', async (t) => {
  await t.test('path dimulai dengan M lalu L', () => {
    const d = toPathData([{ x: 0, y: 1 }, { x: 2, y: 3 }]);
    assert.equal(d, 'M 0.0 1.0 L 2.0 3.0');
  });

  await t.test('area ditutup ke baseline', () => {
    const d = closeAreaPath('M 0.0 1.0 L 2.0 3.0', [{ x: 0 }, { x: 2 }], 100);
    assert.match(d, /L 2\.0 100\.0 L 0\.0 100\.0 Z$/);
  });

  await t.test('koordinat kosong aman', () => {
    assert.equal(toPathData([]), '');
    assert.equal(closeAreaPath('M 0 0', [], 10), 'M 0 0');
  });
});

test('summarizeTrades', async (t) => {
  await t.test('menghitung total, win, loss, win rate, rata-rata PnL', () => {
    const s = summarizeTrades(TRADES);
    assert.equal(s.total, 3);
    assert.equal(s.wins, 2);
    assert.equal(s.losses, 1);
    assert.equal(Number(s.winRate.toFixed(1)), 66.7);
    assert.equal(Number(s.avgPnl.toFixed(2)), 8.33);
  });

  await t.test('tanpa trade menghasilkan nol, bukan NaN', () => {
    assert.deepEqual(summarizeTrades([]), { total: 0, wins: 0, losses: 0, winRate: 0, avgPnl: 0 });
  });
});