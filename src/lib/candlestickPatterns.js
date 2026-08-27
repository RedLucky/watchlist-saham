/**
 * Candlestick Pattern Recognition & Market Psychology Engine
 * Calibrated specifically for IDX (Indonesian Stock Exchange) Spot Equity Trading.
 * 
 * Rules for IDX spot trading (Long only):
 * 1. Bullish: Entry at Close, TP > Entry (+4%..+8%), SL < Entry (-2%..-3% at Swing Low)
 * 2. Bearish: Immediate Exit/TP at Close, Downside Support Target < Close (-4%..-6%), SL/Cut Loss at Support Breakdown
 * 3. Neutral: Wait & See, Upper Resistance > Close, Lower Support < Close
 */

export function analyzeCandlestickPatterns(data = []) {
  if (!Array.isArray(data) || data.length < 3) {
    return {
      currentPattern: null,
      historyPatterns: [],
      allDetected: [],
      trendContext: 'neutral',
    };
  }

  // Ensure data is sorted chronologically
  const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));
  const n = sorted.length;
  const latestIndex = n - 1;

  const patterns = [];

  // Helper properties for a single candle
  function getCandleProps(c) {
    const open = Number(c.open);
    const high = Number(c.high);
    const low = Number(c.low);
    const close = Number(c.close);
    const body = Math.abs(close - open);
    const range = high - low || 0.0001;
    const isBullish = close > open;
    const isBearish = close < open;
    const isDoji = body <= range * 0.1;
    const upperShadow = isBullish ? high - close : high - open;
    const lowerShadow = isBullish ? open - low : close - low;
    const bodyCenter = (open + close) / 2;

    return {
      time: c.time,
      open,
      high,
      low,
      close,
      body,
      range,
      isBullish,
      isBearish,
      isDoji,
      upperShadow,
      lowerShadow,
      bodyCenter,
    };
  }

  // Trend detection over lookback period
  function detectLocalTrend(endIdx, lookback = 10) {
    const startIdx = Math.max(0, endIdx - lookback);
    const subset = sorted.slice(startIdx, endIdx + 1);
    if (subset.length < 3) return 'neutral';
    const firstClose = Number(subset[0].close);
    const lastClose = Number(subset[subset.length - 1].close);
    const diffPct = ((lastClose - firstClose) / firstClose) * 100;
    if (diffPct > 2.5) return 'uptrend';
    if (diffPct < -2.5) return 'downtrend';
    return 'sideways';
  }

  // Scan across candles for the entire series
  for (let i = 2; i <= latestIndex; i++) {
    const c0 = getCandleProps(sorted[i]);       // Current candle
    const c1 = getCandleProps(sorted[i - 1]);   // 1 candle ago
    const c2 = getCandleProps(sorted[i - 2]);   // 2 candles ago
    const trend = detectLocalTrend(i - 1);

    let detected = null;

    // ── 1. MORNING STAR (Formasi 3 Candle Pembalikan Bullish) ──────────
    if (
      c2.isBearish && c2.body >= c2.range * 0.45 &&
      c1.body <= c2.body * 0.4 && c1.close < c2.bodyCenter &&
      c0.isBullish && c0.close > c2.bodyCenter
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(Math.min(c2.low, c1.low, c0.low) * 0.98);
      const tp = Math.round(c0.close * 1.06);
      detected = {
        name: 'Morning Star (Bintang Fajar)',
        shortName: 'Morning Star',
        emoji: '🌟',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 88,
        reliabilityLevel: 'Sangat Tinggi (88%)',
        time: c0.time,
        psychology: 'Penjual mendominasi pada candle pertama, namun kehilangan momentum di candle kedua (doji/small body). Candle ketiga dikuasai pembeli secara agresif, menandakan pembalikan arah naik yang sangat solid.',
        action: 'Buy on Confirmation / Entry Bertahap',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
        supportTarget: null,
      };
    }

    // ── 2. EVENING STAR (Formasi 3 Candle Pembalikan Bearish) ──────────
    else if (
      c2.isBullish && c2.body >= c2.range * 0.45 &&
      c1.body <= c2.body * 0.4 && c1.close > c2.bodyCenter &&
      c0.isBearish && c0.close < c2.bodyCenter
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.94);
      const slEmergency = Math.round(c0.low * 0.975);
      const resistance = Math.round(Math.max(c2.high, c1.high, c0.high) * 1.01);
      detected = {
        name: 'Evening Star (Bintang Senja)',
        shortName: 'Evening Star',
        emoji: '🌠',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 88,
        reliabilityLevel: 'Sangat Tinggi (88%)',
        time: c0.time,
        psychology: 'Kekuatan pembeli melemah di puncak tren. Tekanan jual masif pada candle ketiga mengonfirmasi distribusi dan sinyal pembalikan tren turun.',
        action: 'Amankan Profit / Pasang Trailing Stop / Hindari Beli',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
        supportTarget: downsideTarget,
        resistancePrice: resistance,
      };
    }

    // ── 3. THREE WHITE SOLDIERS ─────────────────────────────────────────
    else if (
      c2.isBullish && c1.isBullish && c0.isBullish &&
      c1.close > c2.close && c0.close > c1.close &&
      c0.body > c0.range * 0.5 && c1.body > c1.range * 0.5
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c2.low * 0.985);
      const tp = Math.round(c0.close * 1.08);
      detected = {
        name: 'Three White Soldiers (3 Prajurit)',
        shortName: '3 Soldiers',
        emoji: '🛡️',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK KUAT (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 85,
        reliabilityLevel: 'Tinggi (85%)',
        time: c0.time,
        psychology: 'Tiga candle hijau beruntun dengan penutupan semakin tinggi menunjukkan aksi akumulasi terstruktur dan tren naik yang sangat stabil.',
        action: 'Follow the Trend / Hold Posisi',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 4. THREE BLACK CROWS ────────────────────────────────────────────
    else if (
      c2.isBearish && c1.isBearish && c0.isBearish &&
      c1.close < c2.close && c0.close < c1.close &&
      c0.body > c0.range * 0.5 && c1.body > c1.range * 0.5
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.92);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Three Black Crows (3 Gagak Hitam)',
        shortName: '3 Crows',
        emoji: '🦅',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN KUAT (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 85,
        reliabilityLevel: 'Tinggi (85%)',
        time: c0.time,
        psychology: 'Tekanan jual intens terjadi 3 hari berturut-turut tanpa perlawanan berarti dari pihak pembeli. Downtrend kuat sedang berlangsung.',
        action: 'Hindari Beli / Kurangi Posisi',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 5. BULLISH ENGULFING ────────────────────────────────────────────
    else if (
      c1.isBearish && c0.isBullish &&
      c0.open <= c1.close && c0.close >= c1.open &&
      c0.body > c1.body * 1.1
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.985);
      const tp = Math.round(c0.close * 1.05);
      detected = {
        name: 'Bullish Engulfing',
        shortName: 'Engulfing',
        emoji: '🚀',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 82,
        reliabilityLevel: 'Tinggi (82%)',
        time: c0.time,
        psychology: 'Candle hijau besar menelan seluruh badan candle merah sebelumnya. Minat beli baru masuk dalam jumlah besar menggeser kendali pasar ke tangan bulls.',
        action: 'Buy on Weakness / Buy Breakout',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 6. BEARISH ENGULFING ────────────────────────────────────────────
    else if (
      c1.isBullish && c0.isBearish &&
      c0.open >= c1.close && c0.close <= c1.open &&
      c0.body > c1.body * 1.1
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.95);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Bearish Engulfing',
        shortName: 'Engulfing',
        emoji: '🩸',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 82,
        reliabilityLevel: 'Tinggi (82%)',
        time: c0.time,
        psychology: 'Candle merah besar menelan candle hijau sebelumnya. Penjual mengambil alih kendali pasar secara agresif setelah kenaikan harga.',
        action: 'Take Profit / Waspada Penurunan',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 7. PIERCING LINE (Bullish Reversal 2 Candle) ────────────────────
    else if (
      c1.isBearish && c0.isBullish &&
      c0.open < c1.low && c0.close > c1.bodyCenter && c0.close < c1.open
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.985);
      const tp = Math.round(c0.close * 1.045);
      detected = {
        name: 'Piercing Line',
        shortName: 'Piercing',
        emoji: '⚡',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 76,
        reliabilityLevel: 'Cukup Tinggi (76%)',
        time: c0.time,
        psychology: 'Harga dibuka lebih rendah namun ditutup menembus lebih dari 50% candle merah kemarin. Indikasi kuat adanya penolakan harga murah (*dip buying*).',
        action: 'Buy on Dip / Spekulatif Buy',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 8. DARK CLOUD COVER (Bearish Reversal 2 Candle) ─────────────────
    else if (
      c1.isBullish && c0.isBearish &&
      c0.open > c1.high && c0.close < c1.bodyCenter && c0.close > c1.open
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.95);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Dark Cloud Cover (Awan Gelap)',
        shortName: 'Dark Cloud',
        emoji: '☁️',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 75,
        reliabilityLevel: 'Cukup Tinggi (75%)',
        time: c0.time,
        psychology: 'Harga sempat dibuka lebih tinggi di atas resistance namun gagal bertahan dan ditutup di bawah separuh body hijau kemarin. Penjual menekan balik.',
        action: 'Take Profit / Pasang Trailing Stop',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 9. HAMMER (Palu Bullish di Area Bawah) ──────────────────────────
    else if (
      c0.lowerShadow >= c0.body * 2 &&
      c0.upperShadow <= c0.body * 0.35 &&
      c0.body > 0 &&
      (trend === 'downtrend' || c0.close <= c1.close)
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.98);
      const tp = Math.round(c0.close * 1.05);
      detected = {
        name: 'Hammer (Palu Reversal)',
        shortName: 'Hammer',
        emoji: '🔨',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 78,
        reliabilityLevel: 'Tinggi (78%)',
        time: c0.time,
        psychology: 'Penjual sempat menekan harga hingga titik terendah baru, tetapi pembeli bereaksi cepat memborong saham hingga harga ditutup di dekat puncaknya.',
        action: 'Buy on Support / Reversal Entry',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 10. SHOOTING STAR (Bintang Jatuh Bearish di Area Atas) ───────────
    else if (
      c0.upperShadow >= c0.body * 2 &&
      c0.lowerShadow <= c0.body * 0.35 &&
      c0.body > 0 &&
      (trend === 'uptrend' || c0.close >= c1.close)
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.95);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Shooting Star (Bintang Jatuh)',
        shortName: 'Shooting Star',
        emoji: '🌠',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 78,
        reliabilityLevel: 'Tinggi (78%)',
        time: c0.time,
        psychology: 'Pembeli mencoba mendorong harga ke level tertinggi baru, namun mengalami penolakan masif (*rejection*) dari para seller di area resistance.',
        action: 'Amankan Profit / Antisipasi Koreksi',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 11. INVERTED HAMMER (Palu Terbalik di Area Bawah) ───────────────
    else if (
      c0.upperShadow >= c0.body * 2 &&
      c0.lowerShadow <= c0.body * 0.35 &&
      trend === 'downtrend'
    ) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.985);
      const tp = Math.round(c0.close * 1.04);
      detected = {
        name: 'Inverted Hammer',
        shortName: 'Inv Hammer',
        emoji: '⛏️',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 72,
        reliabilityLevel: 'Sedang (72%)',
        time: c0.time,
        psychology: 'Tanda awal masuknya pembeli setelah downtrend panjang. Membutuhkan 1 candle konfirmasi hijau berikutnya untuk validasi.',
        action: 'Pantau / Tunggu Candle Konfirmasi',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 12. HANGING MAN (Gantung Diri di Puncak) ─────────────────────────
    else if (
      c0.lowerShadow >= c0.body * 2 &&
      c0.upperShadow <= c0.body * 0.35 &&
      trend === 'uptrend'
    ) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.96);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Hanging Man',
        shortName: 'Hanging Man',
        emoji: '⚠️',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 70,
        reliabilityLevel: 'Sedang (70%)',
        time: c0.time,
        psychology: 'Munculnya ekor bawah panjang di puncak tren menandakan pembeli mulai kewalahan menahan tekanan jual mendadak.',
        action: 'Ketat Stop Loss / Take Profit Sebagian',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 13. DRAGONFLY / GRAVESTONE DOJI ──────────────────────────────────
    else if (c0.isDoji && c0.lowerShadow >= c0.range * 0.7) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.98);
      const tp = Math.round(c0.close * 1.05);
      detected = {
        name: 'Dragonfly Doji (Capung Reversal)',
        shortName: 'Dragonfly',
        emoji: '🦗',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 75,
        reliabilityLevel: 'Cukup Tinggi (75%)',
        time: c0.time,
        psychology: 'Harga dibuka dan ditutup pada titik tertinggi setelah penurunan tajam, menunjukkan penolakan kuat terhadap harga rendah.',
        action: 'Buy on Dip / Konfirmasi Candle',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    } else if (c0.isDoji && c0.upperShadow >= c0.range * 0.7) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.95);
      const slEmergency = Math.round(c0.low * 0.975);
      detected = {
        name: 'Gravestone Doji (Batu Nisan)',
        shortName: 'Gravestone',
        emoji: '🪦',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 75,
        reliabilityLevel: 'Cukup Tinggi (75%)',
        time: c0.time,
        psychology: 'Harga dibuka dan ditutup pada titik terendah setelah sempat rally, menunjukkan penolakan total pada harga tinggi.',
        action: 'Hindari Beli / Take Profit',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    // ── 14. STANDARD DOJI / INDECISION ───────────────────────────────────
    else if (c0.isDoji) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.low * 0.985);
      const tp = Math.round(c0.high * 1.03);
      detected = {
        name: 'Doji (Konsolidasi)',
        shortName: 'Doji',
        emoji: '⚖️',
        direction: 'neutral',
        directionLabel: 'KONSOLIDASI (NETRAL)',
        badgeClass: 'bg-amber-500 text-white',
        reliability: 65,
        reliabilityLevel: 'Netral (65%)',
        time: c0.time,
        psychology: 'Kekuatan pembeli dan penjual seimbang sempurna. Pasar sedang berada dalam keraguan (*indecision*) menunggu katalis baru.',
        action: 'Wait & See / Tunggu Arah Breakout',
        entryLabel: 'Area Pantau',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Batas Bawah Support',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Atas Resistance',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    }

    // ── 15. BULLISH / BEARISH MARUBOZU ───────────────────────────────────
    else if (c0.isBullish && c0.body >= c0.range * 0.9) {
      const entry = Math.round(c0.close);
      const sl = Math.round(c0.open * 0.985);
      const tp = Math.round(c0.close * 1.06);
      detected = {
        name: 'Bullish Marubozu',
        shortName: 'Marubozu',
        emoji: '🟩',
        direction: 'bullish',
        directionLabel: 'POTENSI NAIK KUAT (BULLISH)',
        badgeClass: 'bg-emerald-500 text-white',
        reliability: 82,
        reliabilityLevel: 'Tinggi (82%)',
        time: c0.time,
        psychology: 'Candle hijau solid dari titik terendah hingga penutupan tertinggi. Pembeli mengontrol perdagangan sepanjang hari tanpa perlawanan.',
        action: 'Follow Momentum / Trend Riding',
        entryLabel: 'Area Entry Ideal',
        entryRange: `Rp ${entry.toLocaleString('id-ID')}`,
        entryPrice: entry,
        slLabel: 'Stop Loss Proteksi',
        stopLoss: `Rp ${sl.toLocaleString('id-ID')}`,
        stopLossPrice: sl,
        tpLabel: 'Target Take Profit',
        takeProfit: `Rp ${tp.toLocaleString('id-ID')}`,
        takeProfitPrice: tp,
      };
    } else if (c0.isBearish && c0.body >= c0.range * 0.9) {
      const exitPrice = Math.round(c0.close);
      const downsideTarget = Math.round(c0.close * 0.94);
      const slEmergency = Math.round(c0.open * 0.975);
      detected = {
        name: 'Bearish Marubozu',
        shortName: 'Marubozu',
        emoji: '🟥',
        direction: 'bearish',
        directionLabel: 'POTENSI TURUN KUAT (BEARISH)',
        badgeClass: 'bg-rose-500 text-white',
        reliability: 82,
        reliabilityLevel: 'Tinggi (82%)',
        time: c0.time,
        psychology: 'Candle merah solid dari pembukaan tertinggi hingga penutupan terendah. Penjual mengontrol pasar tanpa jeda.',
        action: 'Waspada Tekanan Lanjutan / Hindari Entry',
        entryLabel: 'Area Jual / Exit Sekarang',
        entryRange: `Rp ${exitPrice.toLocaleString('id-ID')}`,
        entryPrice: exitPrice,
        slLabel: 'Cut Loss Darurat (Jika Masih Hold)',
        stopLoss: `Rp ${slEmergency.toLocaleString('id-ID')}`,
        stopLossPrice: slEmergency,
        tpLabel: 'Target Penurunan (Support Dituju)',
        takeProfit: `Rp ${downsideTarget.toLocaleString('id-ID')}`,
        takeProfitPrice: downsideTarget,
      };
    }

    if (detected) {
      patterns.push(detected);
    }
  }

  // Get current active pattern (last candle or recent candle)
  const currentPattern = patterns.length > 0 ? patterns[patterns.length - 1] : {
    name: 'Formasi Standar (Normal Candle)',
    shortName: 'Normal',
    emoji: '📊',
    direction: 'neutral',
    directionLabel: 'TIDAK ADA POLA EKSTRIM (NETRAL)',
    badgeClass: 'bg-slate-500 text-white',
    reliability: 50,
    reliabilityLevel: 'Standar (50%)',
    time: sorted[latestIndex].time,
    psychology: 'Pergerakan harga berada dalam rentang wajar tanpa formasi pembalikan ekstrim. Pasar bergerak sesuai tren mayor yang sedang berjalan.',
    action: 'Ikuti Tren Mayor / Pasang Support-Resistance',
    entryLabel: 'Area Pantau',
    entryRange: `Rp ${Math.round(sorted[latestIndex].close).toLocaleString('id-ID')}`,
    entryPrice: Math.round(sorted[latestIndex].close),
    slLabel: 'Batas Bawah Support',
    stopLoss: `Rp ${Math.round(sorted[latestIndex].low * 0.985).toLocaleString('id-ID')}`,
    stopLossPrice: Math.round(sorted[latestIndex].low * 0.985),
    tpLabel: 'Target Atas Resistance',
    takeProfit: `Rp ${Math.round(sorted[latestIndex].high * 1.03).toLocaleString('id-ID')}`,
    takeProfitPrice: Math.round(sorted[latestIndex].high * 1.03),
  };

  const historyPatterns = patterns.slice(-5).reverse();
  const allDetected = patterns;
  const trendContext = detectLocalTrend(latestIndex);

  return {
    currentPattern,
    historyPatterns,
    allDetected,
    trendContext,
  };
}
