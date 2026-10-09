/**
 * @fileoverview Unit tests for migrate-idx-flow-to-table.js and relational StockDailyFlow integration.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateToUtcMidnight,
  migrateIdxFlowJsonToTable,
} from '../src/scripts/migrate-idx-flow-to-table.js';
import { mapRelationalFlowRecord } from '../src/lib/providers/DatabaseProvider.js';

describe('StockDailyFlow Migration — Date Parsing & Logic', () => {
  it('mapRelationalFlowRecord correctly normalizes DB row to engine flow format', () => {
    assert.equal(mapRelationalFlowRecord(null), null);

    const mapped = mapRelationalFlowRecord({
      date: new Date('2026-10-07T00:00:00.000Z'),
      close: 6050,
      high: 6100,
      low: 5975,
      volume: 162690800n,
      value: 982525082500n,
      foreignBuy: 93011500n,
      foreignSell: 142705300n,
      domesticBuy: 69679300n,
      domesticSell: 19985500n,
      source: 'idx',
    });

    assert.equal(mapped.date, '2026-10-07');
    assert.equal(mapped.close, 6050);
    assert.equal(mapped.volume, 162690800);
    assert.equal(mapped.value, 982525082500);
    assert.equal(mapped.foreignBuy, 93011500);
    assert.equal(mapped.foreignSell, 142705300);
    assert.equal(mapped.domesticBuy, 69679300);
    assert.equal(mapped.domesticSell, 19985500);
    assert.equal(mapped.source, 'idx');
  });

  it('parseDateToUtcMidnight correctly normalizes dates and rejects invalid inputs', () => {
    const d1 = parseDateToUtcMidnight('2026-10-08');
    assert.ok(d1 instanceof Date);
    assert.equal(d1.toISOString().slice(0, 10), '2026-10-08');
    assert.equal(d1.getUTCHours(), 0);

    const fromDate = parseDateToUtcMidnight(new Date('2026-10-07T14:30:00Z'));
    assert.equal(fromDate.toISOString().slice(0, 10), '2026-10-07');
    assert.equal(fromDate.getUTCHours(), 0);

    assert.equal(parseDateToUtcMidnight(null), null);
    assert.equal(parseDateToUtcMidnight(''), null);
    assert.equal(parseDateToUtcMidnight('invalid-date'), null);
  });

  it('migrateIdxFlowJsonToTable processes stocks and upserts relational rows with accurate metrics', async () => {
    const upsertedRecords = [];

    const mockPrisma = {
      stockData: {
        findMany: async () => [
          {
            ticker: 'BBCA',
            technicals: JSON.stringify({
              idxFlow: [
                {
                  date: '2026-10-07',
                  close: 6050,
                  high: 6100,
                  low: 5975,
                  volume: 100_000_000,
                  value: 605_000_000_000,
                  foreignBuy: 60_000_000,
                  foreignSell: 40_000_000,
                  source: 'idx',
                },
              ],
            }),
          },
          {
            ticker: 'TLKM',
            technicals: JSON.stringify({
              idxFlow: [], // empty should be skipped
            }),
          },
        ],
      },
      stockDailyFlow: {
        upsert: async (args) => {
          upsertedRecords.push(args);
          return args.create;
        },
      },
      $disconnect: async () => {},
    };

    const result = await migrateIdxFlowJsonToTable({ prismaClient: mockPrisma });
    assert.equal(result.migratedStocks, 1);
    assert.equal(result.migratedRecords, 1);
    assert.equal(upsertedRecords.length, 1);

    const record = upsertedRecords[0];
    assert.equal(record.where.ticker_date.ticker, 'BBCA');
    assert.equal(record.where.ticker_date.date.toISOString().slice(0, 10), '2026-10-07');
    assert.equal(record.create.ticker, 'BBCA');
    assert.equal(record.create.close, 6050);
    assert.equal(record.create.volume, 100_000_000n);
    assert.equal(record.create.value, 605_000_000_000n);
    assert.equal(record.create.foreignBuy, 60_000_000n);
    assert.equal(record.create.foreignSell, 40_000_000n);

    // Domestic buy = 100M - 60M = 40M
    assert.equal(record.create.domesticBuy, 40_000_000n);
    // Domestic sell = 100M - 40M = 60M
    assert.equal(record.create.domesticSell, 60_000_000n);
  });

  it('handles invalid JSON in technicals without crashing', async () => {
    const mockPrisma = {
      stockData: {
        findMany: async () => [
          {
            ticker: 'CORRUPT',
            technicals: '{ invalid json ',
          },
        ],
      },
      stockDailyFlow: {
        upsert: async () => {},
      },
      $disconnect: async () => {},
    };

    const result = await migrateIdxFlowJsonToTable({ prismaClient: mockPrisma });
    assert.equal(result.migratedStocks, 0);
    assert.equal(result.migratedRecords, 0);
  });
});

