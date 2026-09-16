/**
 * Bloomberg Economic Value Added (EVA) & ROIC vs WACC Engine
 *
 * Evaluates whether a company creates true economic wealth for shareholders:
 * - WACC = (We * Ke) + (Wd * Kd * (1 - T))
 * - Ke via CAPM: Rf + Beta * ERP
 * - ROIC = NOPAT / Invested Capital
 * - Economic Spread = ROIC - WACC
 * - Verdict: Value Creator vs Value Destroyer
 */

const DEFAULT_RISK_FREE_RATE = 6.5; // SBN 10-Tahun Indonesia (~6.5%)
const DEFAULT_EQUITY_RISK_PREMIUM = 5.5; // ERP Pasar Modal Indonesia (~5.5%)
const DEFAULT_CORPORATE_TAX_RATE = 0.22; // Tarif PPh Badan RI (22%)
const DEFAULT_COST_OF_DEBT = 8.0; // Rata-rata suku bunga kredit korporasi bank komersial RI (~8.0%)

/**
 * Calculate institutional WACC and ROIC Economic Spread
 */
export function calculateWaccAndEconomicValue({
  marketCap = 0,
  totalDebt = 0,
  totalEquity = 0,
  totalRevenue = 0,
  operatingIncome = null,
  opm = null,
  netIncome = 0,
  cash = 0,
  beta = 1.0,
  riskFreeRate = DEFAULT_RISK_FREE_RATE,
  equityRiskPremium = DEFAULT_EQUITY_RISK_PREMIUM,
  taxRate = DEFAULT_CORPORATE_TAX_RATE,
  costOfDebt = DEFAULT_COST_OF_DEBT
}) {
  const E = Math.max(0, Number(marketCap) || 0);
  const D = Math.max(0, Number(totalDebt) || 0);
  const V = E + D;

  if (V <= 0) {
    return null;
  }

  // 1. Cost of Equity (CAPM)
  const safeBeta = Math.max(0.2, Math.min(2.5, Number(beta) || 1.0));
  const Ke = riskFreeRate + (safeBeta * equityRiskPremium);

  // 2. Cost of Debt (After-Tax)
  const Kd = Math.max(2.0, Number(costOfDebt) || DEFAULT_COST_OF_DEBT);
  const afterTaxKd = Kd * (1 - taxRate);

  // 3. Capital Weights
  const We = E / V;
  const Wd = D / V;

  // 4. WACC Calculation
  const wacc = (We * Ke) + (Wd * afterTaxKd);

  // 5. NOPAT (Net Operating Profit After Tax)
  let nopat = 0;
  if (operatingIncome !== null && Number.isFinite(Number(operatingIncome))) {
    nopat = Number(operatingIncome) * (1 - taxRate);
  } else if (opm !== null && Number(totalRevenue) > 0) {
    const opProfit = Number(totalRevenue) * (Number(opm) / 100);
    nopat = opProfit * (1 - taxRate);
  } else {
    // Fallback: proxy NOPAT from Net Income
    nopat = Math.max(0, Number(netIncome) || 0);
  }

  // 6. Invested Capital
  const safeEquity = Math.max(0, Number(totalEquity) || E * 0.4);
  const safeCash = Math.max(0, Number(cash) || 0);
  const investedCapital = Math.max(1, (safeEquity + D) - safeCash);

  // 7. ROIC
  const roic = Number(((nopat / investedCapital) * 100).toFixed(2));

  // 8. Economic Spread & EVA
  const economicSpread = Number((roic - wacc).toFixed(2));
  const eva = Math.round(investedCapital * (economicSpread / 100));

  // 9. Verdict Classification
  let verdict = 'Value Creator';
  let badgeColor = 'emerald';
  let verdictDesc = 'Perusahaan menghasilkan imbal hasil modal di atas biaya modal (Menciptakan nilai riil).';

  if (economicSpread >= 5.0) {
    verdict = 'Super Value Creator 👑';
    badgeColor = 'emerald';
    verdictDesc = 'Moat prima! ROIC jauh melampaui WACC, menghasilkan kekayaan signifikan bagi pemegang saham.';
  } else if (economicSpread > 0) {
    verdict = 'Value Creator ✨';
    badgeColor = 'teal';
    verdictDesc = 'Efisiensi modal sehat. Laba operasional berhasil menutup seluruh biaya modal utang dan ekuitas.';
  } else if (economicSpread >= -3.0) {
    verdict = 'Marginal Destroyer ⚠️';
    badgeColor = 'amber';
    verdictDesc = 'ROIC berada tipis di bawah biaya modal. Efisiensi perputaran aset perlu ditingkatkan.';
  } else {
    verdict = 'Value Destroyer 🚨';
    badgeColor = 'rose';
    verdictDesc = 'Peringatan: Meskipun laba buku tercatat, perusahaan sebenarnya membakar modal ekonomi riil.';
  }

  return {
    wacc: Number(wacc.toFixed(2)),
    roic,
    costOfEquity: Number(Ke.toFixed(2)),
    costOfDebt: Number(Kd.toFixed(2)),
    afterTaxCostOfDebt: Number(afterTaxKd.toFixed(2)),
    weightOfEquityPct: Number((We * 100).toFixed(1)),
    weightOfDebtPct: Number((Wd * 100).toFixed(1)),
    economicSpread,
    eva,
    investedCapital: Math.round(investedCapital),
    nopat: Math.round(nopat),
    beta: Number(safeBeta.toFixed(2)),
    riskFreeRate,
    verdict,
    badgeColor,
    verdictDesc
  };
}
