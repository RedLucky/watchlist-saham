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
import { getSectorByTicker, getSubSectorByTicker, getAllTickersForYahoo } from './sectorUniverse';
import { calculateMA, calculateRSI, calculateATR, calculateMACD, calculateBollingerBands } from './indicators';

const DEEP_SYNC_TIMEOUT_MS = parseInt(process.env.DEEP_SYNC_TIMEOUT_MS || '30000', 10);
const DEEP_SYNC_RETRIES = parseInt(process.env.DEEP_SYNC_RETRIES || '1', 10);
const RETRY_DELAY_MS = 1500;

export async function ensureAllUniverseTickersSeeded() {
  try {
    const universeTickers = getAllTickersForYahoo().map(t => normalizeDbTicker(t));
    const dbStocks = await prisma.stockData.findMany({ select: { ticker: true } });
    const dbSet = new Set(dbStocks.map(s => s.ticker));

    const missing = universeTickers.filter(t => t !== '^JKSE' && !dbSet.has(t));
    if (missing.length > 0) {
      console.log(`[Seed] Memasukkan ${missing.length} saham baru dari universe ke DB...`);
      for (const ticker of missing) {
        const sector = getSectorByTicker(ticker);
        const subSector = getSubSectorByTicker(ticker);
        await prisma.stockData.upsert({
          where: { ticker },
          update: {},
          create: {
            ticker,
            name: ticker,
            sector: sector === 'INDEX' ? null : sector,
            subSector,
            price: 0,
            lastPriceSync: new Date(0),
            lastDeepSync: new Date(0)
          }
        });
      }
    }
  } catch (e) {
    console.error('[Seed Error]', e.message);
  }
}

/**
 * Gets the X tickers that haven't been deep-synced for the longest time.
 */
export async function getOldestDeepSyncTickers(limit = 5) {
  const dbStocks = await prisma.stockData.findMany({
    where: { isDelisted: false },
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
    where: { isDelisted: false },
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
export async function fastSyncPrices(limit = 250) {
  console.log(`[FastSync] Memulai sinkronisasi harga & volume (Round-Robin Queue, limit: ${limit || 'ALL'})...`);
  
  // Pastikan semua ticker di sectorUniverse sudah terdaftar di DB
  await ensureAllUniverseTickersSeeded();

  // 1. Ambil ticker yang paling lama tidak di-update (Round-Robin).
  const dbStocks = await prisma.stockData.findMany({
    where: { NOT: { ticker: '^JKSE' }, isDelisted: false },
    orderBy: { lastPriceSync: 'asc' },
    ...(limit ? { take: limit } : {}),
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
  
  const chunkSize = 50;
  let updatedCount = 0;

  for (let i = 0; i < tickersToSync.length; i += chunkSize) {
    const chunk = tickersToSync.slice(i, i + chunkSize);
    let quotesList = [];

    // TAHAP 1: Coba Batch Query (1 HTTP Request untuk 50 Ticker)
    try {
      const rawBatch = await withTimeout(
        yahooFinance.quote(chunk, {}, { validateResult: false }),
        15000,
        `FastSync batch quote timeout (chunk ${i / chunkSize + 1})`
      );
      quotesList = Array.isArray(rawBatch) ? rawBatch : (rawBatch ? [rawBatch] : []);
    } catch (batchErr) {
      console.warn(`[FastSync] Batch quote warning: ${batchErr.message || batchErr}. Fallback to individual settled quotes...`);
      // Fallback: Jika batch gagal, ambil per ticker dengan Promise.allSettled
      try {
        const settled = await Promise.allSettled(
          chunk.map(t => withTimeout(yahooFinance.quote(t, {}, { validateResult: false }), 8000, `Quote timeout ${t}`))
        );
        quotesList = settled
          .filter(r => r.status === 'fulfilled' && r.value?.symbol)
          .map(r => r.value);
      } catch (fallbackErr) {
        console.error(`[FastSync] Fallback settled error:`, fallbackErr.message);
      }
    }

    // TAHAP 2: Upsert Quotes ke Database
    for (const quote of quotesList) {
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

    // Small delay between chunks to avoid Yahoo rate limits
    if (i + chunkSize < tickersToSync.length) {
      await new Promise(r => setTimeout(r, 100));
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
  const tickerClean = normalizeDbTicker(fullTicker);

  const stockRec = await prisma.stockData.findUnique({
    where: { ticker: tickerClean },
    select: { isDelisted: true }
  });

  if (stockRec?.isDelisted) {
    console.log(`[DeepSync] ⊘ Skipping delisted stock: ${tickerClean}`);
    return { success: false, ticker: fullTicker, skipped: true, error: 'Delisted stock' };
  }

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
        // ALWAYS update lastDeepSync so we don't get stuck retrying the same failing ticker in an infinite loop!
        const isDelisted = message.toLowerCase().includes('delisted') ||
                           message.toLowerCase().includes('no data found') ||
                           message.toLowerCase().includes('not found') ||
                           message.includes('404');
        try {
          await prisma.stockData.update({
            where: { ticker: tickerClean },
            data: {
              lastDeepSync: new Date(),
              ...(isDelisted ? { isDelisted: true } : {})
            }
          });
          if (isDelisted) {
            console.log(`[DeepSync] ⊘ Marked ${tickerClean} as delisted in database.`);
          }
        } catch (_dbErr) {}

        return { success: false, ticker: fullTicker, attempt, timedOut, error: message };
      }

      await sleep(RETRY_DELAY_MS * attempt); // Increasing delay
    }
  }
}

async function deepSyncStockOnce(fullTicker) {
  const tickerClean = normalizeDbTicker(fullTicker);
  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 5); // 5 years of historical data for long-term pension analysis
  
  // OPTIMIZATION: Check existing 10-year dividend history in DB
  const existingDbStock = await prisma.stockData.findUnique({ 
    where: { ticker: tickerClean }, 
    select: { fundamentals: true }
  });
  
  let existingDivHistory = [];
  if (existingDbStock?.fundamentals) {
     try {
       const fund = JSON.parse(existingDbStock.fundamentals);
       if (Array.isArray(fund.yahooDividendHistory) && fund.yahooDividendHistory.length > 0) {
          existingDivHistory = fund.yahooDividendHistory;
       }
     } catch (e) {}
  }

  const periodDiv = new Date();
  if (existingDivHistory.length > 0) {
      periodDiv.setFullYear(periodDiv.getFullYear() - 1); // Only fetch delta (last 1 year) if we already have 10 years cached
  } else {
      periodDiv.setFullYear(periodDiv.getFullYear() - 10); // Fetch full 10 years
  }

  let quote;
  let historical;
  let summary = {};
  let divHistoryRaw = [];
  try {
    [quote, historical, summary, divHistoryRaw] = await Promise.all([
      withTimeout(yahooFinance.quote(fullTicker, {}, { validateResult: false }), 15000, `Quote timeout for ${fullTicker}`),
      withTimeout(
        yahooFinance.historical(fullTicker, {
          period1: period1.toISOString().split('T')[0],
          period2: period2.toISOString().split('T')[0],
          interval: '1d'
        }, { validateResult: false }),
        20000,
        `Historical timeout for ${fullTicker}`
      ),
      withTimeout(
        yahooFinance.quoteSummary(fullTicker, {
          modules: ['price', 'financialData', 'earnings', 'defaultKeyStatistics', 'summaryDetail']
        }, { validateResult: false }),
        20000,
        `QuoteSummary timeout for ${fullTicker}`
      ).catch(() => ({})),
      withTimeout(
        yahooFinance.historical(fullTicker, {
          period1: periodDiv.toISOString().split('T')[0],
          period2: period2.toISOString().split('T')[0],
          events: 'dividends'
        }, { validateResult: false }),
        20000,
        `Dividend history timeout for ${fullTicker}`
      ).catch(() => ([]))
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

  const yearlyFinancials = summary?.earnings?.financialsChart?.yearly || [];
  const netProfit = yearlyFinancials.length >= 2
    ? yearlyFinancials.slice(-3).map(y => Number(y?.earnings) || 0)
    : null; // null = data not available, let scoring handle it

  const roeRaw = summary?.financialData?.returnOnEquity ?? quote?.returnOnEquity;
  const derRaw = summary?.financialData?.debtToEquity ?? quote?.debtToEquity;
  const dividendYieldRaw = summary?.summaryDetail?.dividendYield ?? quote?.trailingAnnualDividendYield;
  const payoutRaw = summary?.summaryDetail?.payoutRatio;
  const revenueGrowthRaw = summary?.financialData?.revenueGrowth;
  const cashRaw = summary?.financialData?.totalCash;
  const currentRatioRaw = summary?.financialData?.currentRatio;
  const freeCashflowRaw = summary?.financialData?.freeCashflow;

  // Merge newly fetched dividends with cached 10-year dividends (Append + Idempotent Dedup)
  const mergedDivHistory = [...existingDivHistory];
  const getDateStr = (d) => {
      try { return new Date(d.date).toISOString().split('T')[0]; } 
      catch(e) { return null; }
  };

  if (Array.isArray(divHistoryRaw)) {
      for (const newDiv of divHistoryRaw) {
          const newDateStr = getDateStr(newDiv);
          if (newDateStr && !mergedDivHistory.some(d => getDateStr(d) === newDateStr)) {
              mergedDivHistory.push(newDiv);
          }
      }
  }
  // Sort ascending by date
  mergedDivHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Dividend Streak based on the complete merged history (18-month corporate action window)
  let streakYears = 0;
  if (mergedDivHistory.length > 0) {
    const sortedDesc = [...mergedDivHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const now = new Date();
    const latestDate = new Date(sortedDesc[0].date);
    const monthsSinceLatest = (now.getTime() - latestDate.getTime()) / (1000 * 3600 * 24 * 30.44);
    
    if (monthsSinceLatest <= 18) {
      const uniqueYears = new Set();
      uniqueYears.add(latestDate.getFullYear());
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        const current = new Date(sortedDesc[i].date);
        const prev = new Date(sortedDesc[i + 1].date);
        const monthsGap = (current.getTime() - prev.getTime()) / (1000 * 3600 * 24 * 30.44);
        if (monthsGap <= 18) {
          uniqueYears.add(prev.getFullYear());
        } else {
          break;
        }
      }
      streakYears = uniqueYears.size;
    }
  }

  const currentPrice = safeNumber(quote?.regularMarketPrice, prices[prices.length - 1] || 0);
  const sharesOutstanding = Number(summary?.defaultKeyStatistics?.sharesOutstanding ?? quote?.sharesOutstanding ?? 0);
  const calculatedMarketCap = (currentPrice > 0 && sharesOutstanding > 0) ? (currentPrice * sharesOutstanding) : null;
  const resolvedMarketCap = safeNumber(summary?.summaryDetail?.marketCap ?? summary?.price?.marketCap ?? quote?.marketCap, calculatedMarketCap);

  const fundamentals = {
    roe: normalizePercent(roeRaw, null),
    der: normalizeRatio(derRaw, null),
    netProfit,
    per: safeNumber(summary?.summaryDetail?.trailingPE ?? quote?.trailingPE, null),
    pbv: (() => {
      const raw = safeNumber(summary?.defaultKeyStatistics?.priceToBook ?? quote?.priceToBook, null);
      if (raw !== null && raw > 500) return Number((raw / 16200).toFixed(2));
      return raw !== null ? Number(raw.toFixed(2)) : null;
    })(),
    dividendYield: normalizePercent(dividendYieldRaw, 0),
    payoutRatio: normalizePercent(payoutRaw, 0),
    dividendStreakYears: streakYears,
    yahooDividendHistory: mergedDivHistory,
    revenueGrowth: normalizePercent(revenueGrowthRaw, null),
    cash: Number.isFinite(cashRaw) ? Number(cashRaw) : 0,
    currentRatio: safeNumber(currentRatioRaw, null),
    freeCashflow: safeNumber(freeCashflowRaw, null),
    sharesOutstanding: sharesOutstanding > 0 ? sharesOutstanding : null,
    marketCap: resolvedMarketCap,
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
    support: safeNumber(quote?.fiftyTwoWeekLow, (() => { const pos = prices.filter(p => p > 0); return pos.length > 0 ? Math.min(...pos) * 0.98 : prices[prices.length - 1] || 0; })()),
    atr14: calculateATR(cleanRows, 14),
    macd,
    bollingerBands: bb,
  };

  // ── Persist to Database ───────────────────────────────────────────────

  const sector = getSectorByTicker(tickerClean);
  const subSector = getSubSectorByTicker(tickerClean);
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
      subSector: subSector,
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
      subSector: subSector,
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
  // Yahoo Finance mengembalikan Debt-to-Equity dalam format tidak konsisten:
  // Kadang sebagai persentase (e.g. 85 = 0.85x, 350 = 3.5x),
  // kadang sudah dalam format rasio (e.g. 0.85, 3.5).
  // Guard: jika nilai < 10, asumsikan sudah dalam format rasio (DER nyata jarang > 10x);
  // jika >= 10, bagi 100 untuk konversi dari persentase ke rasio.
  if (Math.abs(num) < 10) return num;
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
