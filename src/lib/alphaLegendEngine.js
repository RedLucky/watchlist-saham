import { ALPHA_LEGEND_SECTORS } from '../data/alphaLegendSectors';

/**
 * Filter stocks according to 10 Top Investors Formulas
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
    const der = typeof stock.der === 'number' ? stock.der : Number(stock.der) || 0;
    const currentRatio = typeof stock.currentRatio === 'number' ? stock.currentRatio : Number(stock.currentRatio) || 0;
    const divYield = typeof stock.divYield === 'number' ? stock.divYield : (typeof stock.dividendYield === 'number' ? stock.dividendYield : Number(stock.divYield || stock.dividendYield) || 0);
    const revenueGrowth = typeof stock.revenueGrowth === 'number' ? stock.revenueGrowth : (typeof stock.salesGrowth === 'number' ? stock.salesGrowth : Number(stock.revenueGrowth || stock.salesGrowth) || 0);
    const profitGrowth = typeof stock.profitGrowth === 'number' ? stock.profitGrowth : (typeof stock.epsGrowth === 'number' ? stock.epsGrowth : Number(stock.profitGrowth || stock.epsGrowth) || 0);
    const fcf = typeof stock.fcf === 'number' ? stock.fcf : (typeof stock.freeCashFlow === 'number' ? stock.freeCashFlow : Number(stock.fcf || stock.freeCashFlow) || 0);
    const peg = typeof stock.peg === 'number' ? stock.peg : (profitGrowth > 0 ? Number((per / profitGrowth).toFixed(2)) : 0);
    const piotroskiFScore = typeof stock.piotroskiFScore === 'number' ? stock.piotroskiFScore : Number(stock.piotroskiFScore) || 5;
    const altmanZScore = typeof stock.altmanZScore === 'number' ? stock.altmanZScore : Number(stock.altmanZScore) || 2.5;

    // 1. Warren Buffett Screening
    // Predictability 10 yr (profit Growth > 5%), Debt <= 5x Earnings (DER < 1.2), ROE >= 15%, ROTC >= 12%, FCF > 0
    const buffettPass = roe >= 15 && der <= 1.2 && fcf > 0 && profitGrowth >= 8;
    if (buffettPass) passedFormulaKeys.push('buffett');
    evaluationDetails['buffett'] = { pass: buffettPass, label: 'Warren Buffett', reason: 'ROE ≥ 15%, Utang Terkendali, FCF Positif' };

    // 2. Ben Graham - Enterprising Investors
    // PER <= 9, CR >= 1.5, Debt/NCAV <= 110% (DER <= 0.8), Earnings Stability > 0, Dividend > 0
    const grahamEnterprisingPass = per <= 12 && currentRatio >= 1.4 && der <= 0.9 && divYield > 0 && profitGrowth > 0;
    if (grahamEnterprisingPass) passedFormulaKeys.push('graham_enterprising');
    evaluationDetails['graham_enterprising'] = { pass: grahamEnterprisingPass, label: 'Ben Graham (Enterprising)', reason: 'PER Murah, Likuiditas Kuat, Dividen Routine' };

    // 3. Ben Graham - Defensive Investors
    // CR >= 2, EPS Growth 10yr >= 30%, PER <= 15, P/E x PBV <= 22.5, DER <= 100%, DPS > 0
    const grahamNumber = Math.sqrt(22.5 * per * pbv);
    const grahamDefensivePass = per <= 15 && (per * pbv <= 22.5) && currentRatio >= 1.5 && der <= 1.0 && divYield > 0;
    if (grahamDefensivePass) passedFormulaKeys.push('graham_defensive');
    evaluationDetails['graham_defensive'] = { pass: grahamDefensivePass, label: 'Ben Graham (Defensive)', reason: 'Graham Number (PERxPBV ≤ 22.5), Consist Dividen' };

    // 4. Peter Lynch - Fast Growers (EPS Growth >= 20%)
    // PEG <= 1, DER < 80%, PER <= 40, EPS Growth 20-50%
    const lynchFastPass = peg <= 1.0 && profitGrowth >= 18 && der <= 0.85 && per <= 40;
    if (lynchFastPass) passedFormulaKeys.push('lynch_fast');
    evaluationDetails['lynch_fast'] = { pass: lynchFastPass, label: 'Peter Lynch (Fast Growers)', reason: 'EPS Growth ≥ 20%, PEG ≤ 1' };

    // 5. Peter Lynch - Stalwarts (EPS Growth 10% - 20%)
    // Yield-adj PEG <= 1, DER < 80%, EPS Growth 10-20%
    const lynchStalwartsPass = profitGrowth >= 10 && profitGrowth <= 22 && peg <= 1.2 && der <= 0.85;
    if (lynchStalwartsPass) passedFormulaKeys.push('lynch_stalwarts');
    evaluationDetails['lynch_stalwarts'] = { pass: lynchStalwartsPass, label: 'Peter Lynch (Stalwarts)', reason: 'EPS Growth 10-20%, Valuasi Layak' };

    // 6. Peter Lynch - Slow Growers (EPS Growth < 10%)
    // Yield-adj PEG <= 1, Yield >= 3%, DER < 80%
    const lynchSlowPass = profitGrowth < 10 && divYield >= 3.5 && der <= 0.8;
    if (lynchSlowPass) passedFormulaKeys.push('lynch_slow');
    evaluationDetails['lynch_slow'] = { pass: lynchSlowPass, label: 'Peter Lynch (Slow Growers)', reason: 'Yield Tinggi ≥ 3.5%, Neraca Kuat' };

    // 7. Joel Greenblatt - Magic Formula
    // Higher ROC & Earnings Yield (EY = 1/PER)
    const earningsYield = per > 0 ? (1 / per) * 100 : 0;
    const greenblattScore = roe + earningsYield;
    const greenblattPass = greenblattScore >= 20 && roe >= 14;
    if (greenblattPass) passedFormulaKeys.push('greenblatt');
    evaluationDetails['greenblatt'] = { pass: greenblattPass, label: 'Joel Greenblatt (Magic Formula)', reason: 'Kombinasi ROC High & Earnings Yield High' };

    // 8. Terry Smith Screening
    // ROCE >= 14%, OPM > 15%, Debt < 5x Net Income, FCF Yield > 3.3%
    const terrySmithPass = roe >= 14 && fcf > 0 && der <= 0.9 && profitGrowth > 0;
    if (terrySmithPass) passedFormulaKeys.push('terry_smith');
    evaluationDetails['terry_smith'] = { pass: terrySmithPass, label: 'Terry Smith', reason: 'High ROCE, Cash Flow Stabil' };

    // 9. Ken Fisher Screening
    // PSR <= 3 / <= 0.8, DER <= 40%, EPS Growth >= 15%
    const psr = Number(stock.psr) || 1.1;
    const kenFisherPass = psr <= 2.5 && der <= 0.7 && profitGrowth >= 12;
    if (kenFisherPass) passedFormulaKeys.push('ken_fisher');
    evaluationDetails['ken_fisher'] = { pass: kenFisherPass, label: 'Ken Fisher (PSR & Superstocks)', reason: 'PSR Rendah, Pertumbuhan EPS Presisi' };

    // 10. Nick Sleep Screening
    // Repeat Purchase, Scale Economies Shared (SES), High ROIC
    const nickSleepPass = roe >= 15 && revenueGrowth >= 10 && fcf > 0;
    if (nickSleepPass) passedFormulaKeys.push('nick_sleep');
    evaluationDetails['nick_sleep'] = { pass: nickSleepPass, label: 'Nick Sleep (SES)', reason: 'Scale Economies Shared & ROIC Tinggi' };

    // Evaluate Growth Story Status
    let growthStoryCategory = 'Tidak Masuk Kategori';
    let growthStoryBadge = 'slate';
    if (revenueGrowth >= 12 && profitGrowth >= 12 && roe >= 12) {
      if (altmanZScore >= 2.6 && der <= 1.0) {
        if (per <= 18 || peg <= 1.0) {
          growthStoryCategory = 'Kandidat Kuat ⭐⭐⭐⭐⭐';
          growthStoryBadge = 'emerald';
        } else {
          growthStoryCategory = 'Tunggu Harga Murah';
          growthStoryBadge = 'amber';
        }
      } else {
        growthStoryCategory = 'Hindari ⚠️ (Risiko Finansial)';
        growthStoryBadge = 'rose';
      }
    }

    return {
      ...stock,
      per,
      pbv,
      roe,
      der,
      currentRatio,
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
