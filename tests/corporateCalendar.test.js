import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseDividendScheduleItem } from '../src/lib/corporateActionEngine.js';

describe('Corporate Actions Calendar API & Data Processing Suite', () => {
  it('1. Memproses jadwal dividen resmi BEI dan mengekstrak tanggal Cum Date, Ex Date, DPS Date, Payment Date', () => {
    const mockIdxDiv = {
      Nama: 'PT Bank Central Asia Tbk.',
      Jenis: 'dti',
      TahunBuku: '2026',
      CashDividenPerSaham: 25,
      TanggalCum: '2026-08-28T00:00:00',
      TanggalExRegulerDanNegosiasi: '2026-08-31T00:00:00',
      TanggalDPS: '2026-09-01T16:00:00',
      TanggalPembayaran: '2026-09-16T00:00:00',
      CashDividenTotal: 0
    };

    const parsed = parseDividendScheduleItem(mockIdxDiv, { dividendRate: 381 }, 6225);

    assert.strictEqual(parsed.cumDate.slice(0, 10), '2026-08-28');
    assert.strictEqual(parsed.exDate.slice(0, 10), '2026-08-31');
    assert.strictEqual(parsed.recordingDate.slice(0, 10), '2026-09-01');
    assert.strictEqual(parsed.paymentDate.slice(0, 10), '2026-09-16');
    assert.strictEqual(parsed.dps, 25);
    assert.strictEqual(parsed.type, 'Dividen Tunai Interim');
  });

  it('2. Menentukan status dan hitung mundur relative untuk tanggal dividen yang akan datang vs telah terlewati', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = futureDate.toISOString();

    const mockFutureDiv = {
      Jenis: 'dt',
      TahunBuku: '2026',
      CashDividenPerSaham: 150,
      TanggalCum: futureDateStr,
      TanggalPembayaran: futureDateStr
    };

    const parsed = parseDividendScheduleItem(mockFutureDiv, {}, 2000);
    assert.strictEqual(parsed.stage, 'CUM_ACTIVE');
    assert.ok(parsed.status.includes('Menjelang Cum Date'));
    assert.strictEqual(parsed.badgeColor, 'emerald');
    assert.ok(parsed.cumDaysDiff >= 9 && parsed.cumDaysDiff <= 11);
  });
});
