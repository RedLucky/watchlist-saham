/**
 * Hard Filter — stocks MUST pass ALL criteria to be included.
 * This is the first gate — no exceptions.
 *
 * Sector-aware: DER threshold is skipped for Financials (banks naturally have high DER).
 * Dynamic Turnover: Likuiditas minimum menyesuaikan gaya trading & mode pasar.
 */

import { isFinancialSector } from './financialHealth.js';

/**
 * Menentukan batas minimum turnover harian (Rupiah) berdasarkan gaya trading dan mode pasar:
 * - Scalping / Daily / Swing : Rp 250 Juta (Eksekusi cepat, minim slippage, likuiditas aktif)
 * - Defensive / Conservative / Dividend / Passive : Rp 1 Miliar (Investor institusi / Blue Chip mapan)
 * - Growth / Balanced / Auto : Rp 150 Juta (Keseimbangan emiten compounder potensial)
 * - Custom : Rp 50 Juta (Fleksibilitas riset mandiri)
 *
 * @param {string} [modeName='balanced']
 * @param {string} [styleName='swing']
 * @returns {number} Batas minimum turnover dalam Rupiah
 */
export function getMinTurnoverThreshold(modeName = 'balanced', styleName = 'swing') {
  const mode = String(modeName || '').toLowerCase().trim();
  const style = String(styleName || '').toLowerCase().trim();

  // 1. Trading aktif (Scalping / Daily / Swing): butuh likuiditas order book tebal
  if (style === 'scalping' || style === 'daily' || style === 'swing') {
    return 250_000_000; // Rp 250 Juta
  }

  // 2. Investor defensif / dividen: fokus emiten berkapitalisasi besar
  if (mode === 'defensive' || mode === 'conservative' || mode === 'dividend' || mode === 'passive') {
    return 1_000_000_000; // Rp 1 Miliar
  }

  // 3. Custom mode: fleksibilitas eksplorasi
  if (mode === 'custom') {
    return 50_000_000; // Rp 50 Juta
  }

  // 4. Default mode (Growth, Balanced, Auto)
  return 150_000_000; // Rp 150 Juta
}

export function applyHardFilter(stocks, minTurnover = 30000000) {
  return stocks.filter(stock => {
    const fundamentals = stock?.fundamentals || {};
    const profits = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit.filter(p => Number.isFinite(p)) : [];
    const txnAvg = Number(stock?.transactionAvg || 0);
    const sector = stock?.sector || '';

    // 1. ROE ≥ 8% (Penyaringan awal profitabilitas minimum)
    const roe = fundamentals.roe;
    if (Number.isFinite(roe) && roe < 8) {
      return false;
    }
    // Jika data ROE belum tersedia (null), loloskan agar dapat dinilai oleh scoring

    // 2. Laba bersih positif untuk tahun yang tersedia
    if (profits.length >= 2 && profits.some(p => p <= 0)) {
      return false;
    }

    // 3. DER ≤ 1.5 — DILEWATI untuk Sektor Keuangan/Perbankan
    // (Bank secara alami memiliki DER tinggi karena dana nasabah tercatat sebagai utang)
    if (!isFinancialSector(sector)) {
      const der = fundamentals.der;
      if (Number.isFinite(der) && der > 1.5) {
        return false;
      }
    }

    // 4. Turnover harian dinamis (berdasarkan gaya & mode pasar)
    if (txnAvg < minTurnover) {
      return false;
    }

    // Not suspended or abnormal
    if (stock.status !== 'active') {
      return false;
    }

    return true;
  });
}

export function getFilterReasons(stock, minTurnover = 30000000) {
  const reasons = [];
  const fundamentals = stock?.fundamentals || {};
  const sector = stock?.sector || '';

  if (Number.isFinite(fundamentals.roe) && fundamentals.roe < 8) {
    reasons.push(`ROE ${fundamentals.roe.toFixed(1)}% is below minimum 8%`);
  }

  const profits = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit.filter(p => Number.isFinite(p)) : [];
  if (profits.length >= 2 && profits.some(p => p <= 0)) {
    reasons.push('Net profit was negative in at least one recent year');
  }

  if (!isFinancialSector(sector) && Number.isFinite(fundamentals.der) && fundamentals.der > 1.5) {
    reasons.push(`DER ${fundamentals.der.toFixed(2)} melebihi batas maksimum 1.5x (sektor non-finansial)`);
  }

  if (Number(stock?.transactionAvg || 0) < minTurnover) {
    const formatted = minTurnover >= 1_000_000_000 
      ? `Rp ${(minTurnover / 1_000_000_000).toFixed(1)} Miliar` 
      : `Rp ${(minTurnover / 1_000_000).toFixed(0)} Juta`;
    reasons.push(`Turnover harian di bawah batas minimum ${formatted}/hari`);
  }

  if (stock?.status !== 'active') {
    reasons.push(`Stock status is ${stock?.status}`);
  }

  return reasons;
}
