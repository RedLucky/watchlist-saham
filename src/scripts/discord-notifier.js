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
  const modes = ['balanced', 'growth', 'conservative', 'defensive'];
  const styles = ['daily', 'swing'];

  const results = [];

  for (const mName of modes) {
    for (const sName of styles) {
      const modeConfig = getModeConfig(mName);
      const styleConfig = getStyleConfig(sName);
      const scoredStocks = scoreAllStocks(providerStocks, modeConfig.weights, styleConfig, sectorMap, modeConfig.name);
      const passedByScore = scoredStocks.filter(s => s.score >= modeConfig.threshold);

      const candidates = passedByScore.map(s => {
        const tradeSetup = calculateTradeSetup(s.rawData, s.subScores.technical, styleConfig);

        // Supertrend & DEMA Calculation
        const rawTech = s.rawData?.technicals || {};
        const prices = Array.isArray(rawTech.prices) && rawTech.prices.length > 0 ? rawTech.prices : [s.price];
        const highs = Array.isArray(rawTech.highs) && rawTech.highs.length > 0 ? rawTech.highs : prices;
        const lows = Array.isArray(rawTech.lows) && rawTech.lows.length > 0 ? rawTech.lows : prices;
        
        const candleData = prices.map((p, idx) => ({
          high: highs[idx] ?? p,
          low: lows[idx] ?? p,
          close: p
        }));

        const dema20 = calculateDEMA(prices, 20);
        const supertrend = calculateSupertrend(candleData, 10, 3.0);

        const isBullSuper = supertrend.trend === 'bullish';
        const isAboveDema = s.price >= dema20;

        let stBadge = '⚪ WAIT';
        if (isBullSuper && isAboveDema) {
          stBadge = supertrend.isReversal ? '🚀 S.BUY' : '🟢 BUY';
        } else if (!isBullSuper && !isAboveDema) {
          stBadge = '🔴 SELL';
        } else if (isBullSuper && !isAboveDema) {
          stBadge = '🟡 PULLBACK';
        } else if (!isBullSuper && isAboveDema) {
          stBadge = '🔵 TEST BO';
        }

        return {
          ticker: s.ticker,
          name: s.name,
          score: s.score,
          price: s.price,
          entry: tradeSetup.entry,
          target: tradeSetup.target,
          stopLoss: tradeSetup.stopLoss,
          riskReward: tradeSetup.riskReward,
          setup: tradeSetup.setup,
          stBadge,
          dema20: Math.round(dema20),
          supertrendValue: Math.round(supertrend.value),
          kseiLatest: s.rawData?.kseiLatest
        };
      });

      const qualityGate = styleConfig.qualityGate || {};
      const minRiskReward = qualityGate.minRiskReward ?? 1.2;

      const passedQuality = candidates.filter(st => {
        const actionable = String(st.setup || '').toLowerCase() !== 'none';
        return st.riskReward >= minRiskReward && actionable;
      }).slice(0, modeConfig.maxStocks);

      // Hanya simpan jika ada isinya!
      if (passedQuality.length > 0) {
        results.push({
          modeName: modeConfig.name,
          modeLabel: modeConfig.label,
          modeEmoji: modeConfig.emoji,
          styleName: styleConfig.name,
          styleLabel: styleConfig.label,
          styleEmoji: styleConfig.emoji,
          stocks: passedQuality
        });
      }
    }
  }

  return { marketData, results };
}

function formatDiscordEmbeds(results, marketData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  if (results.length === 0) {
    return [
      {
        embeds: [
          {
            title: `📋 WATCHLIST SAHAM IDX UNTUK BESOK (${dateStr})`,
            description: `*Kondisi pasar saat ini defensif / konsolidasi. Tidak ada saham yang memenuhi ambang batas kualitas & risk-to-reward hari ini.*`,
            color: 0xf59e0b,
            footer: { text: 'Watchlist Saham • Automated Advisor' },
            timestamp: now.toISOString()
          }
        ]
      }
    ];
  }

  const colorMap = {
    balanced: 0x3b82f6, // blue
    growth: 0x10b981,   // green
    conservative: 0x6366f1, // indigo
    defensive: 0xf59e0b, // amber
  };

  const embeds = [];

  // 1. Overview Header Embed
  embeds.push({
    title: `📋 WATCHLIST & REKOMENDASI SAHAM IDX (${dateStr})`,
    description: `Daftar pantauan saham potensial (*watchlist*) untuk perdagangan esok hari, dikurasi otomatis dari berbagai mode strategi berdasarkan integrasi data Fundamental, Analisis Teknikal, Supertrend + DEMA (20), dan Smart Money Flow (KSEI/IDX).`,
    color: 0x6366f1,
    fields: [
      {
        name: '📌 Petunjuk Pembacaan Watchlist',
        value: '• **Sinyal ST+DEMA**: [🟢 BUY / 🚀 S.BUY / 🟡 PULLBACK / 🔴 SELL] Konfirmasi tren Supertrend & DEMA 20.\n• **Area Beli (Buy)**: Area harga entry optimal.\n• **TP / SL**: Target Take Profit & Batas Stop Loss disiplin.\n• **Skor & Smart Money**: Kekuatan komposit & indikasi pergerakan bandar (`🟢 Akumulasi` / `🔴 Distribusi`).',
        inline: false
      }
    ]
  });

  // 2. Mode Strategy Embeds
  for (const group of results) {
    let lines = [];
    for (const s of group.stocks) {
      let smartMoneyBadge = '';
      if (s.kseiLatest) {
        if (s.kseiLatest.deltaSmartMoney > 0) smartMoneyBadge = ' 🟢 Akumulasi';
        else if (s.kseiLatest.deltaSmartMoney < 0) smartMoneyBadge = ' 🔴 Distribusi';
      }

      lines.push(`• **${s.ticker}**: [**${s.stBadge}**] Buy: **Rp ${s.entry.low.toLocaleString('id-ID')} - ${s.entry.high.toLocaleString('id-ID')}** | TP: **Rp ${s.target.toLocaleString('id-ID')}** | SL: **Rp ${s.stopLoss.toLocaleString('id-ID')}** | Skor: **${s.score}** (*${s.setup}*)${smartMoneyBadge}`);
    }

    // Split into chunks if exceeds 1000 characters
    const fieldChunks = [];
    let currentChunk = '';
    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > 1000) {
        fieldChunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    if (currentChunk) fieldChunks.push(currentChunk);

    const fields = fieldChunks.map((chunk, idx) => ({
      name: idx === 0 ? `${group.modeEmoji} [${group.modeLabel.toUpperCase()}] ${group.styleEmoji} ${group.styleLabel}` : `(Lanjutan)`,
      value: chunk,
      inline: false
    }));

    embeds.push({
      title: `${group.modeEmoji} Watchlist Mode ${group.modeLabel} — ${group.styleLabel}`,
      color: colorMap[group.modeName] || 0x3b82f6,
      fields: fields,
    });
  }

  // 3. Disclaimer & Risk Notice Embed at the end
  embeds.push({
    title: `⚠️ PERINGATAN RISIKO & DISCLAIMER PENTING`,
    description: `• **Bukan Ajakan Beli / Jual**: Daftar pantauan (*watchlist*) ini merupakan hasil komputasi algoritma sistem dan **BUKAN merupakan rekomendasi, anjuran, atau ajakan mutlak untuk melakukan pembelian maupun penjualan saham tertentu**.\n• **Do Your Own Research (DYOR)**: Harap selalu lakukan analisis mandiri dan sesuaikan dengan profil risiko, rencana trading (*trading plan*), serta horizon investasi masing-masing.\n• **Money Management**: Disiplin menerapkan manajemen modal yang terukur, rasio risiko-imbal hasil yang sehat, serta batasan *Stop Loss* untuk proteksi modal.\n• **Tanggung Jawab Pribadi**: Segala keputusan eksekusi, potensi keuntungan, maupun risiko kerugian finansial sepenuhnya merupakan tanggung jawab pribadi masing-masing investor/trader.`,
    color: 0xe11d48, // rose / red
    footer: {
      text: 'Watchlist Saham • Sistem Rekomendasi & Watchlist Otomatis'
    },
    timestamp: now.toISOString()
  });

  // Discord allows up to 10 embeds per webhook message
  const payloads = [];
  const maxEmbedsPerMsg = 4;
  for (let i = 0; i < embeds.length; i += maxEmbedsPerMsg) {
    const chunkEmbeds = embeds.slice(i, i + maxEmbedsPerMsg);
    payloads.push({
      embeds: chunkEmbeds
    });
  }

  return payloads;
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
    const { results, marketData } = await generateRecommendations();
    console.log(`Ditemukan ${results.length} grup rekomendasi yang memiliki saham aktif.`);
    const payloads = formatDiscordEmbeds(results, marketData);
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
