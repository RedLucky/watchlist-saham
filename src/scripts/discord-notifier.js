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

  // 1. Config for 3 Distinct Horizons
  const scalpStyle = getStyleConfig('scalping');
  const scalpMode = getModeConfig('growth');

  const dailyStyle = getStyleConfig('daily');
  const dailyMode = getModeConfig(detectedMode);

  const swingStyle = getStyleConfig('swing');
  const swingMode = getModeConfig('conservative');

  // 2. Score Provider Stocks for Each Horizon
  const scalpScored = scoreAllStocks(providerStocks, scalpMode.weights, scalpStyle, sectorMap, 'growth');
  const dailyScored = scoreAllStocks(providerStocks, dailyMode.weights, dailyStyle, sectorMap, detectedMode);
  const swingScored = scoreAllStocks(providerStocks, swingMode.weights, swingStyle, sectorMap, 'conservative');

  // Helper to extract top actionable stocks and avoid cross-category duplicate recommendations
  function filterActionableTop(scoredStocks, styleConfig, maxLimit, usedTickers) {
    const output = [];
    const minRR = styleConfig.qualityGate?.minRiskReward ?? 1.2;
    const minTech = styleConfig.qualityGate?.minTechnicalScore ?? 50;

    for (const s of scoredStocks) {
      if (usedTickers.has(s.ticker)) continue;

      const tradeSetup = calculateTradeSetup(s.rawData, s.subScores.technical, styleConfig);
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

      output.push({
        ticker: s.ticker,
        name: s.name,
        price: s.price,
        score: s.score,
        entry: tradeSetup.entry,
        target: tradeSetup.target,
        stopLoss: tradeSetup.stopLoss,
        riskReward: tradeSetup.riskReward,
        setup: tradeSetup.setup,
        badge,
        smartMoneyBadge
      });

      if (output.length >= maxLimit) break;
    }
    return output;
  }

  const used = new Set();

  // Tier 1: Beli Pagi Jual Sore (Scalping) — Top 3
  const scalps = filterActionableTop(scalpScored, scalpStyle, 3, used);
  scalps.forEach(s => used.add(s.ticker));

  // Tier 2: Hold 2 - 3 Hari (Daily) — Top 3
  const dailies = filterActionableTop(dailyScored, dailyStyle, 3, used);
  dailies.forEach(s => used.add(s.ticker));

  // Tier 3: Hold 1 - 3 Minggu (Swing) — Top 3
  const swings = filterActionableTop(swingScored, swingStyle, 3, used);

  const categories = [
    {
      id: 'scalping',
      title: '⚡ 1. BELI PAGI - JUAL SORE (One Day Trade / Scalping)',
      subtitle: 'Target: +1.5% s/d +2.5% | Stop Loss: -1.0% | Sifat: Keluar sebelum tutup bursa hari ini',
      color: 0xf43f5e, // Rose / Red
      stocks: scalps
    },
    {
      id: 'daily',
      title: '📊 2. HOLD 2 s/d 3 HARI KEDEPAN (Fast Swing / Daily)',
      subtitle: 'Target: +4.0% s/d +5.5% | Stop Loss: -2.5% | Sifat: T+1 s/d T+3',
      color: 0x3b82f6, // Blue
      stocks: dailies
    },
    {
      id: 'swing',
      title: '📈 3. HOLD 1 s/d 3 MINGGU (Position / Swing Trading)',
      subtitle: 'Target: +8.0% s/d +12.0% | Stop Loss: -4.0% | Sifat: Trend Following aman',
      color: 0x10b981, // Emerald Green
      stocks: swings
    }
  ];

  return { marketData, detectedMode, categories };
}

function formatDiscordEmbeds(data) {
  const { marketData, detectedMode, categories } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  const embeds = [];

  // 1. Overview Header Embed
  const ihsgChange = Number(marketData?.indexChange || 0);
  const ihsgSign = ihsgChange >= 0 ? '+' : '';
  embeds.push({
    title: `📋 WATCHLIST EKSEKUSI SAHAM IDX (${dateStr})`,
    description: `Watchlist harian presisi dikurasi berdasarkan horizon trading: **Beli Pagi Jual Sore**, **Hold 2-3 Hari**, dan **Hold 1-3 Minggu**.\n\n` +
      `🏛️ **Kondisi Pasar**: IHSG **${Number(marketData?.indexValue || 7200).toLocaleString('id-ID')}** (${ihsgSign}${ihsgChange.toFixed(2)}%) • Mode: **${(detectedMode || 'Balanced').toUpperCase()}**`,
    color: 0x6366f1, // Indigo
  });

  // 2. Category Embeds
  for (const cat of categories) {
    if (cat.stocks.length === 0) {
      embeds.push({
        title: cat.title,
        description: `*${cat.subtitle}*\n\n*(Tidak ada saham yang memenuhi kriteria risk-reward ketat pada horizon ini hari ini)*`,
        color: cat.color
      });
      continue;
    }

    const lines = cat.stocks.map((s, idx) => {
      const entryRange = `Rp ${s.entry.low.toLocaleString('id-ID')} - ${s.entry.high.toLocaleString('id-ID')}`;
      return `**${idx + 1}. ${s.ticker}** (Rp ${s.price.toLocaleString('id-ID')}):\n` +
        `   • Area Beli: **${entryRange}**\n` +
        `   • Target TP: **Rp ${s.target.toLocaleString('id-ID')}** | Cut Loss (SL): **Rp ${s.stopLoss.toLocaleString('id-ID')}**\n` +
        `   • Sinyal: [**${s.badge}**] • Setup: *${s.setup}* • Skor: **${s.score}**${s.smartMoneyBadge}`;
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
    footer: { text: 'Watchlist Saham • Automated Advisor' },
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

async function main() {
  console.log('=== MEMULAI GENERASI REKOMENDASI SAHAM UNTUK DISCORD ===');
  try {
    const data = await generateRecommendations();
    const totalStocks = data.categories.reduce((acc, c) => acc + c.stocks.length, 0);
    console.log(`Ditemukan total ${totalStocks} saham rekomendasi dari 3 horizon waktu.`);
    const payloads = formatDiscordEmbeds(data);
    await sendToDiscord(payloads);
  } catch (err) {
    console.error('[DISCORD-ERROR]', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateRecommendations, formatDiscordEmbeds, sendToDiscord };
