/**
 * @fileoverview Unit tests for IDX Stock Summary daily foreign/domestic flow scraper (TASK-5792).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import syncIdxFlowModule from '../src/scripts/sync-idx-flow.js';

const {
  MAX_IDX_FLOW_DAYS,
  formatIdxSummaryDate,
  normalizeRowDate,
  parseIdxStockSummaryPayload,
  mergeIdxFlowHistory,
  getRecentWeekdayDates,
  syncIdxStockSummaryFlow,
} = syncIdxFlowModule;

describe('sync-idx-flow — date helpers', () => {
  it('formatIdxSummaryDate returns compact YYYYMMDD and ISO YYYY-MM-DD', () => {
    const res = formatIdxSummaryDate(new Date('2026-10-08T10:00:00Z'));
    assert.deepEqual(res, { compact: '20261008', iso: '2026-10-08' });
    assert.deepEqual(formatIdxSummaryDate('invalid-date'), { compact: '', iso: '' });
  });

  it('normalizeRowDate handles ISO timestamps, compact YYYYMMDD, and fallback', () => {
    assert.equal(normalizeRowDate('2026-10-08T00:00:00', '2026-01-01'), '2026-10-08');
    assert.equal(normalizeRowDate('20261008', '2026-01-01'), '2026-10-08');
    assert.equal(normalizeRowDate(null, '2026-01-01'), '2026-01-01');
    assert.equal(normalizeRowDate('not-a-date', '2026-01-01'), '2026-01-01');
  });

  it('getRecentWeekdayDates skips Saturdays and Sundays and orders chronologically', () => {
    // 2026-10-11 is a Sunday
    const weekdays = getRecentWeekdayDates(3, new Date('2026-10-11T12:00:00Z'));
    assert.equal(weekdays.length, 3);
    assert.deepEqual(
      weekdays.map((d) => d.iso),
      ['2026-10-07', '2026-10-08', '2026-10-09']
    );
  });
});

describe('sync-idx-flow — parseIdxStockSummaryPayload', () => {
  it('parses IDX GetStockSummary JSON string and filters out non-4-letter or zero-volume rows', () => {
    const payload = JSON.stringify({
      data: [
        {
          StockCode: 'BBCA',
          Date: '2026-10-08T00:00:00',
          Close: 10200,
          High: 10300,
          Low: 10100,
          Volume: 55_000_000,
          Value: 561_000_000_000,
          ForeignBuy: 35_000_000,
          ForeignSell: 18_000_000,
        },
        {
          StockCode: 'BBCA-W', // Warrant (not 4 letters) -> ignored
          Close: 500,
          Volume: 100_000,
        },
        {
          StockCode: 'SUSP', // Zero volume -> ignored
          Close: 1000,
          Volume: 0,
        },
      ],
    });

    const rows = parseIdxStockSummaryPayload(payload, '2026-10-08');
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      ticker: 'BBCA',
      date: '2026-10-08',
      close: 10200,
      high: 10300,
      low: 10100,
      volume: 55_000_000,
      value: 561_000_000_000,
      foreignBuy: 35_000_000,
      foreignSell: 18_000_000,
    });
  });

  it('returns empty array on malformed JSON or empty input', () => {
    assert.deepEqual(parseIdxStockSummaryPayload(null), []);
    assert.deepEqual(parseIdxStockSummaryPayload('{bad-json'), []);
  });
});

describe('sync-idx-flow — mergeIdxFlowHistory', () => {
  it('deduplicates by date, sorts chronologically, and caps at maxDays', () => {
    const existing = [
      { date: '2026-10-07', close: 1000, volume: 100_000, value: 100_000_000, foreignBuy: 50_000, foreignSell: 20_000 },
      { date: '2026-10-06', close: 990, volume: 90_000, value: 89_100_000, foreignBuy: 40_000, foreignSell: 30_000 },
    ];
    // Overwrite 2026-10-07 and cap at 2 days
    const updated = mergeIdxFlowHistory(
      existing,
      { date: '2026-10-07', close: 1010, volume: 120_000, value: 121_200_000, foreignBuy: 70_000, foreignSell: 20_000 },
      2
    );

    assert.equal(updated.length, 2);
    assert.equal(updated[0].date, '2026-10-06');
    assert.equal(updated[1].date, '2026-10-07');
    assert.equal(updated[1].close, 1010);
    assert.equal(updated[1].foreignBuy, 70_000);
    assert.equal(MAX_IDX_FLOW_DAYS, 250);
  });
});

describe('sync-idx-flow — syncIdxStockSummaryFlow with mocked Prisma & fetcher', () => {
  it('merges scraped IDX summary rows into stockData.technicals and persists updates', async () => {
    const updates = [];
    const mockPrisma = {
      stockData: {
        findMany: async () => [
          {
            ticker: 'BMRI',
            technicals: JSON.stringify({
              prices: [7000],
              idxFlow: [
                { date: '2026-10-07', close: 7000, volume: 1_000_000, value: 7_000_000_000, foreignBuy: 500_000, foreignSell: 400_000 },
              ],
            }),
          },
          {
            ticker: 'TLKM',
            technicals: '{corrupted-json',
          },
        ],
        update: async ({ where, data }) => {
          updates.push({ ticker: where.ticker, technicals: JSON.parse(data.technicals) });
        },
      },
    };

    const mockFetcher = async (compactDate) => {
      if (compactDate === '20261008') {
        return {
          data: [
            {
              StockCode: 'BMRI',
              Date: '2026-10-08',
              Close: 7150,
              High: 7200,
              Low: 7050,
              Volume: 2_000_000,
              Value: 14_300_000_000,
              ForeignBuy: 1_200_000,
              ForeignSell: 500_000,
            },
          ],
        };
      }
      throw new Error('Simulated Cloudflare timeout');
    };

    const result = await syncIdxStockSummaryFlow({
      prismaClient: mockPrisma,
      fetchSummaryForDate: mockFetcher,
      dates: [
        { compact: '20261008', iso: '2026-10-08' },
        { compact: '20261009', iso: '2026-10-09' },
      ],
    });

    assert.equal(result.datesProcessed, 1);
    assert.equal(result.updatedStocks, 1);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].ticker, 'BMRI');
    assert.equal(updates[0].technicals.idxFlow.length, 2);
    assert.equal(updates[0].technicals.idxFlow[1].date, '2026-10-08');
    assert.equal(updates[0].technicals.idxFlow[1].foreignBuy, 1_200_000);
    assert.ok(updates[0].technicals.idxFlowUpdatedAt);
  });
});

