/**
 * Shared Yahoo Finance v3 Client
 *
 * Single initialization point used by syncService and any other module
 * that needs to talk to Yahoo Finance. Avoids duplicate init code.
 */
import yf from 'yahoo-finance2';

let yahooFinance = yf;

// Robust v3 initialization for any runtime (Next.js, Node ESM/CJS)
try {
  const YfModule = yf.default || yf;
  if (typeof YfModule === 'function') {
    yahooFinance = new YfModule();
  } else if (YfModule && YfModule.quote) {
    yahooFinance = YfModule;
  }
} catch (e) {
  console.warn('[YahooClient] Init warning:', e.message);
}

try {
  yahooFinance.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']);
} catch (_e) { /* noop */ }

export { yahooFinance };
