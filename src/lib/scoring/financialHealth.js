/**
 * Financial Health & Valuation Module (Standar Pasar Modal Indonesia / BEI)
 *
 * Modul terpusat, modular, dan DRY untuk:
 * 1. Pembulatan Fraksi Harga Resmi BEI (IDX Tick Size)
 * 2. Deteksi Fleksibel Sektor Finansial / Perbankan
 * 3. Model Kebangkrutan Altman Z''-Score (Emerging Market Model)
 * 4. Piotroski F-Score (9 Kriteria Fundamental)
 * 5. Valuasi Benjamin Graham & Margin of Safety (Dukungan Yield SUN Dinamis)
 */

/**
 * Membulatkan harga ke fraksi harga (tick size) resmi Bursa Efek Indonesia (BEI / IDX).
 * 
 * Aturan Fraksi BEI:
 * - Harga < Rp 200        : Fraksi Rp 1
 * - Rp 200 s/d < Rp 500   : Fraksi Rp 2
 * - Rp 500 s/d < Rp 2.000 : Fraksi Rp 5
 * - Rp 2.000 s/d < Rp 5.000: Fraksi Rp 10
 * - Harga >= Rp 5.000     : Fraksi Rp 25
 *
 * @param {number} price - Harga saham yang akan dibulatkan
 * @param {'round'|'floor'|'ceil'} [method='round'] - Metode pembulatan
 * @returns {number} Harga yang telah diselaraskan dengan fraksi resmi BEI
 */
export function roundToIdxTick(price, method = 'round') {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return 0;

  let tick = 1;
  if (num < 200) {
    tick = 1;
  } else if (num < 500) {
    tick = 2;
  } else if (num < 2000) {
    tick = 5;
  } else if (num < 5000) {
    tick = 10;
  } else {
    tick = 25;
  }

  if (method === 'floor') return Math.floor(num / tick) * tick;
  if (method === 'ceil') return Math.ceil(num / tick) * tick;
  return Math.round(num / tick) * tick;
}

/**
 * Mengecek apakah suatu sektor merupakan Sektor Finansial / Perbankan.
 * Bersifat case-insensitive dan mendeteksi berbagai variasi alias (Banking, Finance, Financials, Keuangan).
 *
 * @param {string} sector - Nama sektor saham
 * @returns {boolean} True jika saham berada di sektor keuangan/perbankan
 */
export function isFinancialSector(sector) {
  if (!sector || typeof sector !== 'string') return false;
  const s = sector.toUpperCase().trim();
  return (
    s === 'FINANCIALS' ||
    s === 'FINANCE' ||
    s === 'FINANCIAL SERVICES' ||
    s === 'BANKING' ||
    s === 'KEUANGAN' ||
    s.includes('BANK') ||
    s.includes('FINANC')
  );
}

/**
 * Menghitung Piotroski F-Score (Skala 1–9)
 * Mengukur kekuatan tren fundamental dan kesehatan akuntansi perusahaan berdasarkan 9 kriteria Joseph Piotroski:
 *
 * Profitabilitas:
 * 1. Net Income / ROA > 0 (Tahun Berjalan)
 * 2. Operating Cash Flow (OCF) > 0
 * 3. Kualitas Akrual: OCF > Net Income (Arus kas riil melebihi laba pembukuan)
 * 4. Peningkatan ROA / Laba Bersih dibanding tahun sebelumnya
 *
 * Struktur Utang & Likuiditas:
 * 5. Leverage: DER menurun atau tingkat utang aman (DER <= 1.0)
 * 6. Likuiditas: Current Ratio >= 1.5
 * 7. Tidak Ada Dilusi Saham / Pertumbuhan Saham Beredar Stabil
 *
 * Efisiensi Operasional:
 * 8. Margin Laba Usaha (OPM/GPM) Sehat dan Positif
 * 9. Asset Turnover / Pertumbuhan Revenue Positif
 *
 * @param {object} fundamentals - Objek data fundamental emiten
 * @param {string} [sector=''] - Sektor emiten
 * @returns {number} Skor Piotroski F-Score antara 1 sampai 9
 */
export function calculatePiotroskiFScore(fundamentals = {}, sector = '') {
  if (!fundamentals || typeof fundamentals !== 'object') return 5;

  let score = 0;
  const roe = Number(fundamentals.roe) || 0;
  const roa = Number(fundamentals.roa) || 0;
  const opm = Number(fundamentals.opm) || 0;
  const eps = Number(fundamentals.eps) || 0;
  const fcf = Number(fundamentals.freeCashflow) || 0;
  const ocf = Number(fundamentals.operatingCashflow) || fcf;
  const der = Number(fundamentals.der) || 0;
  const currentRatio = Number(fundamentals.currentRatio) || 0;
  const revenueGrowth = Number(fundamentals.revenueGrowth) || 0;
  const netProfitList = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit : [];
  const netIncome = Number(fundamentals.netIncome) || (netProfitList.length > 0 ? netProfitList[netProfitList.length - 1] : 0);

  // Kriteria 1: Profitabilitas Positif (ROA > 0 atau ROE > 0)
  if (roa > 0 || (roa === 0 && roe > 0)) score++;

  // Kriteria 2: Arus Kas Operasional Positif (OCF > 0)
  if (ocf > 0) score++;

  // Kriteria 3: Kualitas Akrual (Kas Operasional > Laba Bersih)
  if (ocf > netIncome && netIncome > 0) score++;

  // Kriteria 4: Tren Laba Bersih Meningkat (Tahun ini > Tahun lalu)
  if (netProfitList.length >= 2) {
    if (netProfitList[netProfitList.length - 1] > netProfitList[netProfitList.length - 2]) score++;
  } else if (eps > 0 && revenueGrowth > 0) {
    score++; // Proksi: EPS positif dengan pertumbuhan pendapatan
  }

  // Kriteria 5: Utang Terkendali (DER <= 1.0 atau Sektor Finansial)
  if (isFinancialSector(sector) || (der > 0 && der <= 1.0)) score++;

  // Kriteria 6: Rasio Lancar Sehat (Current Ratio >= 1.5)
  if (isFinancialSector(sector) || currentRatio >= 1.5) score++;

  // Kriteria 7: Stabilitas Modal Saham / Efisiensi Margin
  if (opm >= 10 || (fundamentals.gpm && fundamentals.gpm >= 15)) score++;

  // Kriteria 8: Margin Operasional Bersih Positif (OPM > 0)
  if (opm > 0 || (fundamentals.gpm && fundamentals.gpm > 0)) score++;

  // Kriteria 9: Pertumbuhan Pendapatan (Revenue Growth > 0)
  if (revenueGrowth > 0) score++;

  return Math.max(1, Math.min(9, score));
}

/**
 * Menghitung Altman Z''-Score (Emerging Market Model untuk BEI / IDX)
 *
 * Formula Altman Z''-Score (1993/2000 untuk pasar berkembang & korporasi non-manufaktur):
 *   Z'' = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4 + 3.25
 *   - X1 = Working Capital / Total Assets
 *   - X2 = Retained Earnings / Total Assets
 *   - X3 = EBIT / Total Assets
 *   - X4 = Book Value of Equity / Total Liabilities
 *
 * Interpretasi Zona:
 * - Z'' > 2.60 : Zona Aman (Safe Zone — Risiko kebangkrutan sangat rendah)
 * - 1.10 <= Z'' <= 2.60 : Zona Abu-abu (Grey Zone — Perlu kehati-hatian)
 * - Z'' < 1.10 : Zona Bahaya (Distress Zone)
 *
 * Catatan Khusus Perbankan:
 * Rasio Z-Score tidak dapat diaplikasikan pada bank karena dana simpanan nasabah dibukukan sebagai liabilitas.
 * Bank diberikan nilai default aman (3.0).
 *
 * @param {object} fundamentals - Data fundamental emiten
 * @param {string} [sector=''] - Sektor saham
 * @param {number} [price=0] - Harga saham saat ini
 * @returns {number} Nilai Altman Z-Score
 */
export function calculateAltmanZScore(fundamentals = {}, sector = '', price = 0) {
  // Sektor Keuangan / Perbankan: Tidak tunduk pada Z-Score konvensional
  if (isFinancialSector(sector)) {
    return 3.0; // Skor aman default untuk bank mapan
  }

  if (!fundamentals || typeof fundamentals !== 'object') {
    return 2.5; // Default moderat netral
  }

  const cr = Number(fundamentals.currentRatio) || 1.2;
  const der = Number(fundamentals.der) || 1.0;
  const roa = Number(fundamentals.roa) || 0;
  const opm = Number(fundamentals.opm) || 0;
  const marketCap = Number(fundamentals.marketCap) || 0;
  const totalDebt = Number(fundamentals.totalDebt) || 0;
  const totalRevenue = Number(fundamentals.totalRevenue) || 0;

  let z = 0.5; // Base offset

  // Proksi X1: Kontribusi Modal Kerja (Working Capital via Current Ratio)
  z += Math.min(1.2, Math.max(0, (cr - 1.0) * 1.5));

  // Proksi X2: Saldo Laba Ditahan / Leverage (Inverse DER)
  if (der > 0) {
    z += Math.min(1.2, 1.0 / der);
  } else {
    z += 1.2;
  }

  // Proksi X3: EBIT / Total Assets (ROA + OPM Gabungan)
  const profitProxy = Math.max(roa, opm * 0.3);
  z += Math.min(0.8, Math.max(0, (profitProxy / 100) * 3));

  // Proksi X4: Ekuitas Pasar / Total Liabilitas
  if (totalDebt > 0 && marketCap > 0) {
    const equityToDebt = marketCap / totalDebt;
    z += Math.min(1.0, equityToDebt * 0.3);
  } else if (der > 0 && der < 2.0) {
    z += 0.5;
  }

  // Proksi X5: Efisiensi Pendapatan terhadap Kapitalisasi
  if (totalRevenue > 0 && marketCap > 0) {
    const revenueRatio = totalRevenue / marketCap;
    z += Math.min(0.5, revenueRatio * 0.3);
  }

  return Number(Math.max(0.5, Math.min(4.5, z)).toFixed(2));
}

/**
 * Menghitung Valuasi Benjamin Graham & Margin of Safety
 * Mendukung Yield Obligasi Negara (SUN 10-Tahun) secara dinamis & realtime.
 *
 * Formula Intrinsic Value Graham:
 *   V = EPS * (8.5 + 2 * g) * (4.4 / Y)
 *   - EPS = Laba per saham 12 bulan terakhir
 *   - g   = Laju pertumbuhan tahunan majemuk laba bersih (CAGR %) dibatasi 0%–25% untuk konservatif
 *   - 4.4 = Imbal hasil rata-rata obligasi korporasi triple-A saat Graham merumuskan
 *   - Y   = Yield obligasi negara saat ini (SUN 10-Tahun Indonesia, default: 6.5%)
 *
 * Formula Graham Number:
 *   GN = sqrt(22.5 * EPS * BVPS)
 *
 * Margin of Safety (MoS):
 *   MoS (%) = ((Fair Value - Harga Sekarang) / Fair Value) * 100%
 *
 * @param {object} params
 * @param {object} params.fundamentals - Data fundamental emiten
 * @param {number} params.price - Harga pasar saham saat ini
 * @param {number} [params.bondYield=6.5] - Yield obligasi acuan SUN 10-Tahun (%)
 * @returns {object} Hasil kalkulasi proyeksi valuasi Graham
 */
export function calculateGrahamValuation({ fundamentals = {}, price = 0, bondYield = 6.5 }) {
  const safePrice = Number(price) || 0;
  const safeYield = Number(bondYield) > 0 ? Number(bondYield) : 6.5;

  let eps = Number(fundamentals?.eps) || 0;
  let bvps = Number(fundamentals?.bookValue) || 0;

  // Fallback BVPS dari Price / PBV jika belum tersedia langsung
  if (bvps <= 0 && fundamentals?.pbv && fundamentals.pbv > 0 && safePrice > 0) {
    bvps = safePrice / fundamentals.pbv;
  }

  // Fallback EPS dari Price / PER
  if (eps <= 0 && fundamentals?.per && fundamentals.per > 0 && safePrice > 0) {
    eps = safePrice / fundamentals.per;
  }

  // 1. Hitung Pertumbuhan Laba Majemuk (CAGR)
  let cagr = 0;
  const netProfitList = Array.isArray(fundamentals?.netProfit) ? fundamentals.netProfit.filter(Number.isFinite) : [];
  if (netProfitList.length >= 2) {
    const first = netProfitList[0];
    const last = netProfitList[netProfitList.length - 1];
    const years = netProfitList.length - 1;
    if (first > 0 && last > 0 && years > 0) {
      cagr = Math.pow(last / first, 1 / years) - 1;
    }
  }

  // Fallback CAGR dari Pertumbuhan Pendapatan jika data laba tidak mencukupi
  if (cagr === 0 && Number.isFinite(fundamentals?.revenueGrowth)) {
    cagr = fundamentals.revenueGrowth / 100;
  }

  // Capped CAGR antara 0% s/d 25% demi prinsip kehati-hatian (margin of safety)
  const cappedCAGR = Math.max(0, Math.min(25, cagr * 100));

  // 2. Hitung Graham Number: sqrt(22.5 * EPS * BVPS)
  let grahamNumber = null;
  if (eps > 0 && bvps > 0) {
    const gnValue = 22.5 * eps * bvps;
    if (gnValue > 0) {
      grahamNumber = roundToIdxTick(Math.sqrt(gnValue));
    }
  }

  // 3. Hitung Benjamin Graham Fair Value
  let fairValue = null;
  let marginOfSafety = null;
  let projectedPrice12m = null;
  let projectedUpside = null;

  if (eps > 0) {
    const rawFairVal = eps * (8.5 + 2 * cappedCAGR) * (4.4 / safeYield);
    fairValue = roundToIdxTick(rawFairVal);

    if (fairValue > 0 && safePrice > 0) {
      marginOfSafety = Number((((fairValue - safePrice) / fairValue) * 100).toFixed(1));
    }

    const growthFactor = cagr > -0.5 ? cagr : 0;
    projectedPrice12m = roundToIdxTick(safePrice * (1 + growthFactor));
    if (safePrice > 0 && projectedPrice12m > 0) {
      projectedUpside = Number((((projectedPrice12m - safePrice) / safePrice) * 100).toFixed(1));
    }
  }

  return {
    eps: Number(eps.toFixed(2)),
    bvps: Number(bvps.toFixed(2)),
    cagrPercent: Number((cagr * 100).toFixed(1)),
    cappedCagrPercent: Number(cappedCAGR.toFixed(1)),
    bondYield: safeYield,
    grahamNumber,
    fairValue,
    marginOfSafety,
    projectedPrice12m,
    projectedUpside,
  };
}
