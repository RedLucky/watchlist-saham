/**
 * Hard Filter — stocks MUST pass ALL criteria to be included.
 * This is the first gate — no exceptions.
 *
 * Sector-aware: DER threshold is skipped for Financials (banks naturally have high DER).
 */

const FINANCIALS_SECTOR = 'Financials';

export function applyHardFilter(stocks) {
  return stocks.filter(stock => {
    const fundamentals = stock?.fundamentals || {};
    const profits = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit.filter(p => Number.isFinite(p)) : [];
    const txnAvg = Number(stock?.transactionAvg || 0);
    const sector = stock?.sector || '';

    // ROE ≥ 8% (lowered from 10% to include more quality stocks)
    const roe = fundamentals.roe;
    if (Number.isFinite(roe) && roe < 8) {
      return false;
    }
    // If ROE data is missing (null), we still pass — let scoring handle it

    // Net profit positive for available years (if data exists)
    if (profits.length >= 2 && profits.some(p => p <= 0)) {
      return false;
    }
    // If netProfit is null/empty, we still pass — data might not be synced yet

    // DER ≤ 1.5 — SKIP for Financials sector (banks naturally have high DER)
    if (sector !== FINANCIALS_SECTOR) {
      const der = fundamentals.der;
      if (Number.isFinite(der) && der > 1.5) {
        return false;
      }
    }

    // Avg daily turnover ≥ 30M IDR/day
    if (txnAvg < 30000000) {
      return false;
    }

    // Not suspended or abnormal
    if (stock.status !== 'active') {
      return false;
    }

    return true;
  });
}

export function getFilterReasons(stock) {
  const reasons = [];
  const fundamentals = stock?.fundamentals || {};
  const sector = stock?.sector || '';

  if (Number.isFinite(fundamentals.roe) && fundamentals.roe < 8) {
    reasons.push(`ROE ${fundamentals.roe.toFixed(1)}% is below minimum 8%`);
  }

  const profits = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit.filter(p => Number.isFinite(p)) : [];
  if (profits.length >= 2 && profits.some(p => p <= 0)) {
    reasons.push('Net profit was negative in at least one recent year');
  }

  if (sector !== FINANCIALS_SECTOR && Number.isFinite(fundamentals.der) && fundamentals.der > 1.5) {
    reasons.push(`DER ${fundamentals.der.toFixed(2)} exceeds maximum 1.5 (non-financial sector)`);
  }

  if (Number(stock?.transactionAvg || 0) < 30000000) {
    reasons.push('Average daily turnover below 30M IDR');
  }

  if (stock?.status !== 'active') {
    reasons.push(`Stock status is ${stock?.status}`);
  }

  return reasons;
}
