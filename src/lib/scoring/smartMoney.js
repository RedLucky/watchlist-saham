/**
 * Smart Money Score (0–100)
 * Detects institutional accumulation patterns from price/volume data.
 *
 * Note: This uses heuristic proxies since real broker data is not available
 * from Yahoo Finance. The patterns detected (volume accumulation, price-volume
 * alignment, candle quality) are well-established institutional footprints.
 */

export function calculateSmartMoneyScore(stock) {
  const technicals = stock?.technicals || {};
  const prices = Array.isArray(technicals.prices) ? technicals.prices : [];
  const volumes = Array.isArray(technicals.volumes) ? technicals.volumes : [];
  const atr14 = technicals.atr14;
  const brokerData = stock?.brokerData || {};
  const { netBuy, concentration } = brokerData;
  const kseiLatest = stock?.kseiLatest || null;
  
  let score = 0;
  const details = [];

  // Require minimum price/volume data
  const hasSufficientData = prices.length >= 10 && volumes.length >= 10;
  if (!hasSufficientData) {
    return {
      score: 35,
      details: ['Data historis belum cukup untuk analisis smart money'],
      metrics: { volumeGrowth: '0', priceChange: '0', bfi: 0, retailPercent: 0 },
    };
  }

  const safePrices = prices;
  const safeVolumes = volumes;

  // 1. Volume Accumulation Pattern
  const last5Volumes = safeVolumes.slice(-5);
  const prev5Volumes = safeVolumes.slice(-10, -5);
  const last5Avg = last5Volumes.reduce((a, b) => a + b, 0) / last5Volumes.length;
  const prev5Avg = prev5Volumes.reduce((a, b) => a + b, 0) / prev5Volumes.length;
  const volumeGrowth = prev5Avg > 0 ? (last5Avg - prev5Avg) / prev5Avg : 0;

  let volumeAccScore = 0;
  if (volumeGrowth > 0.3) {
    volumeAccScore = 100;
    details.push('Volume meningkat kuat 5 hari terakhir — indikasi akumulasi institusi');
  } else if (volumeGrowth > 0.1) {
    volumeAccScore = 70;
    details.push('Volume meningkat moderat — sinyal akumulasi ada');
  } else if (volumeGrowth > 0) {
    volumeAccScore = 45;
    details.push('Sedikit kenaikan volume transaksi');
  } else {
    volumeAccScore = 15;
    details.push('Volume transaksi stabil / menurun');
  }

  // 2. Price-Volume Alignment
  const last5Prices = safePrices.slice(-5);
  const basePrice = last5Prices[0] || 1;
  const priceChange = (last5Prices[4] - basePrice) / basePrice;
  const dailyChanges = [];
  for (let i = 1; i < last5Prices.length; i++) {
    const prevPrice = last5Prices[i-1] || 1;
    dailyChanges.push(Math.abs((last5Prices[i] - prevPrice) / prevPrice));
  }
  const avgDailyChange = dailyChanges.length > 0 ? dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length : 0;
  const isGradual = avgDailyChange < 0.03;
  const isPriceRising = priceChange > 0.005;

  let alignmentScore = 0;
  if (isPriceRising && isGradual && volumeGrowth > 0) {
    alignmentScore = 100;
    details.push('Harga naik bertahap dengan volume — pola klasik akumulasi Smart Money');
  } else if (isPriceRising && volumeGrowth > 0) {
    alignmentScore = 65;
    details.push('Harga dan volume searah — momentum positif');
  } else if (isPriceRising) {
    alignmentScore = 40;
    details.push('Harga naik namun belum didukung lonjakan volume');
  } else {
    alignmentScore = 15;
    if (!isPriceRising && volumeGrowth > 0.2) {
      details.push('Peringatan: Volume tinggi saat harga turun / stagnan — indikasi distribusi');
    }
  }

  // 3. Candle Quality & ATR Volatility
  const atr = Number.isFinite(atr14) && atr14 > 0 ? atr14 : null;
  const currentPrice = safePrices[safePrices.length - 1] || 1;
  const normalizedVol = atr ? (atr / currentPrice) : avgDailyChange;

  let candleScore = 0;
  if (normalizedVol < 0.015) {
    candleScore = 100;
    details.push('Pergerakan harga sangat stabil — akumulasi terkontrol rapi');
  } else if (normalizedVol < 0.03) {
    candleScore = 70;
    details.push('Pergerakan harga relatif teratur');
  } else if (normalizedVol < 0.05) {
    candleScore = 40;
    details.push('Volatilitas harga moderat');
  } else {
    candleScore = 20;
    details.push('Volatilitas tinggi dalam pergerakan harian');
  }

  // 4. KSEI Ownership Flow & Bandarmologi Integration
  let kseiScore = 50;
  let bfi = 0;
  let retailPct = 0;

  if (kseiLatest && typeof kseiLatest === 'object') {
    bfi = Number(kseiLatest.bfi || 0);
    retailPct = Number(kseiLatest.retailPercent || 0);
    const pensionPct = Number(kseiLatest.pensionPercent || 0);
    const foreignPct = Number(kseiLatest.foreignPercent || 0);

    if (bfi >= 3.0 || (kseiLatest.deltaSmartMoney > 0 && kseiLatest.deltaRetail < 0)) {
      kseiScore = 100;
      details.push(`KSEI Flow: Super Akumulasi Institusi (BFI +${bfi.toFixed(1)}%, Ritel keluar, Institusi borong)`);
    } else if (bfi >= 1.0 || kseiLatest.deltaSmartMoney > 0) {
      kseiScore = 80;
      details.push(`KSEI Flow: Akumulasi Smart Money (Asing +${(kseiLatest.deltaForeign || 0).toLocaleString()} lbr)`);
    } else if (bfi <= -3.0 || (kseiLatest.deltaSmartMoney < 0 && kseiLatest.deltaRetail > 0)) {
      kseiScore = 10;
      details.push(`KSEI Flow: Distribusi Masif ke Ritel (BFI ${bfi.toFixed(1)}%, Ritel bertambah)`);
    } else if (bfi <= -1.0) {
      kseiScore = 30;
      details.push(`KSEI Flow: Distribusi Bertahap (Ritel masuk +${(kseiLatest.deltaRetail || 0).toLocaleString()} lbr)`);
    } else {
      kseiScore = 55;
      details.push(`KSEI Flow: Netral / Konsolidasi kepemilikan`);
    }

    if (pensionPct >= 1.0) {
      details.push(`Dukungan Dana Pensiun: ${pensionPct.toFixed(2)}% dipegang Dana Pensiun & Asuransi`);
    }
  } else {
    // Fallback if KSEI data not available yet: use broker proxy
    const safeNetBuy = Array.isArray(netBuy) && netBuy.length >= 5 ? netBuy : [0, 0, 0, 0, 0];
    const recentNetBuy = safeNetBuy.slice(-5);
    const positiveDays = recentNetBuy.filter(n => n > 0).length;
    if (positiveDays >= 4) kseiScore = 90;
    else if (positiveDays >= 3) kseiScore = 70;
    else if (positiveDays >= 2) kseiScore = 45;
    else kseiScore = 20;
  }

  // Combine components: 40% KSEI Flow + 30% Volume + 20% Alignment + 10% Volatility
  score = (kseiScore * 0.40) + (volumeAccScore * 0.30) + (alignmentScore * 0.20) + (candleScore * 0.10);

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: {
      volumeGrowth: (volumeGrowth * 100).toFixed(1),
      priceChange: (priceChange * 100).toFixed(2),
      bfi,
      retailPercent: retailPct,
    },
  };
}

/**
 * Unified Bandarmologi Status & Executive Verdict Engine
 * Shared across DatabaseProvider, StockOwnershipModal, StockScreener, DetailPanel
 */
export function getBandarmologiVerdict({
  bfi = 0,
  deltaSmartMoney = 0,
  deltaRetail = 0,
  deltaForeign = 0,
  priceChange = 0,
  turnoverSpikeRatio = 1,
  isDividendTrap = false,
  retailPercent = 0
} = {}) {
  const numBfi = Number(bfi) || 0;
  const numDeltaSM = Number(deltaSmartMoney) || 0;
  const numDeltaRetail = Number(deltaRetail) || 0;
  const numDeltaForeign = Number(deltaForeign) || 0;
  const numPriceChange = Number(priceChange) || 0;
  const numSpike = Number(turnoverSpikeRatio) || 1;

  if (isDividendTrap && numDeltaRetail > 0) {
    return {
      title: 'Waspada Dividend Trap ⚠️',
      status: '⚠️ Awas Dividend Trap!',
      badge: 'amber',
      theme: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
      desc: 'Terjadi lonjakan ritel masuk secara agresif menjelang/setelah tanggal Cum-Date dividen.',
      wyckoffPhase: 3,
    };
  }

  if (numBfi >= 3.0 || (numDeltaSM > 0 && numDeltaRetail < 0)) {
    return {
      title: 'Fase Super Akumulasi 🚀',
      status: 'Super Accumulation 🚀',
      badge: 'emerald',
      theme: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
      desc: `Institusi & Asing melakukan serok masif (+${Math.abs(numDeltaSM).toLocaleString('id-ID')} lbr) di saat investor ritel melakukan cut loss / jualan.`,
      wyckoffPhase: numPriceChange > 2 ? 2 : 1,
    };
  }

  if (numBfi >= 1.0 || numDeltaSM > 0 || numDeltaForeign > 0) {
    return {
      title: 'Akumulasi Institusi 🟢',
      status: 'Akumulasi Institusi 🟢',
      badge: 'emerald',
      theme: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      desc: 'Terjadi aliran akumulasi bertahap oleh investor institusi dan dana pensiun.',
      wyckoffPhase: 1,
    };
  }

  if (numBfi <= -3.0 || (numDeltaSM < 0 && numDeltaRetail > 0)) {
    return {
      title: 'Fase Distribusi Masif 🔴',
      status: 'Distribusi Masif 🔴',
      badge: 'rose',
      theme: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300',
      desc: `Ritel bertambah (+${Math.abs(numDeltaRetail).toLocaleString('id-ID')} lbr) sementara institusi keluar mendistribusikan barang.`,
      wyckoffPhase: numPriceChange < -2 ? 4 : 3,
    };
  }

  if (numBfi <= -1.0 || numDeltaRetail > 0) {
    return {
      title: 'Distribusi (Ritel Masuk) 🔴',
      status: 'Distribusi (Ritel Masuk) 🔴',
      badge: 'rose',
      theme: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      desc: 'Porsi ritel mengalami peningkatan sementara institusi mengurangi posisi.',
      wyckoffPhase: 3,
    };
  }

  if (numSpike > 1.5) {
    if (numPriceChange > 1) {
      return {
        title: 'Akumulasi Masif (Lonjakan Volume) 🟢',
        status: 'Akumulasi Masif 🟢',
        badge: 'emerald',
        theme: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
        desc: `Terjadi lonjakan volume transaksi ${(numSpike * 100).toFixed(0)}% dengan kenaikan harga.`,
        wyckoffPhase: 2,
      };
    }
    if (numPriceChange < -1) {
      return {
        title: 'Distribusi Masif (Panic Selling) 🔴',
        status: 'Distribusi Masif 🔴',
        badge: 'rose',
        theme: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
        desc: `Terjadi lonjakan volume saat harga turun tajam ${numPriceChange.toFixed(1)}%.`,
        wyckoffPhase: 4,
      };
    }
    return {
      title: 'Akumulasi Diam-Diam 🟡',
      status: 'Akumulasi Diam-Diam 🟡',
      badge: 'amber',
      theme: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      desc: 'Lonjakan transaksi tinggi namun harga dijaga tetap tenang di area konsolidasi.',
      wyckoffPhase: 1,
    };
  }

  return {
    title: 'Konsolidasi / Netral ⚪',
    status: 'Netral ⚪',
    badge: 'slate',
    theme: 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300',
    desc: 'Perpindahan kepemilikan saham antara ritel dan institusi masih relatif seimbang.',
    wyckoffPhase: 1,
  };
}
