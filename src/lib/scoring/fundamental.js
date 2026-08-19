/**
 * Fundamental Score (0–100)
 * Evaluates the quality of the company's financials.
 *
 * Handles missing data gracefully — null values get moderate default scores
 * rather than causing the stock to be rated poorly.
 */

export function calculateFundamentalScore(stock) {
  const { roe, der, netProfit, revenueGrowth } = stock.fundamentals;
  const sector = stock.sector;

  let score = 0;
  const details = [];

  // ── ROE Quality (35%) ──────────────────────────────────────────────
  // 8% = baseline, 25%+ = excellent
  const safeROE = Number.isFinite(roe) ? roe : null;
  let roeScore = 50; // default if no data
  if (safeROE !== null) {
    roeScore = clamp(((safeROE - 8) / 22) * 100, 0, 100);
    if (safeROE >= 20) {
      details.push(`Excellent ROE of ${safeROE.toFixed(1)}% — perusahaan sangat efisien menghasilkan laba`);
    } else if (safeROE >= 15) {
      details.push(`Good ROE of ${safeROE.toFixed(1)}% — profitabilitas di atas rata-rata`);
    } else if (safeROE >= 8) {
      details.push(`Adequate ROE of ${safeROE.toFixed(1)}% — memenuhi ambang batas minimum`);
    } else {
      details.push(`Low ROE of ${safeROE.toFixed(1)}% — di bawah standar`);
    }
  } else {
    details.push('Data ROE belum tersedia');
  }
  score += roeScore * 0.35;

  // ── Profit Consistency & Growth (30%) ──────────────────────────────
  const profits = Array.isArray(netProfit) ? netProfit.filter(Number.isFinite) : [];
  let profitScore = 40; // default if insufficient data

  if (profits.length >= 2) {
    const allPositive = profits.every(v => v > 0);
    let avgProfitGrowth = 0;
    
    if (profits.length >= 3) {
      const base1 = Math.max(Math.abs(profits[0]), 1);
      const base2 = Math.max(Math.abs(profits[1]), 1);
      const growth1 = (profits[1] - profits[0]) / base1;
      const growth2 = (profits[2] - profits[1]) / base2;
      avgProfitGrowth = (growth1 + growth2) / 2;
    } else {
      // Only 2 data points
      const base = Math.max(Math.abs(profits[0]), 1);
      avgProfitGrowth = (profits[1] - profits[0]) / base;
    }

    const isGrowing = avgProfitGrowth > 0;

    if (allPositive && isGrowing) {
      profitScore = clamp(50 + avgProfitGrowth * 200, 50, 100);
      details.push(`Profit tumbuh konsisten — rata-rata pertumbuhan ${(avgProfitGrowth * 100).toFixed(1)}%`);
    } else if (allPositive) {
      profitScore = 40;
      details.push('Profit positif tapi tidak bertumbuh kuat');
    } else {
      profitScore = 10;
      details.push('Inkonsistensi profit terdeteksi');
    }
  } else {
    details.push('Data profit historis belum lengkap');
  }
  score += profitScore * 0.30;

  // ── Debt Safety — DER (20%) ────────────────────────────────────────
  // For Financials sector, DER is structurally high and not penalized
  const safeDER = Number.isFinite(der) ? der : null;
  let derScore = 50; // default if no data

  if (safeDER !== null) {
    if (sector === 'Financials') {
      // For banks: DER > 5 is normal. Score based on relative efficiency.
      derScore = clamp(((15 - safeDER) / 15) * 100, 20, 80);
      if (safeDER < 8) {
        details.push(`DER bank rendah (${safeDER.toFixed(1)}x) — sangat efisien`);
      } else {
        details.push(`DER bank wajar (${safeDER.toFixed(1)}x) — normal untuk perbankan`);
      }
    } else {
      // Non-financial: DER 0 = best, DER 1.5 = minimum acceptable
      derScore = clamp(((1.5 - safeDER) / 1.5) * 100, 0, 100);
      if (safeDER < 0.5) {
        details.push(`Utang sangat rendah (DER: ${safeDER.toFixed(2)}) — posisi keuangan kuat`);
      } else if (safeDER < 1.0) {
        details.push(`Level utang manageable (DER: ${safeDER.toFixed(2)})`);
      } else {
        details.push(`Utang lebih tinggi (DER: ${safeDER.toFixed(2)}) — perlu dimonitor`);
      }
    }
  } else {
    details.push('Data DER belum tersedia');
  }
  score += derScore * 0.20;

  // ── Revenue Growth Quality (15%) ───────────────────────────────────
  const safeRevGrowth = Number.isFinite(revenueGrowth) ? revenueGrowth : null;
  let revScore = 40; // default if no data

  if (safeRevGrowth !== null) {
    // Diminishing returns curve: rapid initial scoring, plateaus at high growth
    revScore = clamp(50 + Math.log1p(Math.max(0, safeRevGrowth)) * 20, 0, 100);
    if (safeRevGrowth >= 15) {
      details.push(`Pertumbuhan revenue kuat di ${safeRevGrowth.toFixed(1)}%`);
    } else if (safeRevGrowth >= 5) {
      details.push(`Pertumbuhan revenue stabil di ${safeRevGrowth.toFixed(1)}%`);
    } else if (safeRevGrowth >= 0) {
      details.push(`Pertumbuhan revenue lambat di ${safeRevGrowth.toFixed(1)}%`);
    } else {
      details.push(`Revenue menurun ${safeRevGrowth.toFixed(1)}%`);
      revScore = clamp(30 + safeRevGrowth * 2, 0, 30);
    }
  } else {
    details.push('Data pertumbuhan revenue belum tersedia');
  }
  score += revScore * 0.15;

  return {
    score: Math.round(clamp(score, 0, 100)),
    details,
    metrics: {
      roe: safeROE,
      der: safeDER,
      revenueGrowth: safeRevGrowth,
    },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
