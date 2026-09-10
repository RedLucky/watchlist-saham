/**
 * Win Rate & Performance Stats Engine
 * Pure mathematical calculation functions for trading signals,
 * cumulative return, payoff ratio, and mathematical expectancy.
 */

// Konstanta batas dan representasi string
export const DEFAULT_MAX_PAYOFF_RATIO = 99; // Rasio payoff saat ada win namun tidak ada loss
export const DEFAULT_EMPTY_PERCENT_STR = '+0.00%';

/**
 * Menghitung seluruh metrik kinerja dan rasio finansial dari daftar trade.
 * Bersifat pure function tanpa efek samping (deterministic).
 * 
 * @param {Array<Object>} items - Daftar objek rekomendasi/trade
 * @returns {Object} Kumpulan metrik terstruktur dan terformat
 */
export function calculateWinRateMetrics(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      waiting: 0,
      open: 0,
      closed: 0,
      wins: 0,
      losses: 0,
      expired: 0,
      winRate: '0%',
      winRateNum: 0,
      cumulativePnl: 0,
      cumulativePnlStr: DEFAULT_EMPTY_PERCENT_STR,
      avgWin: 0,
      avgWinStr: DEFAULT_EMPTY_PERCENT_STR,
      avgLoss: 0,
      avgLossStr: '0.00%',
      payoffRatio: 0,
      expectancy: 0,
      expectancyStr: DEFAULT_EMPTY_PERCENT_STR,
      isNetProfit: true,
    };
  }

  // 1. Klasifikasi Status Posisi
  const waiting = items.filter(r => r.status === 'WAITING_BUY').length;
  const open = items.filter(r => r.status === 'OPEN').length;
  const wins = items.filter(r => r.status === 'WIN').length;
  const losses = items.filter(r => r.status === 'LOSS').length;
  const expired = items.filter(r => r.status === 'EXPIRED' || r.status === 'CANCELLED').length;
  const closed = items.filter(r => ['WIN', 'LOSS', 'CLOSED', 'EXPIRED', 'CANCELLED'].includes(r.status));

  // 2. Win Rate Dasar
  const resolvedTrades = wins + losses;
  const winRateFraction = resolvedTrades > 0 ? (wins / resolvedTrades) : 0;
  const winRateNum = Math.round(winRateFraction * 100);

  // 3. Akumulasi Untung/Rugi & Rata-rata per Posisi
  let cumulativePnl = 0;
  let winSum = 0;
  let lossSum = 0;

  const resolvedItems = items.filter(r => r.status === 'WIN' || r.status === 'LOSS');
  for (const r of resolvedItems) {
    const entry = Number(r.priceAtRecommend || r.entryLow || 0);
    const exit = r.exitPrice != null
      ? Number(r.exitPrice)
      : (r.status === 'WIN' ? Number(r.targetPrice || entry) : Number(r.stopLoss || entry));

    if (entry > 0) {
      const nominalReturn = exit - entry;
      const tradePnlPercent = (nominalReturn / entry) * 100;

      cumulativePnl += tradePnlPercent;
      if (r.status === 'WIN') {
        winSum += tradePnlPercent;
      } else {
        lossSum += tradePnlPercent;
      }
    }
  }

  // 4. Rata-rata Keuntungan & Kerugian
  const avgWin = wins > 0 ? (winSum / wins) : 0;
  const avgLoss = losses > 0 ? (lossSum / losses) : 0;

  // 5. Rasio Risk/Reward Terealisasi (Payoff Ratio)
  let payoffRatio = 0;
  const absLoss = Math.abs(avgLoss);
  if (absLoss > 0) {
    payoffRatio = Number((avgWin / absLoss).toFixed(2));
  } else if (avgWin > 0) {
    payoffRatio = DEFAULT_MAX_PAYOFF_RATIO;
  }

  // 6. Ekspektansi Matematika per Trade
  // Rumus: (Peluang Menang * Rata-rata Win) + (Peluang Kalah * Rata-rata Loss)
  const lossRateFraction = 1 - winRateFraction;
  const winContribution = winRateFraction * avgWin;
  const lossContribution = lossRateFraction * avgLoss;
  const expectancy = winContribution + lossContribution;

  return {
    total: items.length,
    waiting,
    open,
    closed: closed.length,
    wins,
    losses,
    expired,
    winRate: `${winRateNum}%`,
    winRateNum,
    cumulativePnl: Number(cumulativePnl.toFixed(2)),
    cumulativePnlStr: `${cumulativePnl >= 0 ? '+' : ''}${cumulativePnl.toFixed(2)}%`,
    avgWin: Number(avgWin.toFixed(2)),
    avgWinStr: `+${avgWin.toFixed(2)}%`,
    avgLoss: Number(avgLoss.toFixed(2)),
    avgLossStr: `${avgLoss.toFixed(2)}%`,
    payoffRatio,
    expectancy: Number(expectancy.toFixed(2)),
    expectancyStr: `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}%`,
    isNetProfit: cumulativePnl >= 0,
  };
}

