import { yahooFinance } from './yahooClient.js';

// In-memory cache for Real-Time Forex Rates (IDR pairs)
let forexCache = {
  USD: 16500, // Baseline fallback
  SGD: 12500,
  EUR: 17800,
  AUD: 10800,
  CNY: 2300,
  JPY: 110,
  GBP: 21500,
  lastUpdated: 0
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes

/**
 * Fetch real-time foreign exchange rates from Yahoo Finance
 */
export async function refreshForexRates(force = false) {
  const now = Date.now();
  if (!force && now - forexCache.lastUpdated < CACHE_TTL_MS) {
    return forexCache;
  }

  try {
    const symbols = ['USDIDR=X', 'SGDIDR=X', 'EURIDR=X', 'AUDIDR=X', 'CNYIDR=X', 'JPYIDR=X', 'GBPIDR=X'];
    const quotes = await yahooFinance.quote(symbols);
    
    if (Array.isArray(quotes)) {
      quotes.forEach(q => {
        const price = q.regularMarketPrice || q.ask || q.bid;
        if (price && price > 0) {
          if (q.symbol === 'USDIDR=X') forexCache.USD = price;
          else if (q.symbol === 'SGDIDR=X') forexCache.SGD = price;
          else if (q.symbol === 'EURIDR=X') forexCache.EUR = price;
          else if (q.symbol === 'AUDIDR=X') forexCache.AUD = price;
          else if (q.symbol === 'CNYIDR=X') forexCache.CNY = price;
          else if (q.symbol === 'JPYIDR=X') forexCache.JPY = price;
          else if (q.symbol === 'GBPIDR=X') forexCache.GBP = price;
        }
      });
      forexCache.lastUpdated = now;
    }
  } catch (err) {
    console.warn('[ForexService] Failed to fetch live exchange rates, using fallback:', err.message);
  }

  return forexCache;
}

/**
 * Get the current exchange rate for a given currency symbol to IDR (Synchronous with live cache)
 */
export function getExchangeRateSync(currency) {
  if (!currency) return 1;
  const c = String(currency).toUpperCase().trim();
  if (c === 'IDR' || c === 'RP') return 1;
  if (c === 'USD' || c === 'US$' || c === 'DOLLAR' || c === 'VALAS') return forexCache.USD;
  if (c === 'SGD' || c === 'S$') return forexCache.SGD;
  if (c === 'EUR' || c === '€') return forexCache.EUR;
  if (c === 'AUD' || c === 'A$') return forexCache.AUD;
  if (c === 'CNY' || c === 'RMB' || c === '¥') return forexCache.CNY;
  if (c === 'JPY' || c === 'YEN') return forexCache.JPY;
  if (c === 'GBP' || c === '£') return forexCache.GBP;
  return 1;
}

/**
 * Async version that ensures fresh rates if cache is stale
 */
export async function getExchangeRate(currency) {
  if (!currency) return 1;
  if (Date.now() - forexCache.lastUpdated > CACHE_TTL_MS) {
    await refreshForexRates().catch(() => {});
  }
  return getExchangeRateSync(currency);
}

/**
 * Convert any amount in foreign currency to IDR
 */
export function convertToIDR(amount, currency) {
  const num = Number(amount) || 0;
  if (num === 0) return 0;
  const rate = getExchangeRateSync(currency);
  return num * rate;
}

export function getAllForexRates() {
  return { ...forexCache };
}
