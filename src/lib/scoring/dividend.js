// Dividend Score (0–100)
// Evaluates dividend quality, payout safety, and 5-year consistency

export function calculateDividendScore(stock) {
  const { dividendYield, payoutRatio, dividendStreakYears } = stock.fundamentals || {};
  const safeYield = Number.isFinite(dividendYield) ? Math.max(0, dividendYield) : 0;
  const safePayout = Number.isFinite(payoutRatio) ? Math.max(0, payoutRatio) : 0;
  
  // Default streakYears to 5 if yield > 0, else 0
  const streakYears = Number.isFinite(dividendStreakYears) 
    ? dividendStreakYears 
    : (safeYield > 0 ? 5 : 0);

  let score = 0;
  const details = [];

  // 1. Dividend Yield (50%)
  let yieldScore = 0;
  if (safeYield >= 6) {
    yieldScore = 100;
    details.push(`Yield dividen sangat baik ${safeYield.toFixed(1)}% — potensi passive income tinggi`);
  } else if (safeYield >= 4) {
    yieldScore = 80;
    details.push(`Yield dividen baik ${safeYield.toFixed(1)}% — di atas rata-rata pasar`);
  } else if (safeYield >= 2) {
    yieldScore = 55;
    details.push(`Yield dividen moderat ${safeYield.toFixed(1)}%`);
  } else if (safeYield > 0) {
    yieldScore = 25;
    details.push(`Yield dividen rendah ${safeYield.toFixed(1)}%`);
  } else {
    yieldScore = 0;
    details.push('Tidak ada dividen — perusahaan menahan laba');
  }
  score += yieldScore * 0.50;

  // 2. Payout Ratio (30%)
  let payoutScore = 0;
  if (safePayout >= 30 && safePayout <= 70) {
    payoutScore = 100;
    details.push(`Rasio payout sehat ${safePayout.toFixed(0)}% — berkelanjutan dan seimbang`);
  } else if (safePayout > 70 && safePayout <= 90) {
    payoutScore = 60;
    details.push(`Rasio payout tinggi ${safePayout.toFixed(0)}% — dermawan tapi rawan terpangkas`);
  } else if (safePayout > 0 && safePayout < 30) {
    payoutScore = 40;
    details.push(`Rasio payout rendah ${safePayout.toFixed(0)}% — perusahaan menahan porsi besar laba`);
  } else if (safePayout > 90) {
    payoutScore = 30;
    details.push(`Rasio payout sangat tinggi ${safePayout.toFixed(0)}% — risiko keberlanjutan`);
  } else {
    payoutScore = 0;
    details.push('Tidak ada pembayaran dividen');
  }
  score += payoutScore * 0.30;

  // 3. 5-Year Dividend Consistency (20%)
  let streakScore = 0;
  if (streakYears >= 5) {
    streakScore = 100;
    details.push(`Rutin membagikan dividen ${streakYears} tahun berturut-turut (Konsisten 5+ Thn)`);
  } else if (streakYears >= 3) {
    streakScore = 70;
    details.push(`Membagikan dividen ${streakYears} tahun berturut-turut`);
  } else if (streakYears >= 1) {
    streakScore = 40;
    details.push(`Membagikan dividen ${streakYears} tahun terakhir`);
  } else {
    streakScore = 0;
    details.push('Belum ada rekam jejak dividen rutin 5 tahun');
  }
  score += streakScore * 0.20;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { dividendYield: safeYield, payoutRatio: safePayout, streakYears },
  };
}
