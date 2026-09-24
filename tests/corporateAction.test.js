import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildCorporateActionsTimeline,
  parseDividendScheduleItem,
  compileHistoricalDividends,
  formatIndoDate,
  getDaysDifference,
  formatCountdown
} from '../src/lib/corporateActionEngine.js';

describe('Bloomberg CA: Corporate Actions & Catalyst Timeline Engine', () => {
  it('1. Menghasilkan timeline aksi korporasi lengkap dari dividen riil dan estimasi kalender', () => {
    const mockDividends = [
      {
        date: '2026-05-15',
        amount: 350,
        type: 'Cash Dividend'
      },
      {
        date: '2025-05-10',
        amount: 300,
        type: 'Cash Dividend'
      }
    ];

    const timeline = buildCorporateActionsTimeline({
      dividendHistory: mockDividends,
      ticker: 'BBCA'
    });

    assert.ok(Array.isArray(timeline), 'Timeline harus berupa array');
    assert.ok(timeline.length >= 3, 'Harus mencakup minimal Dividen, RUPS, dan LK');

    // Cek event dividen
    const divEvent = timeline.find(e => e.type === 'DIVIDEND');
    assert.ok(divEvent, 'Harus ada event tipe DIVIDEND');
    assert.ok(divEvent.title.includes('350'));
    assert.ok(divEvent.description.includes('BBCA'));

    // Cek event LK dan RUPS
    assert.ok(timeline.some(e => e.type === 'EARNINGS'));
    assert.ok(timeline.some(e => e.type === 'RUPS'));
  });

  it('2. Tetap menghasilkan estimasi kalender LK dan RUPS meskipun tanpa riwayat dividen', () => {
    const timeline = buildCorporateActionsTimeline({
      dividendHistory: [],
      ticker: 'GOTO'
    });

    assert.ok(Array.isArray(timeline));
    assert.strictEqual(timeline.filter(e => e.type === 'DIVIDEND').length, 0);
    assert.ok(timeline.some(e => e.type === 'EARNINGS'));
    assert.ok(timeline.some(e => e.type === 'RUPS'));
  });

  it('3. Menangani input undefined atau null dengan aman tanpa melempar error', () => {
    const timeline = buildCorporateActionsTimeline({});
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length > 0);
  });

  it('4. Mengurai data dividen resmi BEI (TanggalCum, TanggalEx, TanggalDPS, TanggalPembayaran, CashDividenPerSaham)', () => {
    const idxDiv = {
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

    const parsed = parseDividendScheduleItem(idxDiv, { dividendRate: 381 }, 6225);
    assert.strictEqual(parsed.dps, 25);
    assert.strictEqual(parsed.fiscalYear, '2026');
    assert.strictEqual(parsed.type, 'Dividen Tunai Interim');
    assert.strictEqual(parsed.cumDateFormatted, '28 Agu 2026');
    assert.strictEqual(parsed.exDateFormatted, '31 Agu 2026');
    assert.strictEqual(parsed.recordingDateFormatted, '1 Sep 2026');
    assert.strictEqual(parsed.paymentDateFormatted, '16 Sep 2026');
    assert.strictEqual(parsed.yieldPercent, 0.40);
  });

  it('5. Menghitung DPS dari CashDividenTotal dan sharesOutstanding jika CashDividenPerSaham bernilai 0', () => {
    const bbriIdxDiv = {
      Nama: 'PT Bank Rakyat Indonesia (Persero) Tbk',
      Jenis: 'dt',
      TahunBuku: '2025',
      CashDividenPerSaham: 0,
      TanggalCum: '2026-04-20T00:00:00',
      TanggalExRegulerDanNegosiasi: '2026-04-21T00:00:00',
      TanggalDPS: '2026-04-22T16:15:00',
      TanggalPembayaran: '2026-05-08T00:00:00',
      CashDividenTotal: 31470159890136
    };

    const parsed = parseDividendScheduleItem(bbriIdxDiv, {
      sharesOutstanding: 151559000000,
      price: 3160
    }, 3160);

    assert.ok(parsed.dps > 200 && parsed.dps < 210, `DPS harus sekitar 207-208, didapat ${parsed.dps}`);
    assert.strictEqual(parsed.type, 'Dividen Tunai Final');
    assert.strictEqual(parsed.cumDateFormatted, '20 Apr 2026');
    assert.strictEqual(parsed.paymentDateFormatted, '8 Mei 2026');
  });

  it('6. Menggabungkan riwayat dividen multi-tahun dari BEI dan Yahoo Finance tanpa duplikasi', () => {
    const idxHistory = [
      {
        TanggalCum: '2026-09-15T00:00:00',
        TanggalPembayaran: '2026-10-02T00:00:00',
        CashDividenPerSaham: 66,
        Jenis: 'dti',
        TahunBuku: '2026'
      }
    ];

    const yahooHistory = [
      { date: '2026-09-16T02:00:00.000Z', dividends: 66 }, // Duplikat dalam jendela 15 hari
      { date: '2026-05-11T02:00:00.000Z', dividends: 376.95 },
      { date: '2026-01-06T02:00:00.000Z', dividends: 100 }
    ];

    const compiled = compileHistoricalDividends({
      dividendHistory: idxHistory,
      fundamentals: { yahooDividendHistory: yahooHistory },
      stockPrice: 4110
    });

    // Harus menggabungkan dan mendeduplikasi: total 3 dividen unik, bukan 4
    assert.strictEqual(compiled.length, 3);
    assert.strictEqual(compiled[0].dps, 66);
    assert.strictEqual(compiled[0].source, 'IDX');
    assert.strictEqual(compiled[1].dps, 376.95);
    assert.strictEqual(compiled[1].source, 'YAHOO');
    assert.strictEqual(compiled[2].dps, 100);
    assert.strictEqual(compiled[2].source, 'YAHOO');
  });

  it('7. Menyediakan metadata dividendSchedule, historicalDividends, dan dividendSummary pada timeline', () => {
    const idxHistory = [
      {
        TanggalCum: '2026-09-15T00:00:00',
        TanggalPembayaran: '2026-10-02T00:00:00',
        CashDividenPerSaham: 66,
        Jenis: 'dti',
        TahunBuku: '2026'
      }
    ];

    const timeline = buildCorporateActionsTimeline({
      dividendHistory: idxHistory,
      fundamentals: {
        dividendYield: 12.23,
        payoutRatio: 71.47,
        dividendStreakYears: 10,
        dividendRate: 542.96
      },
      ticker: 'BMRI',
      price: 4110
    });

    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.dividendSchedule, 'Harus memiliki dividendSchedule');
    assert.strictEqual(timeline.dividendSchedule.dps, 66);
    assert.strictEqual(timeline.dividendSchedule.type, 'Dividen Tunai Interim');
    assert.ok(Array.isArray(timeline.historicalDividends));
    assert.strictEqual(timeline.dividendSummary.dividendStreakYears, 10);
    assert.strictEqual(timeline.dividendSummary.dividendYield, 12.23);
  });
});
