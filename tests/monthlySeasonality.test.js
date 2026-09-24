import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlySeasonality, aggregateSeasonalityStats } from '../src/lib/monthlySeasonalityEngine.js';

test('Monthly Seasonality Engine Suite', async (t) => {
  await t.test('1. Menghitung return bulanan, harga rata-rata, dan swing high/low dengan benar', () => {
    // Generate dummy historical daily data for 2 years (2025 and 2026)
    const rows = [
      // Jan 2025: Open 1000, Close 1100 (+10%), High 1150 (+15%), Low 980 (-2%)
      { date: '2025-01-02', open: 1000, high: 1050, low: 980, close: 1040, volume: 100 },
      { date: '2025-01-30', open: 1040, high: 1150, low: 1020, close: 1100, volume: 120 },
      
      // Feb 2025: Open 1100, Close 990 (-10%), High 1120 (+1.82%), Low 950 (-13.64%)
      { date: '2025-02-03', open: 1100, high: 1120, low: 1050, close: 1050, volume: 90 },
      { date: '2025-02-27', open: 1050, high: 1060, low: 950, close: 990, volume: 110 },

      // Jan 2026: Open 1200, Close 1320 (+10%), High 1380 (+15%), Low 1180 (-1.67%)
      { date: '2026-01-05', open: 1200, high: 1250, low: 1180, close: 1250, volume: 200 },
      { date: '2026-01-29', open: 1250, high: 1380, low: 1220, close: 1320, volume: 250 },
    ];

    const result = calculateMonthlySeasonality(rows);

    assert.ok(result);
    assert.ok(Array.isArray(result.years));
    assert.ok(result.years.includes(2025));
    assert.ok(result.years.includes(2026));

    // Check Jan 2025 cell
    const jan2025 = result.matrix[2025][1];
    assert.equal(jan2025.status, 'PLUS');
    assert.equal(jan2025.returnPercent, 10.0);
    assert.equal(jan2025.open, 1000);
    assert.equal(jan2025.close, 1100);
    assert.equal(jan2025.high, 1150);
    assert.equal(jan2025.low, 980);
    assert.equal(jan2025.maxHighPercent, 15.0);
    assert.equal(jan2025.maxLowPercent, -2.0);

    // Check Feb 2025 cell
    const feb2025 = result.matrix[2025][2];
    assert.equal(feb2025.status, 'MINUS');
    assert.equal(feb2025.returnPercent, -10.0);

    // Check Jan Stats (2025 & 2026 both PLUS -> Win Rate 100%)
    const janStats = result.monthStats[1];
    assert.equal(janStats.winRatePercent, 100);
    assert.equal(janStats.plusCount, 2);
    assert.equal(janStats.avgReturnPercent, 10.0);

    // Check Best Month identification
    assert.ok(result.bestMonth);
    assert.equal(result.bestMonth.month, 1);
  });

  await t.test('2. Menangani array kosong atau invalid secara aman tanpa NaN/crash', () => {
    const emptyResult = calculateMonthlySeasonality([]);
    assert.ok(emptyResult);
    assert.equal(emptyResult.overallWinRate, 0);
    assert.equal(emptyResult.totalEvaluatedCells, 0);

    const nullResult = calculateMonthlySeasonality(null);
    assert.ok(nullResult);
    assert.equal(nullResult.overallWinRate, 0);
  });

  await t.test('3. Penanganan timezone string YYYY-MM-DD aman tanpa pergeseran bulan', () => {
    const dateRows = [
      { date: '2025-01-01T00:00:00.000Z', open: 500, high: 520, low: 490, close: 510 },
      { date: '2025-01-31T23:59:59.000Z', open: 510, high: 550, low: 505, close: 540 },
    ];
    const res = calculateMonthlySeasonality(dateRows);
    assert.ok(res.matrix[2025][1]);
    assert.equal(res.matrix[2025][1].status, 'PLUS');
    assert.equal(res.matrix[2025][1].tradingDays, 2);
  });

  await t.test('4. Tahan terhadap data ekstrim (low = 0 atau missing) tanpa menghasilkan Infinity', () => {
    const dirtyRows = [
      { date: '2025-03-03', open: 100, high: 110, low: 0, close: 105 }, // low is 0
      { date: '2025-03-28', open: 105, high: 0, low: 100, close: 102 }  // high is 0
    ];
    const res = calculateMonthlySeasonality(dirtyRows);
    const marCell = res.matrix[2025][3];
    assert.ok(Number.isFinite(marCell.low));
    assert.ok(Number.isFinite(marCell.high));
    assert.ok(Number.isFinite(marCell.maxLowPercent));
    assert.ok(Number.isFinite(marCell.maxHighPercent));
    assert.notEqual(marCell.low, Infinity);
    assert.notEqual(marCell.high, -Infinity);
  });

  await t.test('5. aggregateSeasonalityStats menghitung ulang statistik saat beralih timeframe 3Y vs 5Y', () => {
    const rows = [
      { date: '2024-01-02', open: 100, high: 110, low: 95, close: 90 }, // 2024: MINUS (-10%)
      { date: '2025-01-02', open: 100, high: 120, low: 95, close: 110 }, // 2025: PLUS (+10%)
      { date: '2026-01-02', open: 100, high: 130, low: 95, close: 120 }, // 2026: PLUS (+20%)
    ];
    const res = calculateMonthlySeasonality(rows, 10);

    // Evaluasi 3 tahun (2024, 2025, 2026): 2 plus dari 3 = 66.7% win rate di Jan
    const stats3Y = aggregateSeasonalityStats(res.matrix, [2026, 2025, 2024]);
    assert.equal(stats3Y.monthStats[1].winRatePercent, 66.7);
    assert.equal(stats3Y.monthStats[1].totalYearsEvaluated, 3);

    // Evaluasi 2 tahun (2025, 2026): 2 plus dari 2 = 100% win rate di Jan
    const stats2Y = aggregateSeasonalityStats(res.matrix, [2026, 2025]);
    assert.equal(stats2Y.monthStats[1].winRatePercent, 100);
    assert.equal(stats2Y.monthStats[1].totalYearsEvaluated, 2);
  });
});
