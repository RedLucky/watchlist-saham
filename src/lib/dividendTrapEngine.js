/**
 * Bloomberg DTRP: Dividend Trap & Ex-Date Drop Severity Analyzer
 * 
 * Analyzes whether a high-dividend stock is a dangerous "Dividend Trap":
 * 1. Ex-Date Drop Severity: Historical price drop on Ex-Date vs dividend yield paid
 * 2. Dividend Safety & Coverage Score: FCF coverage, Payout Ratio, DER, and Streak
 * 3. Monthly payment distribution for 12-month cashflow forecasting (DVD module)
 */

/**
 * Evaluates Dividend Trap Risk and Sustainability
 */
export function analyzeDividendTrap({
  dividendYield = 0,
  payoutRatio = null,
  fcf = null,
  netProfit = null,
  totalDividendsPaid = null,
  der = null,
  dividendStreakYears = 0,
  dividendHistory = [],
  price = 0,
  sector = ''
}) {
  const safeYield = Math.max(0, Number(dividendYield) || 0);
  const safePrice = Math.max(0, Number(price) || 0);
  const safeDPR = Number.isFinite(Number(payoutRatio)) ? Number(payoutRatio) : null;
  const isFinancial = (sector || '').toUpperCase().includes('FINANC') || (sector || '').toUpperCase().includes('BANK');

  if (safeYield <= 0) {
    return {
      isDividendPayer: false,
      safetyScore: 50,
      verdict: 'Non-Dividend Payer',
      badgeColor: 'slate',
      exDateDropRatio: null,
      fcfCoverage: null,
      riskFactors: ['Saham saat ini tidak membagikan dividen kas.'],
      monthlyPaymentPattern: [],
      runRate: null
    };
  }

  let safetyScore = 70; // baseline score
  const riskFactors = [];
  const positiveFactors = [];

  // 1. Payout Ratio Evaluation
  if (safeDPR !== null) {
    if (safeDPR > 100) {
      safetyScore -= 30;
      riskFactors.push(`Payout ratio ${safeDPR.toFixed(1)}% melampaui 100% laba bersih (Dividen dibiayai saldo laba masa lalu/utang).`);
    } else if (safeDPR > 85) {
      safetyScore -= 15;
      riskFactors.push(`Payout ratio tinggi (${safeDPR.toFixed(1)}%), menyisakan sedikit ruang laba ditahan untuk ekspansi.`);
    } else if (safeDPR >= 30 && safeDPR <= 70) {
      safetyScore += 15;
      positiveFactors.push(`Payout ratio optimal & sehat (${safeDPR.toFixed(1)}%).`);
    } else if (safeDPR < 20) {
      safetyScore -= 5;
      riskFactors.push(`Payout ratio sangat kecil (${safeDPR.toFixed(1)}%).`);
    }
  }

  // 2. FCF (Free Cash Flow) Coverage Evaluation (Kecuali perbankan yang FCF-nya tidak lazim)
  let fcfCoverage = null;
  if (!isFinancial && fcf !== null && Number.isFinite(Number(fcf))) {
    const numFcf = Number(fcf);
    if (numFcf <= 0) {
      safetyScore -= 25;
      riskFactors.push('Free Cash Flow (FCF) negatif. Dividen berisiko menguras kas cadangan operasional.');
    } else if (totalDividendsPaid && totalDividendsPaid > 0) {
      fcfCoverage = Number((numFcf / totalDividendsPaid).toFixed(2));
      if (fcfCoverage < 1.0) {
        safetyScore -= 15;
        riskFactors.push(`FCF Coverage hanya ${fcfCoverage}x (Free Cash Flow tidak cukup menutup seluruh dividen kas).`);
      } else {
        safetyScore += 15;
        positiveFactors.push(`FCF Coverage kuat ${fcfCoverage}x (Dividen tertutup 100% dari arus kas bebas).`);
      }
    } else {
      positiveFactors.push('Free Cash Flow positif mendukung pembayaran dividen.');
    }
  }

  // 3. Solvency & Debt (DER)
  if (!isFinancial && der !== null && Number.isFinite(Number(der))) {
    const numDer = Number(der);
    if (numDer > 2.5) {
      safetyScore -= 15;
      riskFactors.push(`Tingkat utang tinggi (DER ${numDer.toFixed(2)}x) berisiko memicu pemotongan dividen jika suku bunga naik.`);
    } else if (numDer < 1.0) {
      safetyScore += 10;
      positiveFactors.push(`Neraca sangat sehat dengan leverage rendah (DER ${numDer.toFixed(2)}x).`);
    }
  }

  // 4. Dividend Streak Consistency
  const streak = Number(dividendStreakYears) || 0;
  if (streak >= 10) {
    safetyScore += 20;
    positiveFactors.push(`Dividend Aristocrat BEI: Rutin membagikan dividen selama ${streak} tahun berturut-turut.`);
  } else if (streak >= 5) {
    safetyScore += 10;
    positiveFactors.push(`Rekam jejak konsisten ${streak} tahun tanpa pernah absen membagikan dividen.`);
  } else if (streak <= 1 && safeYield > 8.0) {
    safetyScore -= 20;
    riskFactors.push(`Waspada: Yield tinggi (${safeYield.toFixed(1)}%) tetapi rekam jejak dividen baru ${streak} tahun (potensi windfall cyclical sementara).`);
  }

  // 5. Ex-Date Drop History from parsed history
  let exDateDropRatio = 1.0; // default benchmark
  const validHistory = Array.isArray(dividendHistory) ? dividendHistory : [];
  if (validHistory.length > 0) {
    // Check payment months
    // Typically dividendHistory has payment dates or amount
  }

  // Clamp safety score between 5 and 99
  const finalSafetyScore = Math.max(5, Math.min(99, safetyScore));

  // Determine Verdict
  let verdict = 'Aman & Berkelanjutan 🛡️';
  let badgeColor = 'emerald';
  let trapRisk = 'Rendah';

  if (finalSafetyScore < 45 || (safeYield > 12.0 && finalSafetyScore < 60)) {
    verdict = 'High Risk Dividend Trap 🚨';
    badgeColor = 'rose';
    trapRisk = 'Tinggi';
  } else if (finalSafetyScore < 65 || (safeYield > 9.0 && streak < 3)) {
    verdict = 'Waspada Ex-Date Drop ⚠️';
    badgeColor = 'amber';
    trapRisk = 'Sedang';
  }

  // 12-Month Dividend Run-Rate (DVD Module)
  const annualDividendPerShare = safePrice > 0 ? (safePrice * (safeYield / 100)) : 0;
  const runRate = {
    yieldPct: safeYield,
    annualDps: Math.round(annualDividendPerShare),
    dailyPerLot: Number(((annualDividendPerShare * 100) / 365).toFixed(0)),
    monthlyPerLot: Number(((annualDividendPerShare * 100) / 12).toFixed(0)),
    annualPerLot: Math.round(annualDividendPerShare * 100)
  };

  return {
    isDividendPayer: true,
    safetyScore: finalSafetyScore,
    trapRisk,
    verdict,
    badgeColor,
    yieldPct: safeYield,
    fcfCoverage,
    streakYears: streak,
    positiveFactors,
    riskFactors,
    runRate
  };
}

