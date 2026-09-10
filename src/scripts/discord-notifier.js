require('dotenv').config();
const { DatabaseProvider } = require('../lib/providers/DatabaseProvider.js');
const { scoreAllStocks } = require('../lib/scoring/index.js');
const { MODES, TRADING_STYLES, getModeConfig, getStyleConfig } = require('../lib/modes.js');
const { calculateSectorStrengths } = require('../lib/sectorRotation.js');
const { calculateTradeSetup } = require('../lib/tradeSetup.js');
const { calculateDEMA, calculateSupertrend } = require('../lib/indicators.js');
const { prisma } = require('../lib/prisma.js');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function generateRecommendations() {
  const provider = new DatabaseProvider();
  const [marketData, sectorPerformance, providerStocks] = await Promise.all([
    provider.getMarketData(),
    provider.getSectorPerformance(),
    provider.getStocks()
  ]);

  const { map: sectorMap } = calculateSectorStrengths(sectorPerformance);
  const { detectMarketMode } = require('../lib/modes.js');
  const detectedMode = detectMarketMode(marketData);
  const detectedConfig = getModeConfig(detectedMode);

  // Daftar Trading Styles yang dievaluasi per emiten
  const styles = [
    { ...getStyleConfig('swing'), label: 'Swing (1-3 Minggu)' },
    { ...getStyleConfig('daily'), label: 'Fast Swing (2-3 Hari)' },
    { ...getStyleConfig('scalping'), label: 'Scalping (Day Trade)' },
  ];

  // Helper untuk mengekstrak saham actionable terbaik untuk suatu mode
  function getActionableStocksForMode(stocks, modeKey, sectorMap, usedTickers, limit = 3) {
    const modeConfig = getModeConfig(modeKey);
    const candidates = [];
    const seenInThisMode = new Set();

    // Pass 1: Quality gate standar per style
    for (const style of styles) {
      const scored = scoreAllStocks(stocks, modeConfig.weights, style, sectorMap, modeKey);
      const minRR = style.qualityGate?.minRiskReward ?? 1.2;
      const minTech = style.qualityGate?.minTechnicalScore ?? 50;

      for (const s of scored) {
        if (usedTickers.has(s.ticker) || seenInThisMode.has(s.ticker)) continue;

        const tradeSetup = calculateTradeSetup(s.rawData, s.subScores.technical, style);
        const actionable = String(tradeSetup.setup || '').toLowerCase() !== 'none';
        const techScore = Number(s.subScores.technical?.score || 0);

        if (!actionable || tradeSetup.riskReward < minRR || techScore < minTech) {
          continue;
        }

        // Supertrend & DEMA status
        const rawTech = s.rawData?.technicals || {};
        const prices = Array.isArray(rawTech.prices) && rawTech.prices.length > 0 ? rawTech.prices : [s.price];
        const highs = Array.isArray(rawTech.highs) && rawTech.highs.length > 0 ? rawTech.highs : prices;
        const lows = Array.isArray(rawTech.lows) && rawTech.lows.length > 0 ? rawTech.lows : prices;
        const candleData = prices.map((p, idx) => ({ high: highs[idx] ?? p, low: lows[idx] ?? p, close: p }));

        const dema20 = calculateDEMA(prices, 20);
        const supertrend = calculateSupertrend(candleData, 10, 3.0);
        const isBull = supertrend.trend === 'bullish';
        const isAboveDema = s.price >= dema20;

        let badge = '⚪ WAIT';
        if (isBull && isAboveDema) badge = supertrend.isReversal ? '🚀 S.BUY' : '🟢 BUY';
        else if (!isBull && !isAboveDema) badge = '🔴 SELL';
        else if (isBull && !isAboveDema) badge = '🟡 PULLBACK';
        else if (!isBull && isAboveDema) badge = '🔵 TEST BO';

        let smartMoneyBadge = '';
        if (s.rawData?.kseiLatest) {
          if (s.rawData.kseiLatest.deltaSmartMoney > 0) smartMoneyBadge = ' 🟢 Akumulasi';
          else if (s.rawData.kseiLatest.deltaSmartMoney < 0) smartMoneyBadge = ' 🔴 Distribusi';
        }

        candidates.push({
          ticker: s.ticker,
          name: s.name,
          price: s.price,
          score: s.score,
          style: style.name,
          styleLabel: style.label,
          entry: tradeSetup.entry,
          target: tradeSetup.target,
          stopLoss: tradeSetup.stopLoss,
          riskReward: tradeSetup.riskReward,
          setup: tradeSetup.setup,
          badge,
          smartMoneyBadge
        });
        seenInThisMode.add(s.ticker);
      }
    }

    // Pass 2: Jika kandidat kurang dari limit, lakukan seleksi relaksasi (minRR >= 1.2, techScore >= 45)
    if (candidates.length < limit) {
      for (const style of styles) {
        const scored = scoreAllStocks(stocks, modeConfig.weights, style, sectorMap, modeKey);
        for (const s of scored) {
          if (usedTickers.has(s.ticker) || seenInThisMode.has(s.ticker)) continue;

          const tradeSetup = calculateTradeSetup(s.rawData, s.subScores.technical, style);
          const actionable = String(tradeSetup.setup || '').toLowerCase() !== 'none';
          const techScore = Number(s.subScores.technical?.score || 0);

          if (!actionable || tradeSetup.riskReward < 1.2 || techScore < 45) {
            continue;
          }

          const rawTech = s.rawData?.technicals || {};
          const prices = Array.isArray(rawTech.prices) && rawTech.prices.length > 0 ? rawTech.prices : [s.price];
          const highs = Array.isArray(rawTech.highs) && rawTech.highs.length > 0 ? rawTech.highs : prices;
          const lows = Array.isArray(rawTech.lows) && rawTech.lows.length > 0 ? rawTech.lows : prices;
          const candleData = prices.map((p, idx) => ({ high: highs[idx] ?? p, low: lows[idx] ?? p, close: p }));

          const dema20 = calculateDEMA(prices, 20);
          const supertrend = calculateSupertrend(candleData, 10, 3.0);
          const isBull = supertrend.trend === 'bullish';
          const isAboveDema = s.price >= dema20;

          let badge = '⚪ WAIT';
          if (isBull && isAboveDema) badge = supertrend.isReversal ? '🚀 S.BUY' : '🟢 BUY';
          else if (!isBull && !isAboveDema) badge = '🔴 SELL';
          else if (isBull && !isAboveDema) badge = '🟡 PULLBACK';
          else if (!isBull && isAboveDema) badge = '🔵 TEST BO';

          let smartMoneyBadge = '';
          if (s.rawData?.kseiLatest) {
            if (s.rawData.kseiLatest.deltaSmartMoney > 0) smartMoneyBadge = ' 🟢 Akumulasi';
            else if (s.rawData.kseiLatest.deltaSmartMoney < 0) smartMoneyBadge = ' 🔴 Distribusi';
          }

          candidates.push({
            ticker: s.ticker,
            name: s.name,
            price: s.price,
            score: s.score,
            style: style.name,
            styleLabel: style.label,
            entry: tradeSetup.entry,
            target: tradeSetup.target,
            stopLoss: tradeSetup.stopLoss,
            riskReward: tradeSetup.riskReward,
            setup: tradeSetup.setup,
            badge,
            smartMoneyBadge
          });
          seenInThisMode.add(s.ticker);
        }
      }
    }

    // Urutkan kandidat berdasarkan skor tertinggi
    candidates.sort((a, b) => b.score - a.score);

    const chosen = [];
    for (const c of candidates) {
      if (!usedTickers.has(c.ticker)) {
        chosen.push(c);
        usedTickers.add(c.ticker);
        if (chosen.length >= limit) break;
      }
    }
    return chosen;
  }

  // Pelacak ticker global untuk memastikan TIDAK ADA OVERLAP antar mode
  const usedTickers = new Set();

  // Susun daftar mode yang akan dikirim:
  // Aturan: Kirim Mode Otomatis, Seimbang, dan Pertumbuhan.
  // Jika Mode Otomatis = Seimbang atau Pertumbuhan, jangan kirim 2x (tidak overlap).
  const modeConfigsToRun = [];

  // 1. Mode Otomatis (selalu ada)
  modeConfigsToRun.push({
    id: 'auto',
    modeKey: detectedMode,
    modeLabel: `Mode Otomatis (${detectedConfig.label})`,
    title: `🤖 1. REKOMENDASI MODE OTOMATIS (Deteksi: ${detectedConfig.label.toUpperCase()})`,
    subtitle: `Kondisi Pasar: ${detectedConfig.label} ${detectedConfig.emoji} | Adaptif real-time terhadap tren & volatilitas IHSG saat ini`,
    color: detectedConfig.name === 'defensive' ? 0xf59e0b : (detectedConfig.name === 'growth' ? 0x10b981 : 0x6366f1),
  });

  // 2. Mode Seimbang (Balanced) — hanya ditambahkan jika Mode Otomatis bukan Seimbang
  if (detectedMode !== 'balanced') {
    const orderNum = modeConfigsToRun.length + 1;
    modeConfigsToRun.push({
      id: 'balanced',
      modeKey: 'balanced',
      modeLabel: 'Mode Seimbang',
      title: `⚖️ ${orderNum}. REKOMENDASI MODE SEIMBANG (BALANCED)`,
      subtitle: `Target Pertumbuhan Terukur | Keseimbangan fundamental solid & momentum teknikal teruji`,
      color: 0x3b82f6, // Blue
    });
  }

  // 3. Mode Pertumbuhan (Growth) — hanya ditambahkan jika Mode Otomatis bukan Pertumbuhan
  if (detectedMode !== 'growth') {
    const orderNum = modeConfigsToRun.length + 1;
    modeConfigsToRun.push({
      id: 'growth',
      modeKey: 'growth',
      modeLabel: 'Mode Pertumbuhan',
      title: `🚀 ${orderNum}. REKOMENDASI MODE PERTUMBUHAN (GROWTH)`,
      subtitle: `Target Momentum & Breakout | Fokus pada emiten tren naik kuat & volume akumulasi`,
      color: 0x10b981, // Emerald Green
    });
  }

  // Ambil saham untuk tiap mode tanpa overlap
  const categories = modeConfigsToRun.map((cfg) => {
    const stocks = getActionableStocksForMode(providerStocks, cfg.modeKey, sectorMap, usedTickers, 3);
    return {
      ...cfg,
      stocks,
    };
  });

  return { marketData, detectedMode, categories };
}

function getNextTradingDate(currentDate = new Date()) {
  const jakartaStr = currentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const d = new Date(jakartaStr);
  const hour = d.getHours();

  // Jika lewat jam 15:00 WIB (menjelang / setelah bursa tutup), target eksekusi adalah hari bursa berikutnya
  if (hour >= 15) {
    d.setDate(d.getDate() + 1);
  }

  // Lewati Sabtu (6) dan Minggu (0) ke hari bursa Senin
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

function formatDiscordEmbeds(data) {
  const { marketData, detectedMode, categories } = data;
  const now = new Date();
  
  const createdDateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  const nextTradingDate = getNextTradingDate(now);
  const targetTradingDateStr = nextTradingDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const embeds = [];

  // 1. Overview Header Embed
  const ihsgChange = Number(marketData?.indexChange || 0);
  const ihsgSign = ihsgChange >= 0 ? '+' : '';
  const detectedConfig = getModeConfig(detectedMode);

  let modeSummaryNote = `Kurasi mencakup **Mode Otomatis (${detectedConfig.label})**, **Mode Seimbang**, dan **Mode Pertumbuhan** tanpa tumpang tindih (Zero Overlap).`;
  if (detectedMode === 'balanced') {
    modeSummaryNote = `💡 **Info Pasar**: Mode Otomatis mendeteksi kondisi **Seimbang**, sehingga **Mode Seimbang** otomatis diwakili langsung oleh Mode Otomatis *(Mencegah pengiriman ganda / No Overlap)*.`;
  } else if (detectedMode === 'growth') {
    modeSummaryNote = `💡 **Info Pasar**: Mode Otomatis mendeteksi kondisi **Pertumbuhan**, sehingga **Mode Pertumbuhan** otomatis diwakili langsung oleh Mode Otomatis *(Mencegah pengiriman ganda / No Overlap)*.`;
  }

  embeds.push({
    title: `📋 WATCHLIST EKSEKUSI SAHAM IDX — ${targetTradingDateStr.toUpperCase()}`,
    description: `Watchlist saham presisi untuk perdagangan bursa hari **${targetTradingDateStr}** *(Disiapkan: ${createdDateStr})*.\n\n` +
      `🏛️ **Kondisi Pasar**: IHSG **${Number(marketData?.indexValue || 7200).toLocaleString('id-ID')}** (${ihsgSign}${ihsgChange.toFixed(2)}%) • Deteksi Pasar: **${detectedConfig.label.toUpperCase()}** ${detectedConfig.emoji}\n` +
      `${modeSummaryNote}`,
    color: 0x6366f1, // Indigo
  });

  // 2. Category Embeds (Per Mode)
  for (const cat of categories) {
    if (cat.stocks.length === 0) {
      embeds.push({
        title: cat.title,
        description: `*${cat.subtitle}*\n\n*(Tidak ada saham yang memenuhi kriteria risk-reward ketat pada mode ini hari ini)*`,
        color: cat.color
      });
      continue;
    }

    const lines = cat.stocks.map((s, idx) => {
      const entryRange = `Rp ${s.entry.low.toLocaleString('id-ID')} - ${s.entry.high.toLocaleString('id-ID')}`;
      return `**${idx + 1}. ${s.ticker}** (Rp ${s.price.toLocaleString('id-ID')}):\n` +
        `   • Area Beli: **${entryRange}**\n` +
        `   • Target TP: **Rp ${s.target.toLocaleString('id-ID')}** | Cut Loss (SL): **Rp ${s.stopLoss.toLocaleString('id-ID')}**\n` +
        `   • Sinyal: [**${s.badge}**] • Setup: *${s.setup}* • Gaya: *${s.styleLabel}* • Skor: **${s.score}**${s.smartMoneyBadge}`;
    });

    embeds.push({
      title: cat.title,
      description: `*${cat.subtitle}*\n\n` + lines.join('\n\n'),
      color: cat.color
    });
  }

  // 3. Compact Risk Disclaimer
  embeds.push({
    title: `⚠️ Disclaimer & Money Management`,
    description: `Watchlist ini adalah hasil komputasi algoritma & bukan anjuran mutlak beli/jual (DYOR). Disiplin terapkan batasan Stop Loss untuk proteksi modal. Keputusan transaksi sepenuhnya tanggung jawab pribadi.`,
    color: 0x64748b, // Slate
    footer: { text: 'Watchlist Saham • Automated Multi-Mode Advisor' },
    timestamp: now.toISOString()
  });

  return [{ embeds }];
}

async function sendToDiscord(payloads) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[DISCORD] DISCORD_WEBHOOK_URL belum diatur di file .env. Notifikasi tidak terkirim.');
    return false;
  }

  try {
    for (const payload of payloads) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[DISCORD] ❌ Gagal mengirim ke Discord (${res.status}): ${errText}`);
        return false;
      }
      // Small pause between multiple embeds to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    console.log('[DISCORD] ✅ Berhasil mengirim seluruh rekomendasi saham harian ke Discord!');
    return true;
  } catch (e) {
    console.error(`[DISCORD] ❌ Error koneksi webhook: ${e.message}`);
    return false;
  }
}

async function recordSystemRecommendations(categories) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let addedCount = 0;

  for (const cat of categories) {
    for (const s of cat.stocks) {
      try {
        // Prevent duplicate system recommendations for same ticker and style on the same day
        const existing = await prisma.recommendation.findFirst({
          where: {
            source: 'SYSTEM',
            ticker: s.ticker,
            style: s.style,
            date: { gte: today }
          }
        });

        if (existing) {
          continue;
        }

        const buyPrice = s.entry.low;
        await prisma.recommendation.create({
          data: {
            userId: null,
            source: 'SYSTEM',
            ticker: s.ticker,
            name: s.name,
            date: new Date(),
            mode: cat.modeKey || 'balanced',
            style: s.style || 'swing',
            score: s.score || 0,
            priceAtRecommend: buyPrice,
            entryLow: s.entry.low,
            entryHigh: s.entry.high,
            targetPrice: s.target,
            stopLoss: s.stopLoss,
            rrRatio: s.riskReward || 0,
            status: 'WAITING_BUY',
            notes: `Rekomendasi otomatis Bot Discord (${cat.modeLabel} - ${s.styleLabel}). Menunggu antrean beli di Rp ${s.entry.low.toLocaleString('id-ID')} - ${s.entry.high.toLocaleString('id-ID')}.`
          }
        });
        addedCount++;
      } catch (err) {
        console.error(`[DISCORD-RECORD] Gagal mencatat ${s.ticker} ke database:`, err.message);
      }
    }
  }

  console.log(`[DISCORD-RECORD] 📊 Berhasil mencatat ${addedCount} rekomendasi sistem ke Win Rate Dashboard (status: WAITING_BUY).`);
  return addedCount;
}

async function main() {
  console.log('=== MEMULAI GENERASI REKOMENDASI SAHAM MULTI-MODE UNTUK DISCORD ===');
  try {
    const data = await generateRecommendations();
    const totalStocks = data.categories.reduce((acc, c) => acc + c.stocks.length, 0);
    console.log(`Ditemukan total ${totalStocks} saham rekomendasi dari ${data.categories.length} mode tanpa overlap.`);
    const payloads = formatDiscordEmbeds(data);
    await sendToDiscord(payloads);
    await recordSystemRecommendations(data.categories);
  } catch (err) {
    console.error('[DISCORD-ERROR]', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateRecommendations, formatDiscordEmbeds, sendToDiscord, recordSystemRecommendations };
