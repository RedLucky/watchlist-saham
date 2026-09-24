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

  it('3. Menghitung bulan sebelumnya dan bulan berikutnya dengan benar melintasi batas tahun', () => {
    // Helper function matching CorporateCalendar handlePrevMonth & handleNextMonth
    const getPrevMonth = (selectedMonth) => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    };

    const getNextMonth = (selectedMonth) => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(year, month, 1);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    };

    // Standard transition: 2026-09 -> Next -> 2026-10
    assert.strictEqual(getNextMonth('2026-09'), '2026-10');
    // Standard transition: 2026-09 -> Prev -> 2026-08
    assert.strictEqual(getPrevMonth('2026-09'), '2026-08');

    // Year boundary next: 2026-12 -> Next -> 2027-01
    assert.strictEqual(getNextMonth('2026-12'), '2027-01');
    // Year boundary prev: 2026-01 -> Prev -> 2025-12
    assert.strictEqual(getPrevMonth('2026-01'), '2025-12');
  });
});
