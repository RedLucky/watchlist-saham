import { ALPHA_LEGEND_SECTORS } from '../data/alphaLegendSectors';

/**
 * Filter stocks according to 10 Top Investors Formulas & Growth Story Framework
 */
export function evaluateAlphaLegends(stocks = []) {
  if (!Array.isArray(stocks) || stocks.length === 0) return [];

  return stocks.map(stock => {
    const passedFormulaKeys = [];
    const evaluationDetails = {};

    // Standardize financial metrics from stock data
    const per = typeof stock.pe === 'number' ? stock.pe : (typeof stock.per === 'number' ? stock.per : Number(stock.pe || stock.per) || 0);
    const pbv = typeof stock.pbv === 'number' ? stock.pbv : Number(stock.pbv) || 0;
    const roe = typeof stock.roe === 'number' ? stock.roe : Number(stock.roe) || 0;
    const der = stock.der != null && Number.isFinite(Number(stock.der)) ? Number(stock.der) : null;
    const currentRatio = stock.currentRatio != null && Number.isFinite(Number(stock.currentRatio)) ? Number(stock.currentRatio) : null;
    const divYield = typeof stock.divYield === 'number' ? stock.divYield : (typeof stock.dividendYield === 'number' ? stock.dividendYield : Number(stock.divYield || stock.dividendYield) || 0);
    const revenueGrowth = typeof stock.revenueGrowth === 'number' ? stock.revenueGrowth : (typeof stock.salesGrowth === 'number' ? stock.salesGrowth : Number(stock.revenueGrowth || stock.salesGrowth) || 0);
    const profitGrowth = typeof stock.profitGrowth === 'number' ? stock.profitGrowth : (typeof stock.epsGrowth === 'number' ? stock.epsGrowth : Number(stock.profitGrowth || stock.epsGrowth) || 0);
    const fcf = typeof stock.fcf === 'number' ? stock.fcf : (typeof stock.freeCashflow === 'number' ? stock.freeCashflow : (typeof stock.freeCashFlow === 'number' ? stock.freeCashFlow : Number(stock.fcf || stock.freeCashflow) || 0));
    const peg = profitGrowth > 0 ? Number((per / profitGrowth).toFixed(2)) : (per > 0 && per <= 15 ? 1.0 : 0);
    const piotroskiFScore = typeof stock.piotroskiFScore === 'number' ? stock.piotroskiFScore : Number(stock.piotroskiFScore) || 5;
    const altmanZScore = typeof stock.altmanZScore === 'number' ? stock.altmanZScore : Number(stock.altmanZScore) || 2.5;
    const streakYears = Number(stock.dividendStreakYears || 0);
    const isFinancial = stock.sector === 'Financials' || (der === null);

    // 1. Warren Buffett Screening (Wide Moat & Predictable Compounders)
    // ROE >= 15%, DER <= 1.0, Revenue Growth >= 8%, PER <= 20, PBV <= 3.5
    const buffettPass = roe >= 15 && (isFinancial || (der !== null && der <= 1.0)) && (profitGrowth >= 8 || revenueGrowth >= 8) && per > 0 && per <= 20 && pbv <= 3.5;
    if (buffettPass) passedFormulaKeys.push('buffett');
    evaluationDetails['buffett'] = { pass: buffettPass, label: 'Warren Buffett', reason: 'ROE ≥ 15%, Utang Rendah, Pertumbuhan Konsisten, Valuasi Masuk Akal' };

    // 2. Ben Graham - Enterprising Investors (Deep Value / Asset Bargains)
    // PER <= 10, PBV <= 1.0, DER <= 1.0, ROE >= 8%
    const grahamEnterprisingPass = per > 0 && per <= 10 && pbv > 0 && pbv <= 1.0 && (isFinancial || (der !== null && der <= 1.0)) && roe >= 8;
    if (grahamEnterprisingPass) passedFormulaKeys.push('graham_enterprising');
    evaluationDetails['graham_enterprising'] = { pass: grahamEnterprisingPass, label: 'Ben Graham (Enterprising)', reason: 'Deep Value (PER ≤ 10, PBV ≤ 1.0), Utang Rendah, ROE Positif' };

    // 3. Ben Graham - Defensive Investors (High Margin of Safety)
    // Graham Number (PER x PBV <= 22.5), PER <= 15, PBV <= 1.5, DER <= 0.8, Div Yield >= 3.0%, Streak >= 5 Thn
    const grahamDefensivePass = per > 0 && pbv > 0 && (per * pbv <= 22.5) && per <= 15 && pbv <= 1.5 && (isFinancial || (der !== null && der <= 0.8)) && divYield >= 3.0 && streakYears >= 5;
    if (grahamDefensivePass) passedFormulaKeys.push('graham_defensive');
    evaluationDetails['graham_defensive'] = { pass: grahamDefensivePass, label: 'Ben Graham (Defensive)', reason: 'Graham Number (PERxPBV ≤ 22.5), Dividen Rutin ≥ 5 Thn, Neraca Kuat' };

    // 4. Peter Lynch - Fast Growers (High Growth & Reasonable Valuation)
    // Growth >= 15%, ROE >= 15%, PER <= 28, DER <= 1.0
    const lynchFastPass = (profitGrowth >= 15 || revenueGrowth >= 15) && roe >= 15 && per > 0 && per <= 28 && (isFinancial || (der !== null && der <= 1.0));
    if (lynchFastPass) passedFormulaKeys.push('lynch_fast');
    evaluationDetails['lynch_fast'] = { pass: lynchFastPass, label: 'Peter Lynch (Fast Growers)', reason: 'Growth ≥ 15%, ROE ≥ 15%, Valuasi Wajar (PER ≤ 28)' };

    // 5. Peter Lynch - Stalwarts (Solid Blue Chips)
    // ROE >= 14%, Growth >= 6%, PER <= 16, DER <= 1.2
    const lynchStalwartsPass = roe >= 14 && (profitGrowth >= 6 || revenueGrowth >= 6) && per > 0 && per <= 16 && (isFinancial || (der !== null && der <= 1.2));
    if (lynchStalwartsPass) passedFormulaKeys.push('lynch_stalwarts');
    evaluationDetails['lynch_stalwarts'] = { pass: lynchStalwartsPass, label: 'Peter Lynch (Stalwarts)', reason: 'Blue Chip Mapan, ROE ≥ 14%, Pertumbuhan Stabil, PER ≤ 16' };

    // 6. Peter Lynch - Slow Growers (High Yield Dividend Champions)
    // Div Yield >= 6.0%, Streak >= 5 Years, PER <= 15, DER <= 1.2
    const lynchSlowPass = divYield >= 6.0 && streakYears >= 5 && per > 0 && per <= 15 && (isFinancial || (der !== null && der <= 1.2));
    if (lynchSlowPass) passedFormulaKeys.push('lynch_slow');
    evaluationDetails['lynch_slow'] = { pass: lynchSlowPass, label: 'Peter Lynch (Slow Growers)', reason: 'Yield Dividen Tinggi ≥ 6.0%, Rekam Jejak Dividen ≥ 5 Thn' };

    // 7. Joel Greenblatt - Magic Formula (High ROE + High Earnings Yield)
    // ROE >= 16%, Earnings Yield (100/PER) >= 9.0% (PER <= 11.1), DER <= 1.0
    const earningsYield = per > 0 ? (100 / per) : 0;
    const greenblattPass = roe >= 16 && earningsYield >= 9.0 && (isFinancial || (der !== null && der <= 1.0));
    if (greenblattPass) passedFormulaKeys.push('greenblatt');
    evaluationDetails['greenblatt'] = { pass: greenblattPass, label: 'Joel Greenblatt (Magic Formula)', reason: 'ROE Tinggi ≥ 16% & Earnings Yield Tinggi ≥ 9.0%' };

    // 8. Terry Smith (Quality Compounders)
    // ROE >= 20%, Revenue/Profit Growth >= 10%, DER <= 0.8
    const terrySmithPass = roe >= 20 && (profitGrowth >= 10 || revenueGrowth >= 10) && (isFinancial || (der !== null && der <= 0.8));
    if (terrySmithPass) passedFormulaKeys.push('terry_smith');
    evaluationDetails['terry_smith'] = { pass: terrySmithPass, label: 'Terry Smith', reason: 'High Quality: ROE ≥ 20%, Pertumbuhan Kuat, Utang Minimal' };

    // 9. Ken Fisher (Low PBV/PER + Steady Growth)
    // PBV <= 1.2, PER <= 12, Revenue Growth >= 10%, DER <= 0.8, ROE >= 12%
    const kenFisherPass = pbv > 0 && pbv <= 1.2 && per > 0 && per <= 12 && (profitGrowth >= 10 || revenueGrowth >= 10) && (isFinancial || (der !== null && der <= 0.8)) && roe >= 12;
    if (kenFisherPass) passedFormulaKeys.push('ken_fisher');
    evaluationDetails['ken_fisher'] = { pass: kenFisherPass, label: 'Ken Fisher (Superstocks)', reason: 'Valuasi PBV ≤ 1.2 & PER ≤ 12, Pertumbuhan Penjualan Bagus' };

    // 10. Nick Sleep (Scale Economies Shared & Efficiency)
    // ROE >= 16%, Revenue Growth >= 12%, DER <= 1.0
    const nickSleepPass = roe >= 16 && (revenueGrowth >= 12 || profitGrowth >= 12) && (isFinancial || (der !== null && der <= 1.0));
    if (nickSleepPass) passedFormulaKeys.push('nick_sleep');
    evaluationDetails['nick_sleep'] = { pass: nickSleepPass, label: 'Nick Sleep (SES)', reason: 'Scale Economies Shared, Efisiensi Modal Tinggi, ROE ≥ 16%' };

    // Comprehensive Growth Story & Business Profile Categorization
    let growthStoryCategory = 'Watchlist / Konsolidasi 🟡';
    let growthStoryBadge = 'amber';

    if (der != null && der > 2.5 && roe < 0) {
      growthStoryCategory = 'Hindari ⚠️ (Risiko Finansial)';
      growthStoryBadge = 'rose';
    } else if ((revenueGrowth >= 10 || profitGrowth >= 10) && roe >= 12 && (isFinancial || (der !== null && der <= 1.2)) && (per <= 18 || peg <= 1.2)) {
      growthStoryCategory = 'Kandidat Kuat ⭐⭐⭐⭐⭐';
      growthStoryBadge = 'emerald';
    } else if ((revenueGrowth >= 10 || profitGrowth >= 10) && (per > 22 || pbv > 3.5)) {
      growthStoryCategory = 'Tunggu Harga Murah ⏳';
      growthStoryBadge = 'amber';
    } else if (profitGrowth >= 15 || revenueGrowth >= 15) {
      growthStoryCategory = 'Fast Grower 🚀';
      growthStoryBadge = 'emerald';
    } else if (roe >= 12 && (isFinancial || (der !== null && der <= 1.2))) {
      growthStoryCategory = 'Stalwart (Blue Chip Stabil) 💎';
      growthStoryBadge = 'indigo';
    } else if (divYield >= 4.0) {
      growthStoryCategory = 'Cash Cow (Dividen Tinggi) 💰';
      growthStoryBadge = 'blue';
    } else if (pbv > 0 && pbv <= 0.8 && per > 0 && per <= 10 && roe > 0) {
      growthStoryCategory = 'Deep Value / Asset Play 🏛️';
      growthStoryBadge = 'cyan';
    }

    return {
      ...stock,
      per,
      pbv,
      roe,
      der: der ?? 0,
      currentRatio: currentRatio ?? 0,
      divYield,
      revenueGrowth,
      profitGrowth,
      fcf,
      peg,
      piotroskiFScore,
      altmanZScore,
      passedFormulaKeys,
      evaluationDetails,
      growthStoryCategory,
      growthStoryBadge
    };
  });
}
