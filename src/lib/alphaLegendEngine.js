import { ALPHA_LEGEND_SECTORS } from '../data/alphaLegendSectors.js';
import { isFinancialSector } from './scoring/financialHealth.js';

/**
 * Helper Kredit Parsial Kriteria
 * Menghitung persentase kecocokan (0.0 s/d 1.0) terhadap suatu ambang batas target.
 * Memberikan skor proporsional bagi emiten yang hampir memenuhi kriteria (bukan biner 0/1).
 *
 * @param {number|null} value - Nilai aktual saham
 * @param {number} target - Target nilai acuan strategi
 * @param {'gte'|'lte'} [type='gte'] - 'gte' (lebih besar lebih baik) atau 'lte' (lebih kecil lebih baik)
 * @returns {number} Rasio kecocokan antara 0.0 sampai 1.0
 */
function scoreCriterion(value, target, type = 'gte') {
  if (value == null || !Number.isFinite(Number(value))) return 0.5; // Nilai netral jika data kosong

  const v = Number(value);
  const t = Number(target);

  if (type === 'gte') {
    if (v >= t) return 1.0;
    if (v <= 0) return 0.0;
    return Math.max(0, Math.min(1.0, v / t));
  }

  if (type === 'lte') {
    if (v <= t && v > 0) return 1.0;
    if (v <= 0) return 0.4; // Penalti earning negatif
    return Math.max(0, Math.min(1.0, t / v));
  }

  return 0.5;
}

/**
 * Evaluasi Portofolio Saham Menggunakan Framework 10 Legenda Investor Dunia
 * Dilengkapi dengan Match Score (0–100%) berbobot untuk merangking saham paling cocok.
 *
 * @param {Array} stocks - Daftar saham yang akan dievaluasi
 * @returns {Array} Daftar saham yang diperkaya dengan Match Score, rincian kriteria, dan profil pertumbuhan
 */
export function evaluateAlphaLegends(stocks = []) {
  if (!Array.isArray(stocks) || stocks.length === 0) return [];

  return stocks.map(stock => {
    const passedFormulaKeys = [];
    const evaluationDetails = {};

    // Standarisasi metrik finansial dari berbagai kemungkinan format field
    const per = typeof stock.pe === 'number' ? stock.pe : (typeof stock.per === 'number' ? stock.per : Number(stock.pe || stock.per) || 0);
    const pbv = typeof stock.pbv === 'number' ? stock.pbv : Number(stock.pbv) || 0;
    const roe = typeof stock.roe === 'number' ? stock.roe : Number(stock.roe) || 0;
    const opm = stock.opm != null && Number.isFinite(Number(stock.opm)) ? Number(stock.opm) : (stock.fundamentals?.opm != null ? Number(stock.fundamentals.opm) : null);
    const eps = stock.eps != null && Number.isFinite(Number(stock.eps)) ? Number(stock.eps) : (stock.fundamentals?.eps != null ? Number(stock.fundamentals.eps) : null);
    const forwardEps = stock.forwardEps != null && Number.isFinite(Number(stock.forwardEps)) ? Number(stock.forwardEps) : (stock.fundamentals?.forwardEps != null ? Number(stock.fundamentals.forwardEps) : null);
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
    const isFinancial = isFinancialSector(stock.sector) || (der === null);

    const growthProxy = Math.max(profitGrowth, revenueGrowth);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Warren Buffett (Wide Moat, High ROE, Low Debt, Predictable Compounders)
    // ─────────────────────────────────────────────────────────────────────────
    const buffettRoeScore = scoreCriterion(roe, 15, 'gte');
    const buffettOpmScore = isFinancial ? 1.0 : scoreCriterion(opm, 15, 'gte');
    const buffettDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.0, 'lte');
    const buffettGrowthScore = scoreCriterion(growthProxy, 8, 'gte');
    const buffettPerScore = per > 0 ? scoreCriterion(per, 20, 'lte') : 0;

    const buffettMatch = Math.round(
      (buffettRoeScore * 0.25 +
       buffettOpmScore * 0.20 +
       buffettDerScore * 0.20 +
       buffettGrowthScore * 0.20 +
       buffettPerScore * 0.15) * 100
    );
    const buffettPass = buffettMatch >= 80 && per > 0 && (eps === null || eps > 0);
    if (buffettPass) passedFormulaKeys.push('buffett');
    evaluationDetails['buffett'] = {
      pass: buffettPass,
      matchScore: buffettMatch,
      label: 'Warren Buffett',
      reason: 'Wide Moat (OPM ≥ 15% / ROE ≥ 15%), Utang Rendah, Laba Konsisten'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Ben Graham - Enterprising (Deep Value / Tangible Asset Bargains)
    // ─────────────────────────────────────────────────────────────────────────
    const gePerScore = per > 0 ? scoreCriterion(per, 10, 'lte') : 0;
    const gePbvScore = pbv > 0 ? scoreCriterion(pbv, 1.0, 'lte') : 0;
    const geDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.0, 'lte');
    const geRoeScore = scoreCriterion(roe, 8, 'gte');

    const geMatch = Math.round(
      (gePerScore * 0.35 +
       gePbvScore * 0.30 +
       geDerScore * 0.20 +
       geRoeScore * 0.15) * 100
    );
    const grahamEnterprisingPass = geMatch >= 75 && per > 0 && pbv > 0 && (eps === null || eps > 0);
    if (grahamEnterprisingPass) passedFormulaKeys.push('graham_enterprising');
    evaluationDetails['graham_enterprising'] = {
      pass: grahamEnterprisingPass,
      matchScore: geMatch,
      label: 'Ben Graham (Enterprising)',
      reason: 'Deep Value (PER ≤ 10, PBV ≤ 1.0), Utang Rendah, ROE & EPS Positif'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Ben Graham - Defensive (High Margin of Safety & Dividend Aristocrats)
    // ─────────────────────────────────────────────────────────────────────────
    const gdGnScore = (per > 0 && pbv > 0) ? scoreCriterion(per * pbv, 22.5, 'lte') : 0;
    const gdPerScore = per > 0 ? scoreCriterion(per, 15, 'lte') : 0;
    const gdPbvScore = pbv > 0 ? scoreCriterion(pbv, 1.5, 'lte') : 0;
    const gdDivScore = scoreCriterion(divYield, 3.0, 'gte');
    const gdStreakScore = scoreCriterion(streakYears, 5, 'gte');
    const gdDerScore = isFinancial ? 1.0 : scoreCriterion(der, 0.8, 'lte');

    const gdMatch = Math.round(
      (gdGnScore * 0.30 +
       gdPerScore * 0.15 +
       gdPbvScore * 0.15 +
       gdDivScore * 0.15 +
       gdStreakScore * 0.15 +
       gdDerScore * 0.10) * 100
    );
    const grahamDefensivePass = gdMatch >= 80 && per > 0 && pbv > 0;
    if (grahamDefensivePass) passedFormulaKeys.push('graham_defensive');
    evaluationDetails['graham_defensive'] = {
      pass: grahamDefensivePass,
      matchScore: gdMatch,
      label: 'Ben Graham (Defensive)',
      reason: 'Graham Number (PERxPBV ≤ 22.5), Dividen Rutin ≥ 5 Thn, Neraca Kuat'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Peter Lynch - Fast Growers (High Growth, Reasonable Valuation, PEG)
    // ─────────────────────────────────────────────────────────────────────────
    const lfGrowthScore = scoreCriterion(growthProxy, 15, 'gte');
    const lfRoeScore = scoreCriterion(roe, 15, 'gte');
    const lfPerScore = per > 0 ? scoreCriterion(per, 28, 'lte') : 0;
    const lfDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.0, 'lte');
    const pegVal = (stock.fundamentals?.pegRatio && stock.fundamentals.pegRatio > 0) ? stock.fundamentals.pegRatio : peg;
    const lfPegScore = pegVal > 0 ? scoreCriterion(pegVal, 1.5, 'lte') : 0.7;

    const lfMatch = Math.round(
      (lfGrowthScore * 0.30 +
       lfRoeScore * 0.25 +
       lfPegScore * 0.20 +
       lfPerScore * 0.15 +
       lfDerScore * 0.10) * 100
    );
    const lynchFastPass = lfMatch >= 78 && per > 0;
    if (lynchFastPass) passedFormulaKeys.push('lynch_fast');
    evaluationDetails['lynch_fast'] = {
      pass: lynchFastPass,
      matchScore: lfMatch,
      label: 'Peter Lynch (Fast Growers)',
      reason: 'Growth ≥ 15%, ROE ≥ 15%, Valuasi Wajar (PER ≤ 28, PEG ≤ 1.5)'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Peter Lynch - Stalwarts (Solid Blue Chips & Resilient Earners)
    // ─────────────────────────────────────────────────────────────────────────
    const lsRoeScore = scoreCriterion(roe, 14, 'gte');
    const lsGrowthScore = scoreCriterion(growthProxy, 6, 'gte');
    const lsPerScore = per > 0 ? scoreCriterion(per, 16, 'lte') : 0;
    const lsDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.2, 'lte');

    const lsMatch = Math.round(
      (lsRoeScore * 0.35 +
       lsGrowthScore * 0.25 +
       lsPerScore * 0.25 +
       lsDerScore * 0.15) * 100
    );
    const lynchStalwartsPass = lsMatch >= 80 && per > 0;
    if (lynchStalwartsPass) passedFormulaKeys.push('lynch_stalwarts');
    evaluationDetails['lynch_stalwarts'] = {
      pass: lynchStalwartsPass,
      matchScore: lsMatch,
      label: 'Peter Lynch (Stalwarts)',
      reason: 'Blue Chip Mapan, ROE ≥ 14%, Pertumbuhan Stabil, PER ≤ 16'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Peter Lynch - Slow Growers (High Yield Dividend Champions)
    // ─────────────────────────────────────────────────────────────────────────
    const lslDivScore = scoreCriterion(divYield, 6.0, 'gte');
    const lslStreakScore = scoreCriterion(streakYears, 5, 'gte');
    const lslPerScore = per > 0 ? scoreCriterion(per, 15, 'lte') : 0;
    const lslDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.2, 'lte');

    const lslMatch = Math.round(
      (lslDivScore * 0.40 +
       lslStreakScore * 0.30 +
       lslPerScore * 0.15 +
       lslDerScore * 0.15) * 100
    );
    const lynchSlowPass = lslMatch >= 75 && divYield >= 4.0;
    if (lynchSlowPass) passedFormulaKeys.push('lynch_slow');
    evaluationDetails['lynch_slow'] = {
      pass: lynchSlowPass,
      matchScore: lslMatch,
      label: 'Peter Lynch (Slow Growers)',
      reason: 'Yield Dividen Tinggi ≥ 6.0%, Rekam Jejak Dividen ≥ 5 Thn'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Joel Greenblatt - Magic Formula (High ROE + High Earnings Yield)
    // ─────────────────────────────────────────────────────────────────────────
    const earningsYield = per > 0 ? (100 / per) : 0;
    const jgRoeScore = scoreCriterion(roe, 16, 'gte');
    const jgEyScore = scoreCriterion(earningsYield, 9.0, 'gte');
    const jgDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.0, 'lte');

    const jgMatch = Math.round(
      (jgRoeScore * 0.45 +
       jgEyScore * 0.40 +
       jgDerScore * 0.15) * 100
    );
    const greenblattPass = jgMatch >= 80 && per > 0;
    if (greenblattPass) passedFormulaKeys.push('greenblatt');
    evaluationDetails['greenblatt'] = {
      pass: greenblattPass,
      matchScore: jgMatch,
      label: 'Joel Greenblatt (Magic Formula)',
      reason: 'ROE Tinggi ≥ 16% & Earnings Yield Tinggi (PER Rendah)'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Terry Smith (Quality Compounders, Super Moat, High Capital Efficiency)
    // ─────────────────────────────────────────────────────────────────────────
    const tsRoeScore = scoreCriterion(roe, 20, 'gte');
    const tsOpmScore = isFinancial ? 1.0 : scoreCriterion(opm, 15, 'gte');
    const tsGrowthScore = scoreCriterion(growthProxy, 10, 'gte');
    const tsDerScore = isFinancial ? 1.0 : scoreCriterion(der, 0.8, 'lte');

    const tsMatch = Math.round(
      (tsRoeScore * 0.35 +
       tsOpmScore * 0.25 +
       tsGrowthScore * 0.25 +
       tsDerScore * 0.15) * 100
    );
    const terrySmithPass = tsMatch >= 82;
    if (terrySmithPass) passedFormulaKeys.push('terry_smith');
    evaluationDetails['terry_smith'] = {
      pass: terrySmithPass,
      matchScore: tsMatch,
      label: 'Terry Smith',
      reason: 'High Quality Moat: ROE ≥ 20%, OPM ≥ 15%, Utang Minimal'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Ken Fisher (Low PBV/PER + Steady Sales/Revenue Expansion)
    // ─────────────────────────────────────────────────────────────────────────
    const kfPbvScore = pbv > 0 ? scoreCriterion(pbv, 1.2, 'lte') : 0;
    const kfPerScore = per > 0 ? scoreCriterion(per, 12, 'lte') : 0;
    const kfRevScore = scoreCriterion(revenueGrowth, 10, 'gte');
    const kfRoeScore = scoreCriterion(roe, 12, 'gte');
    const kfDerScore = isFinancial ? 1.0 : scoreCriterion(der, 0.8, 'lte');

    const kfMatch = Math.round(
      (kfPbvScore * 0.25 +
       kfPerScore * 0.25 +
       kfRevScore * 0.25 +
       kfRoeScore * 0.15 +
       kfDerScore * 0.10) * 100
    );
    const kenFisherPass = kfMatch >= 75 && pbv > 0 && per > 0;
    if (kenFisherPass) passedFormulaKeys.push('ken_fisher');
    evaluationDetails['ken_fisher'] = {
      pass: kenFisherPass,
      matchScore: kfMatch,
      label: 'Ken Fisher (Superstocks)',
      reason: 'Valuasi PBV ≤ 1.2 & PER ≤ 12, Pertumbuhan Penjualan Bagus'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Nick Sleep (Scale Economies Shared & Extreme Operating Efficiency)
    // ─────────────────────────────────────────────────────────────────────────
    const nsRoeScore = scoreCriterion(roe, 16, 'gte');
    const nsOpmScore = isFinancial ? 1.0 : scoreCriterion(opm, 12, 'gte');
    const nsGrowthScore = scoreCriterion(growthProxy, 12, 'gte');
    const nsDerScore = isFinancial ? 1.0 : scoreCriterion(der, 1.0, 'lte');

    const nsMatch = Math.round(
      (nsRoeScore * 0.35 +
       nsOpmScore * 0.25 +
       nsGrowthScore * 0.25 +
       nsDerScore * 0.15) * 100
    );
    const nickSleepPass = nsMatch >= 80;
    if (nickSleepPass) passedFormulaKeys.push('nick_sleep');
    evaluationDetails['nick_sleep'] = {
      pass: nickSleepPass,
      matchScore: nsMatch,
      label: 'Nick Sleep (SES)',
      reason: 'Scale Economies Shared, Efisiensi Modal & OPM Tinggi'
    };

    // Cari skor kecocokan tertinggi di antara seluruh 10 legenda
    let maxMatchScore = 0;
    let bestLegend = null;
    for (const key of Object.keys(evaluationDetails)) {
      const item = evaluationDetails[key];
      if (item.matchScore > maxMatchScore) {
        maxMatchScore = item.matchScore;
        bestLegend = `${item.label} (${item.matchScore}%)`;
      }
    }

    // Klasifikasi Profil Pertumbuhan & Narasi Bisnis
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
      maxMatchScore,
      bestLegend,
      growthStoryCategory,
      growthStoryBadge
    };
  });
}
