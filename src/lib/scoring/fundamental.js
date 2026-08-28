/**
 * Fundamental Score (0–100)
 * Evaluates the quality of the company's financials.
 *
 * Handles missing data gracefully — null values get moderate default scores
 * rather than causing the stock to be rated poorly.
 */

export function calculateFundamentalScore(stock) {
  const { roe, der, netProfit, revenueGrowth, opm, eps, forwardEps, per } = stock?.fundamentals || {};
  const sector = stock?.sector;

  let score = 0;
  const details = [];

  // ── 1. ROE Quality (25%) ──────────────────────────────────────────────
  // 8% = baseline, 20%+ = excellent
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
  score += roeScore * 0.25;

  // ── 2. OPM & Operating Moat (20%) ───────────────────────────────────
  // Operating Profit Margin indicates pricing power and business durability
  const safeOPM = Number.isFinite(opm) ? opm : null;
  let opmScore = 50;
  if (safeOPM !== null) {
    if (safeOPM >= 25) {
      opmScore = 100;
      details.push(`Super Moat: OPM ${safeOPM.toFixed(1)}% — margin laba usaha sangat tebal & tangguh`);
    } else if (safeOPM >= 15) {
      opmScore = 85;
      details.push(`Strong Moat: OPM ${safeOPM.toFixed(1)}% — efisiensi operasional sangat kuat`);
    } else if (safeOPM >= 8) {
      opmScore = 65;
      details.push(`Standard OPM ${safeOPM.toFixed(1)}% — margin operasional stabil`);
    } else if (safeOPM > 0) {
      opmScore = 40;
      details.push(`Thin Margin: OPM ${safeOPM.toFixed(1)}% — rentan terhadap kenaikan biaya`);
    } else {
      opmScore = 10;
      details.push(`Rugi Operasional: OPM negatif ${safeOPM.toFixed(1)}%`);
    }
  } else {
    // Fallback: estimate from ROE/sector if OPM not available
    opmScore = safeROE !== null && safeROE >= 15 ? 70 : 50;
    details.push('Data OPM diestimasi dari profil operasional');
  }
  score += opmScore * 0.20;

  // ── 3. EPS Momentum & Profit Consistency (25%) ─────────────────────
  const profits = Array.isArray(netProfit) ? netProfit.filter(Number.isFinite) : [];
  let profitScore = 40; // default if insufficient data
  let cagr = null;

  if (profits.length >= 2) {
    const first = profits[0];
    const latest = profits[profits.length - 1];
    const years = profits.length - 1;

    if (first > 0 && latest > 0) {
      cagr = (Math.pow(latest / first, 1 / years) - 1) * 100;
    } else if (first <= 0 && latest > 0) {
      cagr = 100.0; // Turnaround
    } else if (first > 0 && latest <= 0) {
      cagr = -100.0; // Deteriorated
    } else {
      cagr = 0;
    }

    const allPositive = profits.every(v => v > 0);
    let avgProfitGrowth = 0;
    
    if (profits.length >= 3) {
      const base1 = Math.max(Math.abs(profits[0]), 1);
      const base2 = Math.max(Math.abs(profits[1]), 1);
      const growth1 = (profits[1] - profits[0]) / base1;
      const growth2 = (profits[2] - profits[1]) / base2;
      avgProfitGrowth = (growth1 + growth2) / 2;
    } else {
      const base = Math.max(Math.abs(profits[0]), 1);
      avgProfitGrowth = (profits[1] - profits[0]) / base;
    }

    const isGrowing = avgProfitGrowth > 0;

    if (allPositive && isGrowing) {
      profitScore = clamp(50 + avgProfitGrowth * 200, 50, 95);
      details.push(`Profit tumbuh konsisten — rata-rata pertumbuhan ${(avgProfitGrowth * 100).toFixed(1)}%`);
    } else if (allPositive) {
      profitScore = 60;
      details.push('Profit konsisten positif walau pertumbuhan melambat');
    } else if (isGrowing) {
      profitScore = 50;
      details.push('Profit dalam tren pemulihan (turnaround)');
    } else {
      profitScore = 20;
      details.push('Perusahaan mengalami kerugian');
    }
  } else {
    details.push('Data historis laba belum mencukupi');
  }

  // Bonus/Adjustment for Forward EPS Momentum
  const safeEps = Number.isFinite(eps) ? eps : null;
  const safeFwdEps = Number.isFinite(forwardEps) ? forwardEps : null;
  if (safeEps !== null && safeFwdEps !== null && safeEps > 0) {
    if (safeFwdEps > safeEps) {
      profitScore = Math.min(100, profitScore + 10);
      details.push(`Forward EPS positif (Rp ${safeFwdEps.toFixed(0)} vs Rp ${safeEps.toFixed(0)}) — proyeksi laba naik`);
    }
  }

  score += profitScore * 0.25;

  // ── 4. Financial Health / DER (15%) ────────────────────────────────────
  const safeDER = Number.isFinite(der) ? der : null;
  let derScore = 50;
  const isFinance = sector === 'Financials' || sector === 'Finance';

  if (safeDER !== null) {
    if (isFinance) {
      derScore = 70;
      details.push(`Sektor Finansial — DER ${safeDER.toFixed(2)}x (dievaluasi dengan standar industri keuangan)`);
    } else {
      if (safeDER <= 0.5) {
        derScore = 100;
        details.push(`Struktur modal sangat sehat — DER rendah ${safeDER.toFixed(2)}x`);
      } else if (safeDER <= 1.0) {
        derScore = 80;
        details.push(`Struktur modal sehat — DER ${safeDER.toFixed(2)}x di bawah batas aman`);
      } else if (safeDER <= 2.0) {
        derScore = 50;
        details.push(`Tingkat utang moderat — DER ${safeDER.toFixed(2)}x`);
      } else {
        derScore = 20;
        details.push(`Tingkat utang tinggi — DER ${safeDER.toFixed(2)}x`);
      }
    }
  } else {
    details.push('Data DER belum tersedia');
  }
  score += derScore * 0.15;

  // ── 5. Revenue Growth (15%) ───────────────────────────────────────────
  const safeRevGrowth = Number.isFinite(revenueGrowth) ? revenueGrowth : null;
  let revScore = 50;
  if (safeRevGrowth !== null) {
    if (safeRevGrowth >= 15) {
      revScore = 100;
      details.push(`Pertumbuhan revenue kuat di ${safeRevGrowth.toFixed(1)}%`);
    } else if (safeRevGrowth >= 8) {
      revScore = 80;
      details.push(`Pertumbuhan revenue sehat di ${safeRevGrowth.toFixed(1)}%`);
    } else if (safeRevGrowth >= 0) {
      revScore = 55;
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
      opm: safeOPM,
      eps: safeEps,
      forwardEps: safeFwdEps,
      der: safeDER,
      revenueGrowth: safeRevGrowth,
      cagr: cagr !== null ? Number(cagr.toFixed(1)) : null,
    },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
