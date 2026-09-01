import { getExchangeRateSync } from '../currencyService.js';

export function calculateRawDividendYield(stock) {
  const { dividendYield: yahooYield, marketCap, yahooDividendHistory } = stock.fundamentals || {};
  const yDivHistory = yahooDividendHistory || stock.yahooDividendHistory;
  let safeYield = 0;
  let ttmPerSaham = 0;
  let ttmTotalRupiah = 0;
  let hasRecentDividendEvent = false;
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 1. Ambil dari riwayat dividen BEI (IDX) dengan konversi mata uang
  if (stock.price > 0 && Array.isArray(stock.dividendHistory) && stock.dividendHistory.length > 0) {
    for (const div of stock.dividendHistory) {
      const dateVal = div.TanggalCum || div.TanggalEx || div.TanggalRecording || div.TanggalPembayaran;
      if (dateVal) {
        const cumDate = new Date(dateVal);
        if (cumDate >= oneYearAgo) {
          hasRecentDividendEvent = true;
          
          const currencyField = div.CashDividenPerSahamMU || div.JumlahDividenKasPerSahamMU || div.DividenPerSahamMU || div.MataUang || div.Currency || div.Valuta;
          const totalCurrencyField = div.CashDividenTotalMU || div.JumlahDividenKasTotalMU || div.MataUang || div.Currency || div.Valuta;

          const rate = getExchangeRateSync(currencyField);
          const totalRate = getExchangeRateSync(totalCurrencyField);
          const usdRate = getExchangeRateSync('USD');

          let dps = Number(div.CashDividenPerSaham ?? div.JumlahDividenKasPerSaham ?? div.DividenPerSaham ?? div.amount ?? div.dividend ?? 0);
          let totalDiv = Number(div.CashDividenTotal ?? div.JumlahDividenKasTotal ?? 0);

          // Konversi mata uang asing (USD, SGD, EUR, AUD, dll.) ke Rupiah secara real-time
          if (rate > 1 && dps > 0) {
            dps = dps * rate;
          } else if (rate === 1 && dps > 0 && dps <= 20 && stock.price >= 500) {
            // Implicit USD dividend detection (e.g. ITMG/ADRO/AADI announced $0.15/share without explicit MU tag)
            dps = dps * usdRate;
          }

          if (totalRate > 1 && totalDiv > 0) {
            totalDiv = totalDiv * totalRate;
          } else if (totalRate === 1 && totalDiv > 0 && totalDiv < 5000000000 && stock.price >= 500) {
            // Implicit USD total dividend detection
            totalDiv = totalDiv * usdRate;
          }

          ttmPerSaham += Number.isFinite(dps) ? dps : 0;
          ttmTotalRupiah += Number.isFinite(totalDiv) ? totalDiv : 0;
        }
      }
    }
  }

  // 2. Ambil dari riwayat dividen Yahoo Finance (sudah dalam IDR per lembar)
  if (stock.price > 0 && Array.isArray(yDivHistory) && yDivHistory.length > 0) {
    let yahooTtm = 0;
    for (const div of yDivHistory) {
      if (div.date && Number.isFinite(Number(div.dividends))) {
        const divDate = new Date(div.date);
        if (divDate >= oneYearAgo) {
          hasRecentDividendEvent = true;
          yahooTtm += Number(div.dividends);
        }
      }
    }
    if (yahooTtm > ttmPerSaham) {
      ttmPerSaham = yahooTtm;
    }
  }
  
  // LAYER 1: Hitung dari akumulasi dividen per lembar 12 bulan terakhir (TTM DPS / Price)
  if (stock.price > 0 && ttmPerSaham > 0) {
    safeYield = (ttmPerSaham / stock.price) * 100;
  } 
  // LAYER 2: Total Rupiah Dividen / Market Cap
  else if (ttmTotalRupiah > 0 && Number.isFinite(marketCap) && marketCap > 0) {
    safeYield = (ttmTotalRupiah / marketCap) * 100;
  } 
  // LAYER 3: Fallback ke data yield summary jika tidak ada riwayat per lembar
  else if (safeYield === 0 && Number.isFinite(yahooYield) && yahooYield > 0) {
    safeYield = yahooYield;
  }
  
  return safeYield;
}

export function calculateDividendScore(stock) {
  const { payoutRatio, dividendStreakYears } = stock.fundamentals || {};
  let safePayout = Number.isFinite(payoutRatio) ? Math.max(0, payoutRatio) : 0;
  
  // 1. Local TTM Dividend Yield Calculation
  let safeYield = calculateRawDividendYield(stock);

  // 2. Calculate consecutive streak years from DB or historical array
  let streakYears = Number.isFinite(dividendStreakYears) ? dividendStreakYears : 0;
  if (safeYield <= 0) {
    streakYears = 0;
  } else if (streakYears === 0 && Array.isArray(stock.dividendHistory) && stock.dividendHistory.length > 0) {
    const currentYear = new Date().getFullYear();
    const paidYears = new Set();
    for (const div of stock.dividendHistory) {
      const year = Number(div.TahunBuku) || (div.TanggalCum ? new Date(div.TanggalCum).getFullYear() : null);
      if (year) paidYears.add(year);
    }

    let checkYear = paidYears.has(currentYear) 
      ? currentYear 
      : (paidYears.has(currentYear - 1) 
        ? currentYear - 1 
        : (paidYears.has(currentYear - 2) ? currentYear - 2 : null));

    let calculatedStreak = 0;
    if (checkYear) {
      while (paidYears.has(checkYear)) {
        calculatedStreak++;
        checkYear--;
      }
    }
    streakYears = calculatedStreak;
  }

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
  if (safePayout >= 30 && safePayout <= 85) {
    payoutScore = 100;
    details.push(`Rasio payout sehat ${safePayout.toFixed(0)}% — berkelanjutan dan seimbang`);
  } else if (safePayout > 85 && safePayout <= 92) {
    payoutScore = 80;
    details.push(`Rasio payout tinggi ${safePayout.toFixed(0)}% — dermawan dan likuid`);
  } else if (safePayout > 0 && safePayout < 30) {
    payoutScore = 40;
    details.push(`Rasio payout rendah ${safePayout.toFixed(0)}% — perusahaan menahan porsi besar laba`);
  } else if (safePayout > 92) {
    payoutScore = 30;
    details.push(`Rasio payout sangat tinggi ${safePayout.toFixed(0)}% — risiko keberlanjutan`);
  } else if (safeYield > 0) {
    // Saham membagikan dividen kas tetapi payout ratio belum tercatat dari sumber eksternal
    payoutScore = streakYears >= 3 ? 50 : 25;
    details.push(streakYears >= 3 
      ? 'Dividen tunai aktif dibagikan (Estimasi rasio payout dalam evaluasi)'
      : 'Dividen tunai dibagikan (Rasio payout historis belum teruji)'
    );
  } else {
    payoutScore = 0;
    details.push('Tidak ada pembayaran dividen dalam 12 bulan terakhir');
  }
  score += payoutScore * 0.30;

  // 3. Multi-Year Dividend Consistency (20%)
  let streakScore = 0;
  if (streakYears >= 5) {
    streakScore = 100;
    details.push(`🏆 Konsistensi Prima — Rutin membagikan dividen ${streakYears} tahun berturut-turut (Kategori 5+ Tahun)`);
  } else if (streakYears >= 3) {
    streakScore = 70;
    details.push(`🎖️ Konsistensi Baik — Rutin membagikan dividen ${streakYears} tahun berturut-turut (Kategori 3+ Tahun)`);
  } else if (streakYears === 2) {
    streakScore = 35;
    details.push('✓ Membagikan dividen kas 2 tahun terakhir (Mulai membangun rekam jejak)');
  } else if (streakYears === 1) {
    streakScore = 15;
    details.push('⚠️ Baru membagikan dividen kas 1 tahun terakhir — belum teruji konsistensinya (risiko one-off)');
  } else if (safeYield > 0) {
    streakScore = 10;
    details.push('✓ Dividen kas aktif tercatat di BEI (Riwayat dividen dalam pemantauan)');
  } else {
    streakScore = 0;
    details.push('Belum ada rekam jejak dividen rutin');
  }
  score += streakScore * 0.20;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { dividendYield: safeYield, payoutRatio: safePayout, streakYears, dps: ttmPerSaham || (stock.price > 0 ? (stock.price * (safeYield / 100)) : 0) },
  };
}
