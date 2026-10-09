/**
 * @fileoverview Daily IDX Stock Summary (Ringkasan Saham BEI) Foreign & Domestic Flow Scraper.
 * Scrapes official ForeignBuy, ForeignSell, Volume, and Value per ticker from BEI and merges
 * a rolling 250-trading-day history into StockData.technicals.idxFlow.
 */

const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const fs = require('fs');

const MAX_IDX_FLOW_DAYS = 250;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

/**
 * Formats a Date or date string into both IDX query format (YYYYMMDD) and ISO date (YYYY-MM-DD).
 *
 * @param {Date|string} dateInput - Date instance or parseable date string.
 * @returns {{ compact: string, iso: string }} Formatted date strings.
 */
function formatIdxSummaryDate(dateInput = new Date()) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return { compact: '', iso: '' };
  }
  const iso = d.toISOString().slice(0, 10);
  const compact = iso.replace(/-/g, '');
  return { compact, iso };
}

/**
 * Normalizes a raw date string from IDX (e.g. "2026-10-08T00:00:00" or "20261008") to "YYYY-MM-DD".
 *
 * @param {string} rawDate - Raw date field from IDX payload.
 * @param {string} fallbackIso - Fallback ISO date ("YYYY-MM-DD").
 * @returns {string} Normalized "YYYY-MM-DD" date string.
 */
function normalizeRowDate(rawDate, fallbackIso = '') {
  if (!rawDate || typeof rawDate !== 'string') return fallbackIso;
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return fallbackIso;
}

/**
 * Parses an IDX GetStockSummary JSON payload into normalized per-ticker flow objects.
 *
 * @param {object|string|Array} rawPayload - Raw JSON response from IDX GetStockSummary.
 * @param {string} [fallbackDateIso=''] - Default ISO date ("YYYY-MM-DD") if row omits Date.
 * @returns {Array<{
 *   ticker: string,
 *   date: string,
 *   close: number,
 *   high: number,
 *   low: number,
 *   volume: number,
 *   value: number,
 *   foreignBuy: number,
 *   foreignSell: number
 * }>} Normalized IDX flow rows.
 */
function parseIdxStockSummaryPayload(rawPayload, fallbackDateIso = '') {
  if (!rawPayload) return [];

  let parsed = rawPayload;
  if (typeof rawPayload === 'string') {
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      return [];
    }
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : (parsed?.data || parsed?.Replies || parsed?.Results || []);

  if (!Array.isArray(rows)) return [];

  const normalized = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rawTicker = String(row.StockCode || row.KodeSaham || row.ticker || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(rawTicker)) continue;

    const close = Number(row.Close ?? row.Penutupan ?? row.close ?? 0);
    const volume = Number(row.Volume ?? row.volume ?? 0);
    if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(volume) || volume <= 0) {
      continue;
    }

    const high = Number(row.High ?? row.Tertinggi ?? row.high ?? close) || close;
    const low = Number(row.Low ?? row.Terendah ?? row.low ?? close) || close;
    const value = Number(row.Value ?? row.Nilai ?? row.value ?? Math.round(close * volume)) || Math.round(close * volume);
    const foreignBuy = Math.max(0, Number(row.ForeignBuy ?? row.BeliAsing ?? row.foreignBuy ?? 0) || 0);
    const foreignSell = Math.max(0, Number(row.ForeignSell ?? row.JualAsing ?? row.foreignSell ?? 0) || 0);
    const date = normalizeRowDate(row.Date || row.Tanggal || row.date, fallbackDateIso);

    if (!date) continue;

    normalized.push({
      ticker: rawTicker,
      date,
      close,
      high,
      low,
      volume,
      value,
      foreignBuy,
      foreignSell,
    });
  }

  return normalized;
}

/**
 * Merges a new daily IDX flow record into an existing history array, deduplicating by date
 * and capping the history at maxDays (default 250 trading days).
 *
 * @param {Array<object>} existingHistory - Existing `technicals.idxFlow` array.
 * @param {object} newRecord - Single normalized IDX flow record (`{ date, close, volume, value, foreignBuy, foreignSell }`).
 * @param {number} [maxDays=250] - Maximum number of trading days to retain.
 * @returns {Array<object>} Deduplicated, chronologically sorted `idxFlow` array.
 */
function mergeIdxFlowHistory(existingHistory = [], newRecord = null, maxDays = MAX_IDX_FLOW_DAYS) {
  const byDate = new Map();

  if (Array.isArray(existingHistory)) {
    for (const item of existingHistory) {
      if (item && typeof item.date === 'string' && Number(item.volume) > 0) {
        byDate.set(item.date, {
          date: item.date,
          close: Number(item.close || 0),
          high: Number(item.high || item.close || 0),
          low: Number(item.low || item.close || 0),
          volume: Number(item.volume || 0),
          value: Number(item.value || 0),
          foreignBuy: Number(item.foreignBuy || 0),
          foreignSell: Number(item.foreignSell || 0),
        });
      }
    }
  }

  if (newRecord && typeof newRecord.date === 'string' && Number(newRecord.volume) > 0) {
    byDate.set(newRecord.date, {
      date: newRecord.date,
      close: Number(newRecord.close || 0),
      high: Number(newRecord.high || newRecord.close || 0),
      low: Number(newRecord.low || newRecord.close || 0),
      volume: Number(newRecord.volume || 0),
      value: Number(newRecord.value || 0),
      foreignBuy: Number(newRecord.foreignBuy || 0),
      foreignSell: Number(newRecord.foreignSell || 0),
    });
  }

  const sorted = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-Math.max(1, maxDays));
}

/**
 * Generates the list of recent candidate trading dates (excluding weekends) to query on IDX.
 *
 * @param {number} [lookbackDays=5] - Number of recent weekdays to check.
 * @param {Date} [referenceDate=new Date()] - Anchor date.
 * @returns {Array<{ compact: string, iso: string }>} Candidate dates in chronological order.
 */
function getRecentWeekdayDates(lookbackDays = 5, referenceDate = new Date()) {
  const results = [];
  const cursor = new Date(referenceDate.getTime());

  while (results.length < lookbackDays) {
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      results.unshift(formatIdxSummaryDate(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return results;
}

/**
 * Fetches IDX GetStockSummary for recent trading days and merges foreign/domestic flow into DB.
 *
 * @param {object} [options={}] - Dependency injection options for testing.
 * @param {object} [options.prismaClient] - Prisma client instance.
 * @param {Function} [options.fetchSummaryForDate] - Custom fetcher `(compactDate, isoDate) => Promise<object|string>`.
 * @param {Array<{ compact: string, iso: string }>} [options.dates] - Explicit dates to sync.
 * @returns {Promise<{ updatedStocks: number, datesProcessed: number }>} Sync summary.
 */
async function syncIdxStockSummaryFlow(options = {}) {
  const db = options.prismaClient || new PrismaClient();
  const shouldDisconnect = !options.prismaClient;
  const candidateDates = options.dates || getRecentWeekdayDates(3);

  let browser = null;
  let page = null;

  const defaultFetcher = async (compactDate) => {
    if (!browser) {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
        || (fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser'
          : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined));

      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
        ],
      });
      page = await browser.newPage();
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setUserAgent(ua);
      await page.goto('https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/', {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      }).catch(() => {});
    }

    const url = `https://www.idx.co.id/primary/TradingSummary/GetStockSummary?length=9999&start=0&date=${compactDate}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });
    return page.evaluate(() => document.body.innerText);
  };

  const fetchForDate = options.fetchSummaryForDate || defaultFetcher;
  let updatedStocks = 0;
  let datesProcessed = 0;

  try {
    const existingStocks = await db.stockData.findMany({
      where: { isDelisted: false },
      select: { ticker: true, technicals: true },
    });

    const techMap = new Map();
    for (const s of existingStocks) {
      let parsedTech = {};
      if (s.technicals) {
        try {
          parsedTech = typeof s.technicals === 'string' ? JSON.parse(s.technicals) : s.technicals;
        } catch {
          parsedTech = {};
        }
      }
      techMap.set(s.ticker.toUpperCase(), {
        raw: parsedTech,
        dirty: false,
      });
    }

    for (const { compact, iso } of candidateDates) {
      try {
        const rawText = await fetchForDate(compact, iso);
        const rows = parseIdxStockSummaryPayload(rawText, iso);
        if (rows.length === 0) continue;

        datesProcessed++;
        for (const row of rows) {
          const entry = techMap.get(row.ticker);
          if (!entry) continue;
          entry.raw.idxFlow = mergeIdxFlowHistory(entry.raw.idxFlow, row, MAX_IDX_FLOW_DAYS);
          entry.raw.idxFlowUpdatedAt = new Date().toISOString();
          entry.dirty = true;

          // Upsert into relational StockDailyFlow table
          if (db.stockDailyFlow && typeof db.stockDailyFlow.upsert === 'function') {
            const dateObj = new Date(`${row.date}T00:00:00.000Z`);
            const vol = BigInt(row.volume || 0);
            const val = BigInt(row.value || 0);
            const fb = BigInt(row.foreignBuy || 0);
            const fs = BigInt(row.foreignSell || 0);
            const dbBuy = vol >= fb ? vol - fb : 0n;
            const dbSell = vol >= fs ? vol - fs : 0n;

            await db.stockDailyFlow.upsert({
              where: {
                ticker_date: {
                  ticker: row.ticker,
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
                source: 'idx',
              },
              create: {
                ticker: row.ticker,
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
                source: 'idx',
              },
            }).catch(() => {});
          }
        }
      } catch (dateErr) {
        console.warn(`[IDX-FLOW] Skip date ${iso}: ${dateErr.message}`);
      }
    }

    for (const [ticker, entry] of techMap.entries()) {
      if (!entry.dirty) continue;
      await db.stockData.update({
        where: { ticker },
        data: { technicals: JSON.stringify(entry.raw) },
      });
      updatedStocks++;
    }

    console.log(`[IDX-FLOW] Sync selesai: ${updatedStocks} saham diperbarui dari ${datesProcessed} hari bursa.`);
    return { updatedStocks, datesProcessed };
  } catch (err) {
    console.error(`[IDX-FLOW-ERR] Gagal sinkronisasi Ringkasan Saham BEI: ${err.message}`);
    return { updatedStocks, datesProcessed };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (shouldDisconnect && typeof db.$disconnect === 'function') {
      await db.$disconnect().catch(() => {});
    }
  }
}

if (require.main === module) {
  syncIdxStockSummaryFlow();
}

module.exports = {
  MAX_IDX_FLOW_DAYS,
  formatIdxSummaryDate,
  normalizeRowDate,
  parseIdxStockSummaryPayload,
  mergeIdxFlowHistory,
  getRecentWeekdayDates,
  syncIdxStockSummaryFlow,
};

