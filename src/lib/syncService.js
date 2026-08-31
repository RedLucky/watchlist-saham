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

    // TAHAP 2: Batch Upsert Quotes ke Database (menggunakan $transaction untuk efisiensi)
    const upsertOps = [];
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

        upsertOps.push(prisma.stockData.upsert({
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
        }));
      } catch (dbErr) {
        console.error(`[FastSync] DB Error for ${quote.symbol}:`, dbErr.message);
      }
    }

    // Execute batch transaction
    if (upsertOps.length > 0) {
      try {
        await prisma.$transaction(upsertOps);
        updatedCount += upsertOps.length;
      } catch (txErr) {
        console.error(`[FastSync] Batch transaction error, falling back to individual:`, txErr.message);
        // Fallback ke individual upsert jika batch gagal
        for (const op of upsertOps) {
          try { await op; updatedCount++; } catch (e) {}
        }
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
          period1: formatDateWIB(period1),
          period2: formatDateWIB(period2),
          interval: '1d'
        }, { validateResult: false }),
        20000,
        `Historical timeout for ${fullTicker}`
      ),
      withTimeout(
        yahooFinance.quoteSummary(fullTicker, {
          modules: ['price', 'financialData', 'earnings', 'defaultKeyStatistics', 'summaryDetail', 'incomeStatementHistory']
        }, { validateResult: false }),
        20000,
        `QuoteSummary timeout for ${fullTicker}`
      ).catch(() => ({})),
      withTimeout(
        yahooFinance.historical(fullTicker, {
          period1: formatDateWIB(periodDiv),
          period2: formatDateWIB(period2),
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
  const roaRaw = summary?.financialData?.returnOnAssets;
  const derRaw = summary?.financialData?.debtToEquity ?? quote?.debtToEquity;
  const opmRaw = summary?.financialData?.operatingMargins;
  const gpmRaw = summary?.financialData?.grossMargins;
  const npmRaw = summary?.financialData?.profitMargins;
  const ebitdaMarginRaw = summary?.financialData?.ebitdaMargins;
  const dividendYieldRaw = summary?.summaryDetail?.dividendYield ?? quote?.trailingAnnualDividendYield;
  const payoutRaw = summary?.summaryDetail?.payoutRatio;
  const revenueGrowthRaw = summary?.financialData?.revenueGrowth;
  const cashRaw = summary?.financialData?.totalCash;
  const currentRatioRaw = summary?.financialData?.currentRatio;
  const freeCashflowRaw = summary?.financialData?.freeCashflow;

  // ── Data baru: Revenue, Net Income, Balance Sheet proxies ──
  const totalRevenueRaw = summary?.financialData?.totalRevenue ?? summary?.incomeStatementHistory?.incomeStatementHistory?.[0]?.totalRevenue;
  const netIncomeRaw = summary?.financialData?.netIncomeToCommon ?? summary?.incomeStatementHistory?.incomeStatementHistory?.[0]?.netIncome;
  const bookValueRaw = summary?.defaultKeyStatistics?.bookValue;
  const forwardPERaw = summary?.summaryDetail?.forwardPE ?? quote?.forwardPE;
  const pegRatioRaw = summary?.defaultKeyStatistics?.pegRatio;
  const enterpriseValueRaw = summary?.defaultKeyStatistics?.enterpriseValue;
  const dividendRateRaw = summary?.summaryDetail?.dividendRate ?? quote?.trailingAnnualDividendRate;
  const betaRaw = summary?.defaultKeyStatistics?.beta ?? summary?.summaryDetail?.beta;
  const fiftyTwoWeekHighRaw = summary?.summaryDetail?.fiftyTwoWeekHigh ?? quote?.fiftyTwoWeekHigh;
  const fiftyTwoWeekLowRaw = summary?.summaryDetail?.fiftyTwoWeekLow ?? quote?.fiftyTwoWeekLow;
  const earningsGrowthRaw = summary?.financialData?.earningsGrowth;
  const operatingCashflowRaw = summary?.financialData?.operatingCashflow;
  const totalDebtRaw = summary?.financialData?.totalDebt;

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

  const perResolved = safeNumber(summary?.summaryDetail?.trailingPE ?? quote?.trailingPE, null);
  const trailingEpsRaw = summary?.defaultKeyStatistics?.trailingEps ?? quote?.epsTrailingTwelveMonths;
  const forwardEpsRaw = summary?.defaultKeyStatistics?.forwardEps ?? quote?.epsForward;
  // EPS: Prioritaskan sumber langsung, fallback hanya jika sumber terpercaya
  const resolvedEps = safeNumber(trailingEpsRaw, null);

  // ── Currency Normalization for USD-reporting IDX stocks (e.g. AADI, ADRO, MEDC, ITMG, HRUM) ──
  const financialCurrency = summary?.financialData?.financialCurrency || summary?.defaultKeyStatistics?.financialCurrency;
  const isUSDReporting = financialCurrency === 'USD' || (bookValueRaw != null && bookValueRaw > 0 && bookValueRaw < 50 && (summary?.defaultKeyStatistics?.priceToBook > 500 || currentPrice > 100));
  const USD_IDR_RATE = 16500;

  let resolvedBookValue = safeNumber(bookValueRaw, null);
  let resolvedPBV = safeNumber(summary?.defaultKeyStatistics?.priceToBook ?? quote?.priceToBook, null);
  let resolvedTotalRevenue = safeNumber(totalRevenueRaw, null);
  let resolvedNetIncome = safeNumber(netIncomeRaw, null);
  let resolvedCash = Number.isFinite(cashRaw) ? Number(cashRaw) : 0;
  let resolvedTotalDebt = safeNumber(totalDebtRaw, null);
  let resolvedOperatingCashflow = safeNumber(operatingCashflowRaw, null);
  let resolvedFreeCashflow = safeNumber(freeCashflowRaw, null);

  if (isUSDReporting) {
    if (resolvedBookValue != null && resolvedBookValue > 0 && resolvedBookValue < 100) {
      resolvedBookValue = Number((resolvedBookValue * USD_IDR_RATE).toFixed(2));
    }
    if (resolvedPBV != null && resolvedPBV > 500) {
      resolvedPBV = Number((resolvedPBV / USD_IDR_RATE).toFixed(2));
    } else if (currentPrice > 0 && resolvedBookValue > 0) {
      resolvedPBV = Number((currentPrice / resolvedBookValue).toFixed(2));
    }
    // Scale balance sheet & income statement USD values to IDR
    if (resolvedTotalRevenue != null && resolvedTotalRevenue > 0 && resolvedTotalRevenue < 500_000_000_000) {
      resolvedTotalRevenue = Math.round(resolvedTotalRevenue * USD_IDR_RATE);
    }
    if (resolvedNetIncome != null && Math.abs(resolvedNetIncome) < 100_000_000_000) {
      resolvedNetIncome = Math.round(resolvedNetIncome * USD_IDR_RATE);
    }
    if (resolvedCash > 0 && resolvedCash < 100_000_000_000) {
      resolvedCash = Math.round(resolvedCash * USD_IDR_RATE);
    }
    if (resolvedTotalDebt != null && resolvedTotalDebt > 0 && resolvedTotalDebt < 100_000_000_000) {
      resolvedTotalDebt = Math.round(resolvedTotalDebt * USD_IDR_RATE);
    }
    if (resolvedOperatingCashflow != null && Math.abs(resolvedOperatingCashflow) < 100_000_000_000) {
      resolvedOperatingCashflow = Math.round(resolvedOperatingCashflow * USD_IDR_RATE);
    }
    if (resolvedFreeCashflow != null && Math.abs(resolvedFreeCashflow) < 100_000_000_000) {
      resolvedFreeCashflow = Math.round(resolvedFreeCashflow * USD_IDR_RATE);
    }
  }

  const fundamentals = {
    roe: normalizePercent(roeRaw, null),
    roa: normalizePercent(roaRaw, null),
    der: normalizeRatio(derRaw, null),
    opm: normalizePercent(opmRaw, null),
    gpm: normalizePercent(gpmRaw, null),
    npm: normalizePercent(npmRaw, null),
    ebitdaMargin: normalizePercent(ebitdaMarginRaw, null),
    netProfit,
    eps: resolvedEps,
    forwardEps: safeNumber(forwardEpsRaw, null),
    per: perResolved,
    pbv: resolvedPBV,
    bookValue: resolvedBookValue,
    forwardPE: safeNumber(forwardPERaw, null),
    pegRatio: safeNumber(pegRatioRaw, null),
    dividendYield: normalizePercent(dividendYieldRaw, 0),
    dividendRate: safeNumber(dividendRateRaw, null),
    payoutRatio: normalizePercent(payoutRaw, 0),
    dividendStreakYears: streakYears,
    yahooDividendHistory: mergedDivHistory,
    revenueGrowth: normalizePercent(revenueGrowthRaw, null),
    earningsGrowth: normalizePercent(earningsGrowthRaw, null),
    totalRevenue: resolvedTotalRevenue,
    netIncome: resolvedNetIncome,
    enterpriseValue: safeNumber(enterpriseValueRaw, null),
    cash: resolvedCash,
    totalDebt: resolvedTotalDebt,
    operatingCashflow: resolvedOperatingCashflow,
    currentRatio: safeNumber(currentRatioRaw, null),
    freeCashflow: resolvedFreeCashflow,
    sharesOutstanding: sharesOutstanding > 0 ? sharesOutstanding : null,
    marketCap: resolvedMarketCap,
    beta: safeNumber(betaRaw, null),
    fiftyTwoWeekHigh: safeNumber(fiftyTwoWeekHighRaw, null),
    fiftyTwoWeekLow: safeNumber(fiftyTwoWeekLowRaw, null),
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

// Format tanggal dalam timezone WIB (UTC+7) agar historical candle tidak terlewat
function formatDateWIB(date) {
  const d = new Date(date.getTime() + 7 * 3600 * 1000); // offset WIB
  return d.toISOString().split('T')[0];
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
  // Yahoo Finance financialData.debtToEquity SELALU mengembalikan format persentase
  // (e.g. 85.5 = 0.855x, 350 = 3.5x). Selalu bagi 100.
  // Jika nilainya sudah < 1 (sangat kecil), kemungkinan sudah dalam format rasio (edge case).
  if (Math.abs(num) < 1) return num; // sudah rasio (e.g. 0.85)
  return Number((num / 100).toFixed(4));
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
