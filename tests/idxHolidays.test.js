import test from 'node:test';
import assert from 'node:assert/strict';
import { isIDXHoliday, isIDXTradingDay, formatDateWIBString } from '../src/lib/idxHolidays.js';
import { getTradingDaysElapsed } from '../src/lib/recommendationTracker.js';

test('IDX Market Holidays & Trading Days Suite', async (t) => {
  await t.test('1. Mendeteksi hari libur nasional resmi BEI secara akurat', () => {
    // 1 Januari 2026 (Tahun Baru)
    assert.strictEqual(isIDXHoliday('2026-01-01'), true);
    // 17 Agustus 2026 (Hari Kemerdekaan)
    assert.strictEqual(isIDXHoliday('2026-08-17'), true);
    // 25 Desember 2026 (Natal)
    assert.strictEqual(isIDXHoliday('2026-12-25'), true);
    // Hari kerja biasa: 24 September 2026 (Kamis)
    assert.strictEqual(isIDXHoliday('2026-09-24'), false);
  });

  await t.test('2. isIDXTradingDay mengecualikan akhir pekan dan hari libur bursa', () => {
    // Sabtu (2026-09-26) -> bukan trading day
    assert.strictEqual(isIDXTradingDay(new Date('2026-09-26T10:00:00Z')), false);
    // Minggu (2026-09-27) -> bukan trading day
    assert.strictEqual(isIDXTradingDay(new Date('2026-09-27T10:00:00Z')), false);
    // Libur Nasional (2026-08-17) -> bukan trading day
    assert.strictEqual(isIDXTradingDay(new Date('2026-08-17T03:00:00Z')), false);
    // Hari aktif bursa: 2026-09-24 (Kamis) -> trading day
    assert.strictEqual(isIDXTradingDay(new Date('2026-09-24T03:00:00Z')), true);
  });

  await t.test('3. getTradingDaysElapsed mengabaikan libur nasional bursa dalam rentang evaluasi', () => {
    // Rentang 15 Agustus 2026 s/d 19 Agustus 2026:
    // 15 Agt (Sabtu) -> skip
    // 16 Agt (Minggu) -> skip
    // 17 Agt (Senin, Libur Kemerdekaan) -> skip libur bursa!
    // 18 Agt (Selasa) -> trading day (+1)
    // 19 Agt (Rabu) -> trading day (+1)
    const start = new Date('2026-08-14T17:00:00+07:00');
    const end = new Date('2026-08-19T17:00:00+07:00');
    const days = getTradingDaysElapsed(start, end);
    // Total hari kerja aktif hanya 2 hari (18 dan 19 Agt)
    assert.strictEqual(days, 2);
  });
});
