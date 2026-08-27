/**
 * Candlestick Pattern Recognition & Market Psychology Engine
 * Analyzes OHLCV data array to detect standard classical candlestick formations.
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

  // Scan across candles for the entire year
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')} - Rp ${Math.round(c0.close * 1.015).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(Math.min(c2.low, c1.low, c0.low) * 0.98),
        takeProfitPrice: Math.round(c0.close * 1.06),
        stopLoss: `Rp ${Math.round(Math.min(c2.low, c1.low, c0.low) * 0.98).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.06).toLocaleString('id-ID')}`,
      };
    }

    // ── 2. EVENING STAR (Formasi 3 Candle Pembalikan Bearish) ──────────
    else if (
      c2.isBullish && c2.body >= c2.range * 0.45 &&
      c1.body <= c2.body * 0.4 && c1.close > c2.bodyCenter &&
      c0.isBearish && c0.close < c2.bodyCenter
    ) {
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
        action: 'Take Profit / Kurangi Posisi / Hindari Beli',
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(Math.max(c2.high, c1.high, c0.high) * 1.01),
        takeProfitPrice: Math.round(c0.close * 0.94),
        stopLoss: `Rp ${Math.round(Math.max(c2.high, c1.high, c0.high) * 1.01).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.94).toLocaleString('id-ID')}`,
      };
    }

    // ── 3. THREE WHITE SOLDIERS ─────────────────────────────────────────
    else if (
      c2.isBullish && c1.isBullish && c0.isBullish &&
      c1.close > c2.close && c0.close > c1.close &&
      c0.body > c0.range * 0.5 && c1.body > c1.range * 0.5
    ) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c2.low * 0.985),
        takeProfitPrice: Math.round(c0.close * 1.08),
        stopLoss: `Rp ${Math.round(c2.low * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.08).toLocaleString('id-ID')}`,
      };
    }

    // ── 4. THREE BLACK CROWS ────────────────────────────────────────────
    else if (
      c2.isBearish && c1.isBearish && c0.isBearish &&
      c1.close < c2.close && c0.close < c1.close &&
      c0.body > c0.range * 0.5 && c1.body > c1.range * 0.5
    ) {
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
        action: 'Hindari Entry / Ketatkan Stop Loss',
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.02),
        takeProfitPrice: Math.round(c0.close * 0.92),
        stopLoss: `Rp ${Math.round(c0.high * 1.02).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.92).toLocaleString('id-ID')}`,
      };
    }

    // ── 5. BULLISH ENGULFING ────────────────────────────────────────────
    else if (
      c1.isBearish && c0.isBullish &&
      c0.open <= c1.close && c0.close >= c1.open &&
      c0.body > c1.body * 1.1
    ) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.985),
        takeProfitPrice: Math.round(c0.close * 1.05),
        stopLoss: `Rp ${Math.round(c0.low * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.05).toLocaleString('id-ID')}`,
      };
    }

    // ── 6. BEARISH ENGULFING ────────────────────────────────────────────
    else if (
      c1.isBullish && c0.isBearish &&
      c0.open >= c1.close && c0.close <= c1.open &&
      c0.body > c1.body * 1.1
    ) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.95),
        stopLoss: `Rp ${Math.round(c0.high * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.95).toLocaleString('id-ID')}`,
      };
    }

    // ── 7. PIERCING LINE (Bullish Reversal 2 Candle) ────────────────────
    else if (
      c1.isBearish && c0.isBullish &&
      c0.open < c1.low && c0.close > c1.bodyCenter && c0.close < c1.open
    ) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.985),
        takeProfitPrice: Math.round(c0.close * 1.045),
        stopLoss: `Rp ${Math.round(c0.low * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.045).toLocaleString('id-ID')}`,
      };
    }

    // ── 8. DARK CLOUD COVER (Bearish Reversal 2 Candle) ─────────────────
    else if (
      c1.isBullish && c0.isBearish &&
      c0.open > c1.high && c0.close < c1.bodyCenter && c0.close > c1.open
    ) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.95),
        stopLoss: `Rp ${Math.round(c0.high * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.95).toLocaleString('id-ID')}`,
      };
    }

    // ── 9. HAMMER (Palu Bullish di Area Bawah) ──────────────────────────
    else if (
      c0.lowerShadow >= c0.body * 2 &&
      c0.upperShadow <= c0.body * 0.35 &&
      c0.body > 0 &&
      (trend === 'downtrend' || c0.close <= c1.close)
    ) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.98),
        takeProfitPrice: Math.round(c0.close * 1.05),
        stopLoss: `Rp ${Math.round(c0.low * 0.98).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.05).toLocaleString('id-ID')}`,
      };
    }

    // ── 10. SHOOTING STAR (Bintang Jatuh Bearish di Area Atas) ───────────
    else if (
      c0.upperShadow >= c0.body * 2 &&
      c0.lowerShadow <= c0.body * 0.35 &&
      c0.body > 0 &&
      (trend === 'uptrend' || c0.close >= c1.close)
    ) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.95),
        stopLoss: `Rp ${Math.round(c0.high * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.95).toLocaleString('id-ID')}`,
      };
    }

    // ── 11. INVERTED HAMMER (Palu Terbalik di Area Bawah) ───────────────
    else if (
      c0.upperShadow >= c0.body * 2 &&
      c0.lowerShadow <= c0.body * 0.35 &&
      trend === 'downtrend'
    ) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.985),
        takeProfitPrice: Math.round(c0.close * 1.04),
        stopLoss: `Rp ${Math.round(c0.low * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.04).toLocaleString('id-ID')}`,
      };
    }

    // ── 12. HANGING MAN (Gantung Diri di Puncak) ─────────────────────────
    else if (
      c0.lowerShadow >= c0.body * 2 &&
      c0.upperShadow <= c0.body * 0.35 &&
      trend === 'uptrend'
    ) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.96),
        stopLoss: `Rp ${Math.round(c0.high * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.96).toLocaleString('id-ID')}`,
      };
    }

    // ── 13. DRAGONFLY / GRAVESTONE DOJI ──────────────────────────────────
    else if (c0.isDoji && c0.lowerShadow >= c0.range * 0.7) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.98),
        takeProfitPrice: Math.round(c0.close * 1.05),
        stopLoss: `Rp ${Math.round(c0.low * 0.98).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.05).toLocaleString('id-ID')}`,
      };
    } else if (c0.isDoji && c0.upperShadow >= c0.range * 0.7) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.high * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.95),
        stopLoss: `Rp ${Math.round(c0.high * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.95).toLocaleString('id-ID')}`,
      };
    }

    // ── 14. STANDARD DOJI / INDECISION ───────────────────────────────────
    else if (c0.isDoji) {
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
        entryRange: 'Menunggu konfirmasi',
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.low * 0.985),
        takeProfitPrice: Math.round(c0.high * 1.03),
        stopLoss: `Rp ${Math.round(c0.low * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.high * 1.03).toLocaleString('id-ID')}`,
      };
    }

    // ── 15. BULLISH / BEARISH MARUBOZU ───────────────────────────────────
    else if (c0.isBullish && c0.body >= c0.range * 0.9) {
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
        entryRange: `Rp ${Math.round(c0.close).toLocaleString('id-ID')}`,
        entryPrice: Math.round(c0.close),
        stopLossPrice: Math.round(c0.open * 0.985),
        takeProfitPrice: Math.round(c0.close * 1.06),
        stopLoss: `Rp ${Math.round(c0.open * 0.985).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 1.06).toLocaleString('id-ID')}`,
      };
    } else if (c0.isBearish && c0.body >= c0.range * 0.9) {
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
        entryRange: '-',
        entryPrice: null,
        stopLossPrice: Math.round(c0.open * 1.015),
        takeProfitPrice: Math.round(c0.close * 0.94),
        stopLoss: `Rp ${Math.round(c0.open * 1.015).toLocaleString('id-ID')}`,
        takeProfit: `Rp ${Math.round(c0.close * 0.94).toLocaleString('id-ID')}`,
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
    entryRange: 'Gunakan level support',
    entryPrice: null,
    stopLossPrice: null,
    takeProfitPrice: null,
    stopLoss: 'Gunakan MA20 / Swing Low',
    takeProfit: 'Gunakan Resistance terdekat',
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
