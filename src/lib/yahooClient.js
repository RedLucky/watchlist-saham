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
} catch (_e) {
  /* noop */
}

try {
  if (typeof yf?.suppressNotices === 'function') {
    yf.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']);
  }
  if (typeof yahooFinance?.suppressNotices === 'function') {
    yahooFinance.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']);
  }
} catch (_e) { /* noop */ }

try {
  if (typeof yahooFinance._setOpts === 'function') {
    yahooFinance._setOpts({
      validation: {
        logErrors: false,
        logOptionsErrors: false,
        allowAdditionalProps: true,
      }
    });
  }
} catch (_e) { /* noop */ }

export { yahooFinance };
