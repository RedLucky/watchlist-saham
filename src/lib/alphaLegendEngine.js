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
    const isFinancial = stock.sector === 'Financials' || (der === null);

    // 1. Warren Buffett Screening
    // Predictability (profit/revenue Growth >= 5%), Debt <= 5x Earnings (DER <= 1.5), ROE >= 14%
    const buffettPass = roe >= 14 && (isFinancial || (der !== null && der <= 1.5)) && (profitGrowth >= 5 || revenueGrowth >= 5);
    if (buffettPass) passedFormulaKeys.push('buffett');
    evaluationDetails['buffett'] = { pass: buffettPass, label: 'Warren Buffett', reason: 'ROE ≥ 14%, Utang Terkendali, Pertumbuhan Konsisten' };

    // 2. Ben Graham - Enterprising Investors
    // PER <= 15, DER <= 1.2, Profit Growth > 0 or Dividend > 0
    const grahamEnterprisingPass = per > 0 && per <= 15 && (isFinancial || (der !== null && der <= 1.2)) && (divYield > 0 || profitGrowth > 0);
    if (grahamEnterprisingPass) passedFormulaKeys.push('graham_enterprising');
    evaluationDetails['graham_enterprising'] = { pass: grahamEnterprisingPass, label: 'Ben Graham (Enterprising)', reason: 'PER Murah, Likuiditas Kuat, Dividen/Profit Positif' };

    // 3. Ben Graham - Defensive Investors
    // Graham Number (PER x PBV <= 25), DER <= 1.2, Dividend Yield > 0
    const grahamDefensivePass = per > 0 && pbv > 0 && (per * pbv <= 25) && (isFinancial || (der !== null && der <= 1.2)) && divYield > 0;
    if (grahamDefensivePass) passedFormulaKeys.push('graham_defensive');
    evaluationDetails['graham_defensive'] = { pass: grahamDefensivePass, label: 'Ben Graham (Defensive)', reason: 'Graham Number (PERxPBV ≤ 25), Dividen Teratur' };

    // 4. Peter Lynch - Fast Growers (EPS/Profit/Revenue Growth >= 15%)
    // PEG <= 1.5, DER <= 1.2, PER <= 35
    const lynchFastPass = (profitGrowth >= 15 || revenueGrowth >= 15) && per > 0 && per <= 35 && (isFinancial || (der !== null && der <= 1.2));
    if (lynchFastPass) passedFormulaKeys.push('lynch_fast');
    evaluationDetails['lynch_fast'] = { pass: lynchFastPass, label: 'Peter Lynch (Fast Growers)', reason: 'Growth ≥ 15%, Valuasi Wajar' };

    // 5. Peter Lynch - Stalwarts (EPS Growth 5% - 20%)
    // ROE >= 12%, Growth 5-20%, PER <= 25
    const lynchStalwartsPass = roe >= 12 && (profitGrowth >= 5 || revenueGrowth >= 5) && per > 0 && per <= 25 && (isFinancial || (der !== null && der <= 1.2));
    if (lynchStalwartsPass) passedFormulaKeys.push('lynch_stalwarts');
    evaluationDetails['lynch_stalwarts'] = { pass: lynchStalwartsPass, label: 'Peter Lynch (Stalwarts)', reason: 'Blue Chip Stabil, ROE ≥ 12%, Valuasi Layak' };

    // 6. Peter Lynch - Slow Growers (High Dividend Yield >= 3.0%)
    const lynchSlowPass = divYield >= 3.0 && (isFinancial || (der !== null && der <= 1.5));
    if (lynchSlowPass) passedFormulaKeys.push('lynch_slow');
    evaluationDetails['lynch_slow'] = { pass: lynchSlowPass, label: 'Peter Lynch (Slow Growers)', reason: 'Yield Dividen Tinggi ≥ 3.0%, Neraca Stabil' };

    // 7. Joel Greenblatt - Magic Formula
    // Higher ROC/ROE (>= 12%) & Earnings Yield (EY = 1/PER >= 6.5%)
    const earningsYield = per > 0 ? (100 / per) : 0;
    const greenblattPass = roe >= 12 && earningsYield >= 6.5;
    if (greenblattPass) passedFormulaKeys.push('greenblatt');
    evaluationDetails['greenblatt'] = { pass: greenblattPass, label: 'Joel Greenblatt (Magic Formula)', reason: 'Kombinasi ROE Tinggi & Earnings Yield Tinggi' };

    // 8. Terry Smith Screening
    // ROE >= 14%, Profit/Revenue Positif, Debt Terkendali
    const terrySmithPass = roe >= 14 && (profitGrowth > 0 || revenueGrowth > 0) && (isFinancial || (der !== null && der <= 1.2));
    if (terrySmithPass) passedFormulaKeys.push('terry_smith');
    evaluationDetails['terry_smith'] = { pass: terrySmithPass, label: 'Terry Smith', reason: 'High ROE, Pertumbuhan Bisnis Berkualitas' };

    // 9. Ken Fisher Screening
    // PBV <= 1.8 / PSR Rendah, Growth >= 8%
    const kenFisherPass = (pbv > 0 && pbv <= 1.8) && (isFinancial || (der !== null && der <= 1.0)) && (profitGrowth >= 8 || revenueGrowth >= 8);
    if (kenFisherPass) passedFormulaKeys.push('ken_fisher');
    evaluationDetails['ken_fisher'] = { pass: kenFisherPass, label: 'Ken Fisher (Superstocks)', reason: 'Valuasi PBV Wajar, Pertumbuhan Penjualan Bagus' };

    // 10. Nick Sleep Screening
    // Scale Economies Shared (SES), High ROE >= 12%, Revenue/Profit Growth >= 8%
    const nickSleepPass = roe >= 12 && (revenueGrowth >= 8 || profitGrowth >= 8);
    if (nickSleepPass) passedFormulaKeys.push('nick_sleep');
    evaluationDetails['nick_sleep'] = { pass: nickSleepPass, label: 'Nick Sleep (SES)', reason: 'Scale Economies Shared & ROE Tinggi' };

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
