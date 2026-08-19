/**
 * Sync Service — ETL for Yahoo Finance → Database
 *
 * Two sync modes:
 * 1. fastSyncPrices() — Updates price, volume, changePercent for all stocks.
 * 2. deepSyncStock()  — Updates fundamentals, technicals, historical data for one stock.
 *
 * Uses shared yahooClient and indicators modules.
 */
import { yahooFinance } from './yahooClient';
import { prisma } from './prisma';
import { getSectorByTicker, getAllTickersForYahoo } from './sectorUniverse';
import { calculateMA, calculateRSI, calculateATR, calculateMACD, calculateBollingerBands } from './indicators';

const DEEP_SYNC_TIMEOUT_MS = parseInt(process.env.DEEP_SYNC_TIMEOUT_MS || '30000', 10);
const DEEP_SYNC_RETRIES = parseInt(process.env.DEEP_SYNC_RETRIES || '1', 10);
const RETRY_DELAY_MS = 1500;

/**
 * Gets the X tickers that haven't been deep-synced for the longest time.
 */
export async function getOldestDeepSyncTickers(limit = 5) {
  const dbStocks = await prisma.stockData.findMany({
    orderBy: { lastDeepSync: 'asc' },
    take: limit,
    select: { ticker: true }
  });
  
  return dbStocks.map(s => toYahooTicker(s.ticker));
}

/**
 * Gets all tickers currently in the database.
 * Falls back to the full sector universe if the database is empty.
 */
export async function getTargetTickers() {
  const dbStocks = await prisma.stockData.findMany({
    select: { ticker: true }
  });

  if (dbStocks.length > 0) {
    return dbStocks.map(s => toYahooTicker(s.ticker));
  }

  // Fallback seed — full IDX-IC universe
  return getAllTickersForYahoo();
}

/**
 * Fast Sync: Updates price, volume, and changePercent for all tracked stocks.
 * Runs every SYNC_INTERVAL_MINS.
 */
export async function fastSyncPrices() {
  console.log('[FastSync] Memulai sinkronisasi harga & volume (Round-Robin Queue)...');
  
  // 1. Ambil maksimal 50 ticker yang paling lama tidak di-update (Round-Robin).
  const dbStocks = await prisma.stockData.findMany({
    where: { NOT: { ticker: '^JKSE' } },
    orderBy: { lastPriceSync: 'asc' },
    take: 50,
    select: { ticker: true }
  });

  let tickersToSync = dbStocks.map(s => toYahooTicker(s.ticker));

  // Jika database masih kosong, gunakan fallback dari sectorUniverse
  if (tickersToSync.length === 0) {
    console.log('[FastSync] Database kosong, menggunakan fallback SECTOR_TICKERS...');
    tickersToSync = getAllTickersForYahoo();
  } else {
    // Selalu tambahkan IHSG ke setiap batch agar tetap up-to-date
    tickersToSync.push('^JKSE');
  }

  console.log(`[FastSync] Memproses ${tickersToSync.length} saham...`);
  
  const chunkSize = 20;
  let updatedCount = 0;

  for (let i = 0; i < tickersToSync.length; i += chunkSize) {
    const chunk = tickersToSync.slice(i, i + chunkSize);
    
    try {
      const quotes = await Promise.allSettled(
        chunk.map(async (ticker) => {
          const quote = await withTimeout(
            yahooFinance.quote(ticker),
            12000,
            `FastSync quote timeout for ${ticker}`
          );
          return quote;
        })
      );
      
      for (const q of quotes) {
        if (q.status !== 'fulfilled') {
          console.error(`[FastSync] Quote Error:`, q.reason?.message || q.reason);
          continue;
        }

        const quote = q.value;
        if (!quote?.symbol) continue;

        try {
          const ticker = normalizeDbTicker(quote.symbol);
          const sector = getSectorByTicker(ticker);

          // Skip index tickers from sector assignment
          if (sector === 'INDEX') {
            await upsertIndexData(ticker, quote);
            updatedCount++;
            continue;
          }

          const currentPrice = safeNumber(quote.regularMarketPrice, 0);
          const computedPercent = getChangePercent(quote);
          const vol = BigInt(Math.round(Number(quote.regularMarketVolume || 0)));
          const turnover = BigInt(Math.round(currentPrice * Number(quote.regularMarketVolume || 0)));
          const frequency = Math.round(Number(quote.regularMarketVolume || 0) / 100);

          await prisma.stockData.upsert({
            where: { ticker },
            update: {
              price: currentPrice,
              changePercent: computedPercent,
              volume: quote.regularMarketVolume != null ? vol : undefined,
              turnover: quote.regularMarketVolume != null ? turnover : undefined,
              frequency: quote.regularMarketVolume != null ? frequency : undefined,
              avgVolume3mo: quote.averageDailyVolume3Month != null ? BigInt(Math.round(Number(quote.averageDailyVolume3Month))) : undefined,
              sector,
              lastPriceSync: new Date()
            },
            create: {
              ticker,
              name: quote.shortName || quote.symbol,
              price: currentPrice,
              changePercent: computedPercent,
              volume: vol,
              turnover: turnover,
              frequency: frequency,
              avgVolume3mo: BigInt(Math.round(Number(quote.averageDailyVolume3Month || 0))),
              sector,
              lastPriceSync: new Date()
            }
          });
          updatedCount++;
        } catch (dbErr) {
          console.error(`[FastSync] DB Error for ${quote.symbol}:`, dbErr.message);
        }
      }
    } catch (err) {
      console.error(`[FastSync] Batch Error:`, err.message);
    }
  }
  
  return updatedCount;
}

/**
 * Deep Sync: Updates fundamentals and historical data (technicals) for a single stock.
 * Includes retry logic with exponential backoff.
 */
export async function deepSyncStock(ticker) {
  const fullTicker = toYahooTicker(ticker);

  for (let attempt = 1; attempt <= DEEP_SYNC_RETRIES + 1; attempt++) {
    try {
      await withTimeout(
        deepSyncStockOnce(fullTicker),
        DEEP_SYNC_TIMEOUT_MS,
        `DeepSync timeout after ${DEEP_SYNC_TIMEOUT_MS}ms for ${fullTicker}`
      );
      console.log(`[DeepSync] ✓ ${fullTicker} (attempt ${attempt})`);
      return { success: true, ticker: fullTicker, attempt };
    } catch (err) {
      const message = err?.message || 'Unknown deep sync error';
      const timedOut = message.includes('timeout');
      console.error(`[DeepSync] ✗ Attempt ${attempt} for ${fullTicker}: ${message}`);

      const isLastAttempt = attempt >= DEEP_SYNC_RETRIES + 1;
      if (isLastAttempt) {
        return { success: false, ticker: fullTicker, attempt, timedOut, error: message };
      }

      await sleep(RETRY_DELAY_MS * attempt); // Increasing delay
    }
  }
}

async function deepSyncStockOnce(fullTicker) {
  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 1); // 1 year for MA200

  let quote;
  let historical;
  let summary = {};
  try {
    [quote, historical, summary] = await Promise.all([
      withTimeout(yahooFinance.quote(fullTicker), 15000, `Quote timeout for ${fullTicker}`),
      withTimeout(
        yahooFinance.historical(fullTicker, {
          period1: period1.toISOString().split('T')[0],
          period2: period2.toISOString().split('T')[0],
          interval: '1d'
        }),
        20000,
        `Historical timeout for ${fullTicker}`
      ),
      withTimeout(
        yahooFinance.quoteSummary(fullTicker, {
          modules: ['financialData', 'incomeStatementHistory', 'defaultKeyStatistics', 'summaryDetail']
        }),
        20000,
        `QuoteSummary timeout for ${fullTicker}`
      ).catch(() => ({}))
    ]);
  } catch (apiErr) {
    throw new Error(`API call failed for ${fullTicker}: ${apiErr.message || apiErr}`);
  }

  if (!quote) {
    throw new Error(`Missing quote data for ${fullTicker}`);
  }
  if (!Array.isArray(historical) || historical.length === 0) {
    throw new Error(`Missing historical data for ${fullTicker}`);
  }

  const cleanRows = historical
    .filter(h => Number.isFinite(h?.close) && Number.isFinite(h?.volume) && Number.isFinite(h?.high) && Number.isFinite(h?.low))
    .map(h => ({
      ...h,
      close: Number(h.close),
      volume: Number(h.volume),
      high: Number(h.high),
      low: Number(h.low),
    }));

  if (cleanRows.length === 0) {
    throw new Error(`Historical rows are all invalid for ${fullTicker}`);
  }

  const prices = cleanRows.map(h => h.close);
  const volumes = cleanRows.map(h => h.volume);

  // ── Extract Fundamentals ──────────────────────────────────────────────

  const incomeHistory = summary?.incomeStatementHistory?.incomeStatementHistory || [];
  const netProfit = incomeHistory.length >= 2
    ? incomeHistory.slice(0, Math.min(3, incomeHistory.length))
        .map(i => Number(i?.netIncome) || 0)
        .reverse()
    : null; // null = data not available, let scoring handle it

  const roeRaw = summary?.financialData?.returnOnEquity ?? quote?.returnOnEquity;
  const derRaw = summary?.financialData?.debtToEquity ?? quote?.debtToEquity;
  const dividendYieldRaw = summary?.summaryDetail?.dividendYield ?? quote?.trailingAnnualDividendYield;
  const payoutRaw = summary?.summaryDetail?.payoutRatio;
  const revenueGrowthRaw = summary?.financialData?.revenueGrowth;
  const cashRaw = summary?.financialData?.totalCash;

  const fundamentals = {
    roe: normalizePercent(roeRaw, null),
    der: normalizeRatio(derRaw, null),
    netProfit,
    per: safeNumber(summary?.summaryDetail?.trailingPE ?? quote?.trailingPE, null),
    pbv: safeNumber(summary?.defaultKeyStatistics?.priceToBook ?? quote?.priceToBook, null),
    dividendYield: normalizePercent(dividendYieldRaw, 0),
    payoutRatio: normalizePercent(payoutRaw, 0),
    revenueGrowth: normalizePercent(revenueGrowthRaw, null),
    cash: Number.isFinite(cashRaw) ? Number(cashRaw) : 0,
  };

  // ── Calculate Technicals ──────────────────────────────────────────────

  const macd = calculateMACD(prices);
  const bb = calculateBollingerBands(prices);

  const technicals = {
    prices,
    volumes,
    highs: cleanRows.map(h => h.high),
    lows: cleanRows.map(h => h.low),
    ma9: calculateMA(prices, 9),
    ma20: calculateMA(prices, 20),
    ma50: calculateMA(prices, 50),
    ma200: calculateMA(prices, 200),
    rsi7: calculateRSI(prices, 7),
    rsi14: calculateRSI(prices, 14),
    resistance: safeNumber(quote?.fiftyTwoWeekHigh, Math.max(...prices) * 1.02),
    support: safeNumber(quote?.fiftyTwoWeekLow, Math.min(...prices.filter(p => p > 0)) * 0.98),
    atr14: calculateATR(cleanRows, 14),
    macd,
    bollingerBands: bb,
  };

  // ── Persist to Database ───────────────────────────────────────────────

  const tickerClean = normalizeDbTicker(fullTicker);
  const sector = getSectorByTicker(tickerClean);
  const currentPrice = safeNumber(quote?.regularMarketPrice, prices[prices.length - 1] || 0);
  const computedPercent = getChangePercent(quote);
  const vol = BigInt(Math.round(Number(quote?.regularMarketVolume || 0)));
  const turnover = BigInt(Math.round(currentPrice * Number(quote?.regularMarketVolume || 0)));
  const frequency = Math.round(Number(quote?.regularMarketVolume || 0) / 100);
  const now = new Date();

  await prisma.stockData.upsert({
    where: { ticker: tickerClean },
    update: {
      name: quote?.shortName || tickerClean,
      sector: sector === 'INDEX' ? null : sector,
      price: currentPrice,
      changePercent: computedPercent,
      volume: quote?.regularMarketVolume != null ? vol : undefined,
      turnover: quote?.regularMarketVolume != null ? turnover : undefined,
      frequency: quote?.regularMarketVolume != null ? frequency : undefined,
      avgVolume3mo: quote?.averageDailyVolume3Month != null ? BigInt(Math.round(Number(quote.averageDailyVolume3Month))) : undefined,
      fundamentals: JSON.stringify(fundamentals),
      technicals: JSON.stringify(technicals),
      historicalRaw: JSON.stringify(cleanRows),
      lastDeepSync: now,
      lastPriceSync: now
    },
    create: {
      ticker: tickerClean,
      name: quote?.shortName || tickerClean,
      sector: sector === 'INDEX' ? null : sector,
      price: currentPrice,
      changePercent: computedPercent,
      volume: vol,
      turnover: turnover,
      frequency: frequency,
      avgVolume3mo: BigInt(Math.round(Number(quote?.averageDailyVolume3Month || 0))),
      fundamentals: JSON.stringify(fundamentals),
      technicals: JSON.stringify(technicals),
      historicalRaw: JSON.stringify(cleanRows),
      lastDeepSync: now,
      lastPriceSync: now
    }
  });
}

// ── Helpers for IHSG index ────────────────────────────────────────────────

async function upsertIndexData(ticker, quote) {
  const currentPrice = safeNumber(quote.regularMarketPrice, 0);
  const computedPercent = getChangePercent(quote);

  await prisma.stockData.upsert({
    where: { ticker },
    update: {
      price: currentPrice,
      changePercent: computedPercent,
      volume: quote.regularMarketVolume != null ? BigInt(Math.round(Number(quote.regularMarketVolume))) : undefined,
      avgVolume3mo: quote.averageDailyVolume3Month != null ? BigInt(Math.round(Number(quote.averageDailyVolume3Month))) : undefined,
      lastPriceSync: new Date()
    },
    create: {
      ticker,
      name: 'IHSG',
      price: currentPrice,
      changePercent: computedPercent,
      volume: BigInt(Math.round(Number(quote.regularMarketVolume || 0))),
      avgVolume3mo: BigInt(Math.round(Number(quote.averageDailyVolume3Month || 0))),
      lastPriceSync: new Date()
    }
  });
}

// ── Ticker Normalization ──────────────────────────────────────────────────

function toYahooTicker(ticker) {
  if (!ticker) return ticker;
  if (ticker.startsWith('^') || ticker.includes('.')) return ticker;
  return `${ticker}.JK`;
}

function normalizeDbTicker(ticker) {
  if (!ticker) return ticker;
  return ticker.endsWith('.JK') ? ticker.slice(0, -3) : ticker;
}

// ── Promise Utilities ─────────────────────────────────────────────────────

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Value Normalization ───────────────────────────────────────────────────

function normalizePercent(value, fallback) {
  if (value == null || !Number.isFinite(Number(value))) return fallback;
  const num = Number(value);
  // API Yahoo (yahoo-finance2) selalu mengembalikan persentase dalam bentuk desimal fraksional 
  // (misalnya: 0.05 untuk 5%, 1.2 untuk 120%). 
  // Kita kalikan 100 secara eksplisit untuk menyimpannya sebagai format angka bulat persentase.
  return num * 100;
}

function normalizeRatio(value, fallback) {
  if (value == null || !Number.isFinite(Number(value))) return fallback;
  const num = Number(value);
  // Yahoo Finance selalu mengembalikan Debt-to-Equity (DER) dalam format persentase (e.g. 80 untuk 0.8x, 350 untuk 3.5x).
  // Kita selalu membaginya dengan 100 agar tersimpan sebagai rasio murni.
  return num / 100;
}

function safeNumber(value, fallback) {
  if (value == null || !Number.isFinite(Number(value))) return fallback;
  return Number(value);
}

function getChangePercent(quote) {
  const direct = quote?.regularMarketChangePercent;
  if (Number.isFinite(direct)) return Number(direct);

  const change = quote?.regularMarketChange;
  const prev = quote?.regularMarketPreviousClose;
  if (Number.isFinite(change) && Number.isFinite(prev) && prev !== 0) {
    return (Number(change) / Number(prev)) * 100;
  }
  return 0;
}
