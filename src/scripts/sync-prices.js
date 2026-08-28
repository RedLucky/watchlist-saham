const { PrismaClient } = require('@prisma/client');
const yf = require('yahoo-finance2');

const prisma = new PrismaClient();

let yahooFinance = yf;
try {
  const YfModule = yf.default || yf;
  if (typeof YfModule === 'function') {
    yahooFinance = new YfModule();
  } else if (YfModule && YfModule.quote) {
    yahooFinance = YfModule;
  }
} catch (_e) {}

try {
  yahooFinance.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']);
} catch (_e) {}

function toYahooTicker(ticker) {
  if (!ticker) return '';
  const clean = ticker.trim().toUpperCase();
  if (clean.startsWith('^') || clean.endsWith('.JK')) return clean;
  return `${clean}.JK`;
}

function normalizeDbTicker(symbol) {
  if (!symbol) return '';
  return symbol.replace(/\.JK$/i, '').trim().toUpperCase();
}

function safeNumber(val, defaultVal = 0) {
  if (val == null || isNaN(val)) return defaultVal;
  const n = Number(val);
  return isFinite(n) ? n : defaultVal;
}

function getChangePercent(quote) {
  if (quote.regularMarketChangePercent != null && isFinite(quote.regularMarketChangePercent)) {
    return Number(quote.regularMarketChangePercent);
  }
  const current = safeNumber(quote.regularMarketPrice, 0);
  const prev = safeNumber(quote.regularMarketPreviousClose, 0);
  if (prev > 0) {
    return Number((((current - prev) / prev) * 100).toFixed(4));
  }
  return 0;
}

function withTimeout(promise, ms, errorMsg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg || `Timeout after ${ms}ms`)), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Main Fast Price Sync execution
 */
async function syncAllPrices(limit = null) {
  console.log(`=== [PRICE-SYNC] STARTING LIVE PRICE SYNC (${new Date().toLocaleString('id-ID')}) ===`);

  const dbStocks = await prisma.stockData.findMany({
    where: { NOT: { ticker: '^JKSE' }, isDelisted: false },
    orderBy: { lastPriceSync: 'asc' },
    ...(limit ? { take: limit } : {}),
    select: { ticker: true }
  });

  const tickersToSync = dbStocks.map(s => toYahooTicker(s.ticker));
  if (tickersToSync.length > 0) {
    tickersToSync.push('^JKSE'); // Always sync IHSG
  }

  console.log(`[PRICE-SYNC] Processing ${tickersToSync.length} stocks...`);

  const chunkSize = 25; // Safe chunk size to avoid Yahoo batch drops
  let updatedCount = 0;

  for (let i = 0; i < tickersToSync.length; i += chunkSize) {
    const chunk = tickersToSync.slice(i, i + chunkSize);
    let quotesList = [];

    // TAHAP 1: Coba Batch Query
    try {
      const rawBatch = await withTimeout(
        yahooFinance.quote(chunk, {}, { validateResult: false }),
        12000,
        `PriceSync batch timeout (chunk ${Math.floor(i / chunkSize) + 1})`
      );
      quotesList = Array.isArray(rawBatch) ? rawBatch : (rawBatch ? [rawBatch] : []);
    } catch (batchErr) {
      console.warn(`[PRICE-SYNC] Batch warning: ${batchErr.message || batchErr}. Falling back to individual quotes...`);
      try {
        const settled = await Promise.allSettled(
          chunk.map(t => withTimeout(yahooFinance.quote(t, {}, { validateResult: false }), 6000, `Quote timeout ${t}`))
        );
        quotesList = settled
          .filter(r => r.status === 'fulfilled' && r.value?.symbol)
          .map(r => r.value);
      } catch (fallbackErr) {
        console.error(`[PRICE-SYNC] Fallback settled error:`, fallbackErr.message);
      }
    }

    // TAHAP 2: Upsert Quotes ke Database
    for (const quote of quotesList) {
      if (!quote?.symbol) continue;

      try {
        const ticker = normalizeDbTicker(quote.symbol);
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
            lastPriceSync: new Date()
          }
        });
        updatedCount++;
      } catch (dbErr) {
        console.error(`[PRICE-SYNC] DB Error for ${quote.symbol}:`, dbErr.message);
      }
    }

    // Small delay between chunks
    if (i + chunkSize < tickersToSync.length) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.log(`[PRICE-SYNC] [SUCCESS] Updated ${updatedCount} stocks in database.`);
  return updatedCount;
}

if (require.main === module) {
  syncAllPrices()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = { syncAllPrices };
