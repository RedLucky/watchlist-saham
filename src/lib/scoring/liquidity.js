/**
 * Liquidity Score (0–100)
 * Evaluates how easily a stock can be traded.
 *
 * Uses avgDailyTurnover (avgVolume3mo * price) for proper "average" metric
 * instead of today's snapshot.
 */

import { calculateVolumeMA } from '../indicators';

export function calculateLiquidityScore(stock) {
  const { volumes } = stock.technicals;
  const { transactionAvg } = stock; // This is now avgVolume3mo * price
  let score = 0;
  const details = [];
  const safeVolumes = Array.isArray(volumes) && volumes.length > 0 ? volumes : [1];
  const safeTxn = Number.isFinite(transactionAvg) ? transactionAvg : 0;

  // Daily Volume — 20-day MA (50%)
  const avgVolume = calculateVolumeMA(safeVolumes, 20);
  let volumeScore = 0;
  if (avgVolume >= 100000000) {
    volumeScore = 100;
    details.push('Sangat likuid — volume harian rata-rata sangat tinggi');
  } else if (avgVolume >= 50000000) {
    volumeScore = 85;
    details.push('Likuiditas tinggi — volume perdagangan besar');
  } else if (avgVolume >= 20000000) {
    volumeScore = 65;
    details.push('Likuiditas baik — volume harian memadai untuk swing trading');
  } else if (avgVolume >= 5000000) {
    volumeScore = 40;
    details.push('Likuiditas moderat — mungkin ada slippage pada order besar');
  } else {
    volumeScore = 20;
    details.push('Likuiditas rendah — berhati-hati dengan ukuran order');
  }
  score += volumeScore * 0.50;

  // Transaction Value (50%)
  const txnBillion = safeTxn / 1000000000;
  let txnScore = 0;
  if (txnBillion >= 500) {
    txnScore = 100;
    details.push('Nilai transaksi sangat tinggi — tidak ada masalah masuk/keluar posisi');
  } else if (txnBillion >= 200) {
    txnScore = 85;
    details.push('Nilai transaksi kuat — mudah ditradingkan');
  } else if (txnBillion >= 100) {
    txnScore = 65;
    details.push('Nilai transaksi baik untuk trader retail');
  } else if (txnBillion >= 50) {
    txnScore = 40;
    details.push('Nilai transaksi moderat');
  } else {
    txnScore = 20;
    details.push('Nilai transaksi rendah — mungkin mempengaruhi eksekusi');
  }
  score += txnScore * 0.50;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { avgVolume: avgVolume.toFixed(0), txnBillion: txnBillion.toFixed(0) },
  };
}
