/**
 * @fileoverview Idempotent Migration Script: Moves historical IDX flow rows
 * from StockData.technicals.idxFlow JSON into the relational StockDailyFlow table.
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Parses an ISO date string ("YYYY-MM-DD") into a UTC midnight Date object.
 *
 * @param {string|Date} dateInput - ISO date string or Date object.
 * @returns {Date|null} UTC midnight Date object or null if invalid.
 */
function parseDateToUtcMidnight(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) return null;
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  return null;
}

/**
 * Migrates existing idxFlow JSON arrays from StockData into the relational StockDailyFlow table.
 * Idempotent: uses upsert on unique composite constraint @@unique([ticker, date]).
 *
 * @param {object} [options={}] - Options and dependency injection.
 * @param {object} [options.prismaClient] - Prisma client instance.
 * @returns {Promise<{ migratedStocks: number, migratedRecords: number }>} Migration summary.
 */
async function migrateIdxFlowJsonToTable(options = {}) {
  const db = options.prismaClient || new PrismaClient();
  const shouldDisconnect = !options.prismaClient;

  let migratedStocks = 0;
  let migratedRecords = 0;

  try {
    const stocks = await db.stockData.findMany({
      where: {
        technicals: { contains: 'idxFlow' },
      },
      select: {
        ticker: true,
        technicals: true,
      },
    });

    console.log(`[MIGRATE-FLOW] Ditemukan ${stocks.length} saham dengan data idxFlow untuk dimigrasi.`);

    for (const s of stocks) {
      if (!s.technicals) continue;
      let parsedTech = null;
      try {
        parsedTech = typeof s.technicals === 'string' ? JSON.parse(s.technicals) : s.technicals;
      } catch {
        continue;
      }

      const rows = Array.isArray(parsedTech?.idxFlow) ? parsedTech.idxFlow : [];
      if (rows.length === 0) continue;

      let stockRecordCount = 0;

      for (const row of rows) {
        if (!row || !row.date) continue;
        const dateObj = parseDateToUtcMidnight(row.date);
        if (!dateObj) continue;

        const vol = BigInt(row.volume || 0);
        const val = BigInt(row.value || 0);
        const fb = BigInt(row.foreignBuy || 0);
        const fs = BigInt(row.foreignSell || 0);
        const dbBuy = vol >= fb ? vol - fb : 0n;
        const dbSell = vol >= fs ? vol - fs : 0n;

        await db.stockDailyFlow.upsert({
          where: {
            ticker_date: {
              ticker: s.ticker.toUpperCase(),
              date: dateObj,
            },
          },
          update: {
            close: Number(row.close || 0),
            high: row.high != null ? Number(row.high) : Number(row.close || 0),
            low: row.low != null ? Number(row.low) : Number(row.close || 0),
            volume: vol,
            value: val,
            foreignBuy: fb,
            foreignSell: fs,
            domesticBuy: dbBuy,
            domesticSell: dbSell,
            source: row.source || 'idx',
          },
          create: {
            ticker: s.ticker.toUpperCase(),
            date: dateObj,
            close: Number(row.close || 0),
            high: row.high != null ? Number(row.high) : Number(row.close || 0),
            low: row.low != null ? Number(row.low) : Number(row.close || 0),
            volume: vol,
            value: val,
            foreignBuy: fb,
            foreignSell: fs,
            domesticBuy: dbBuy,
            domesticSell: dbSell,
            source: row.source || 'idx',
          },
        });

        stockRecordCount++;
        migratedRecords++;
      }

      if (stockRecordCount > 0) {
        migratedStocks++;
      }
    }

    console.log(`[MIGRATE-FLOW] Migrasi selesai: ${migratedRecords} baris transaksi dari ${migratedStocks} saham berhasil masuk tabel StockDailyFlow.`);
    return { migratedStocks, migratedRecords };
  } catch (err) {
    console.error(`[MIGRATE-FLOW-ERR] Gagal migrasi idxFlow ke tabel: ${err.message}`);
    throw err;
  } finally {
    if (shouldDisconnect && typeof db.$disconnect === 'function') {
      await db.$disconnect().catch(() => {});
    }
  }
}

if (require.main === module) {
  migrateIdxFlowJsonToTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  parseDateToUtcMidnight,
  migrateIdxFlowJsonToTable,
};

