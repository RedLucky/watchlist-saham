/**
 * Trending / Flow Score (0–100)
 * Measures how "hot" or actively traded a stock is.
 *
 * Uses 20-day moving average volume for comparison (instead of entire history).
 */

import { calculateVolumeMA } from '../indicators.js';

export function calculateTrendingScore(stock) {
  const { volumes } = stock?.technicals || {};
  const { transactionAvg, freqRank, turnover, volume, price } = stock || {};
  let score = 0;
  const details = [];
  const safeVolumes = Array.isArray(volumes) && volumes.length > 0 ? volumes : [1];
  const safeRank = Number.isFinite(freqRank) ? freqRank : 999;
  const safeTxn = Number.isFinite(turnover) && turnover > 0 
    ? turnover 
    : (Number.isFinite(transactionAvg) && transactionAvg > 0 
      ? transactionAvg 
      : (Number(price || 0) * Number(volume || 0)));

  // 1. Volume vs 20-day Average (40%)
  // Use 20-day MA for more relevant comparison
  const avgVolume20d = calculateVolumeMA(safeVolumes, 20);
  const recent3 = safeVolumes.slice(-3);
  const recentVolume = recent3.length > 0
    ? recent3.reduce((a, b) => a + Number(b || 0), 0) / recent3.length
    : 0;
  const volumeRatio = avgVolume20d > 0 ? recentVolume / avgVolume20d : 1;

  let volumeScore = 0;
  if (volumeRatio >= 2.0) {
    volumeScore = 100;
    details.push('Volume 2x+ di atas rata-rata 20 hari — minat pasar sangat tinggi');
  } else if (volumeRatio >= 1.5) {
    volumeScore = 85;
    details.push('Volume 50% di atas rata-rata — saham sedang tren');
  } else if (volumeRatio >= 1.2) {
    volumeScore = 60;
    details.push('Volume sedikit di atas rata-rata — minat moderat');
  } else if (volumeRatio >= 1.0) {
    volumeScore = 35;
    details.push('Volume di level rata-rata');
  } else {
    volumeScore = 15;
    details.push('Volume di bawah rata-rata — minat pasar rendah');
  }
  score += volumeScore * 0.40;

  // 2. Frequency Ranking (30%)
  let freqScore = 0;
  if (safeRank <= 5) {
    freqScore = 100;
    details.push(`Top ${safeRank} saham paling aktif diperdagangkan`);
  } else if (safeRank <= 10) {
    freqScore = 75;
    details.push(`Peringkat #${safeRank} dalam frekuensi trading — aktivitas bagus`);
  } else if (safeRank <= 20) {
    freqScore = 45;
    details.push(`Peringkat #${safeRank} dalam frekuensi trading — aktivitas moderat`);
  } else {
    freqScore = 20;
    details.push(`Peringkat #${safeRank} — bukan termasuk saham paling aktif`);
  }
  score += freqScore * 0.30;

  // 3. Transaction Value (30%)
  let txnScore = 0;
  const txnBillion = safeTxn / 1000000000;
  if (txnBillion >= 500) {
    txnScore = 100;
    details.push(`Nilai transaksi harian sangat tinggi (${formatIDR(safeTxn)}) — likuiditas sangat baik`);
  } else if (txnBillion >= 200) {
    txnScore = 80;
    details.push(`Nilai transaksi harian kuat (${formatIDR(safeTxn)})`);
  } else if (txnBillion >= 100) {
    txnScore = 55;
    details.push(`Nilai transaksi harian baik (${formatIDR(safeTxn)})`);
  } else if (txnBillion >= 50) {
    txnScore = 35;
    details.push(`Nilai transaksi harian moderat (${formatIDR(safeTxn)})`);
  } else {
    txnScore = 15;
    details.push(`Nilai transaksi harian rendah (${formatIDR(safeTxn)})`);
  }
  score += txnScore * 0.30;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { volumeRatio: volumeRatio.toFixed(2), freqRank: safeRank, txnBillion: txnBillion.toFixed(0) },
  };
}

function formatIDR(value) {
  if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(1)}T`;
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(0)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  return value.toLocaleString();
}
