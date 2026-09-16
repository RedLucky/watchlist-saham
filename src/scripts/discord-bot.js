require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { fetchAiCompletion } = require('../lib/ai/client.js');
const { buildResearchPrompt } = require('../lib/ai/prompter.js');
const { fetchLatestStockNews } = require('../lib/ai/search.js');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || null;
const CACHE_VALIDITY_DAYS = 30; // Batas usia riset valid (1 bulan)

// Daftar kata umum bahasa Indonesia (4 huruf) agar tidak salah dikenali sebagai ticker
const STOP_WORDS = new Set([
  'YANG', 'DONG', 'TOLONG', 'CEK', 'SAAT', 'BISA', 'LAGI', 'PADA', 'DARI',
  'AKAN', 'KITA', 'KAMU', 'SAYA', 'HALO', 'INFO', 'POST', 'USER', 'DATA',
  'TENTANG', 'APAKAH', 'HARI', 'BAGI', 'LALU', 'SIAP', 'MAU', 'JIKA',
  'KOK', 'APA', 'JADI', 'BIAR', 'IKUT', 'BUAT', 'JUGA', 'KALI', 'SAMA'
]);

function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('id-ID');
}

function parseJson(str) {
  if (!str) return {};
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
}

// Parsing kesimpulan rekomendasi AI dengan toleransi format markdown
function parseBuyHoldSell(content) {
  if (!content) return 'HOLD';
  const cleanUpper = content.toUpperCase().replace(/[*_#[\]()]/g, ' ');
  const match = cleanUpper.match(/(?:KESIMPULAN|REKOMENDASI|VERDICT|RECOMMENDATION)\s*:\s*(BELI|BUY|JUAL|SELL|HOLD|TAHAN)/i);
  if (match) {
    const v = match[1].trim();
    if (v === 'BELI' || v === 'BUY') return 'BELI';
    if (v === 'JUAL' || v === 'SELL') return 'JUAL';
    return 'HOLD';
  }
  const tail = cleanUpper.slice(-400);
  if (tail.includes('BELI') || tail.includes(' BUY ')) return 'BELI';
  if (tail.includes('JUAL') || tail.includes(' SELL ')) return 'JUAL';
  return 'HOLD';
}

// Ekstraksi skor kuantitatif AI (0-100)
function parseAiScore(content, fallbackVerdict) {
  if (!content) return 50;
  const match = content.match(/(?:SKOR AI|AI SCORE|SKOR KUANTITATIF)\s*:\s*(\d{1,3})/i);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }
  if (fallbackVerdict === 'BELI') return 75;
  if (fallbackVerdict === 'JUAL') return 25;
  return 50;
}

// Ekstraksi alasan singkat dari teks respon AI
function extractReason(content) {
  if (!content) return 'Analisis berbasis fundamental dan teknikal historis.';
  const match = content.match(/(?:ALASAN SINGKAT|RINGKASAN|SUMMARY)\s*:\s*([^\n\r#]+)/i);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  const kesimpulanIdx = content.indexOf('## 4. Rekomendasi Akhir');
  if (kesimpulanIdx !== -1) {
    const text = content.slice(kesimpulanIdx).replace(/##[^\n]+\n/g, '').trim();
    return text.slice(0, 250);
  }
  return content.slice(0, 200).replace(/##[^\n]+\n/g, '').trim() + '...';
}

// Ekstrak ticker saham dari teks pesan bebas
async function extractTickerAndIntent(text) {
  const clean = text.toUpperCase();
  const forceRefresh = clean.includes('ULANG') || clean.includes('UPDATE') || clean.includes('REFRESH') || clean.includes('BARU') || clean.includes('FORCE');

  // Ambil semua token kata 4 huruf
  const words = clean.match(/\b[A-Z]{4}\b/g) || [];
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;

    // Cek apakah ada di database saham IDX
    const stock = await prisma.stockData.findUnique({
      where: { ticker: word }
    });

    if (stock) {
      return { ticker: word, stock, forceRefresh };
    }
  }

  return null;
}

// Format Discord Embed visual
function buildDiscordEmbed(stock, research, isCached, daysAgo, durationSec = null) {
  const f = parseJson(stock.fundamentals);
  const verdict = (research.buyHoldSell || 'HOLD').toUpperCase();
  const score = research.score ?? 50;

  // Tentukan warna embed berbasis kesimpulan
  let embedColor = 0xF59E0B; // Kuning (HOLD)
  if (verdict === 'BELI') embedColor = 0x10B981; // Hijau (BELI)
  if (verdict === 'JUAL') embedColor = 0xEF4444; // Merah (JUAL)

  const changePct = stock.changePercent ? Number(stock.changePercent) : 0;
  const changeSign = changePct > 0 ? '+' : '';
  const priceDisplay = `Rp ${formatRupiah(stock.price)} (${changeSign}${changePct.toFixed(2)}%)`;

  const per = f.per ? `${Number(f.per).toFixed(2)}x` : '-';
  const pbv = f.pbv ? `${Number(f.pbv).toFixed(2)}x` : '-';
  const roe = f.roe ? `${Number(f.roe).toFixed(2)}%` : '-';
  const der = f.der ? `${Number(f.der).toFixed(2)}` : '-';

  const reasonText = extractReason(research.content);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${stock.ticker} — ${stock.name}`)
    .setColor(embedColor)
    .addFields(
      { name: '💰 Harga Terkini', value: priceDisplay, inline: true },
      { name: '🎯 Rekomendasi AI', value: `**${verdict}** (Skor: ${score}/100)`, inline: true },
      { name: '📊 Sektor', value: stock.sector || '-', inline: true },
      { name: '📈 Rasio Finansial Utama', value: `• **PER**: ${per} | **PBV**: ${pbv}\n• **ROE**: ${roe} | **DER**: ${der}`, inline: false },
      { name: '📝 Ringkasan Analisis AI', value: reasonText.length > 500 ? reasonText.slice(0, 497) + '...' : reasonText, inline: false }
    )
    .setTimestamp(new Date(research.createdAt || Date.now()));

  if (isCached) {
    const timeLabel = daysAgo === 0 ? 'hari ini' : `${daysAgo} hari yang lalu`;
    embed.setFooter({
      text: `⚡ Menggunakan data riset valid (${timeLabel}). Ketik "analisa ulang ${stock.ticker}" untuk memperbarui.`
    });
  } else {
    const durLabel = durationSec ? ` dalam ${durationSec}s` : '';
    embed.setFooter({
      text: `🤖 Riset AI Baru via Llama.cpp Qwen${durLabel}. Data tersimpan ke database.`
    });
  }

  return embed;
}

// Inisialisasi Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`[Discord-Bot] Siap dan online sebagai ${client.user.tag}!`);
  client.user.setActivity('Pasar Saham IDX | Tanya saham...', { type: 3 }); // Watching
});

client.on('messageCreate', async (message) => {
  // Abaikan pesan dari sesama bot
  if (message.author.bot) return;

  console.log(`[Discord-Bot] Pesan diterima di #${message.channel.name || message.channelId} (${message.channelId}): "${message.content}" dari ${message.author.username}`);

  // Filter channel jika ditentukan di .env
  if (DISCORD_CHANNEL_ID && message.channelId !== DISCORD_CHANNEL_ID) {
    console.log(`[Discord-Bot] Pesan diabaikan karena DISCORD_CHANNEL_ID disetel ke ${DISCORD_CHANNEL_ID}`);
    return;
  }

  // Cek apakah pesan berkaitan dengan saham
  const content = message.content.trim();
  const detection = await extractTickerAndIntent(content);
  if (!detection) {
    console.log(`[Discord-Bot] Tidak ada ticker saham IDX yang terdeteksi pada pesan.`);
    return;
  }

  const { ticker, stock, forceRefresh } = detection;
  console.log(`[Discord-Bot] Pertanyaan terdeteksi untuk ${ticker} dari ${message.author.username}. Force: ${forceRefresh}`);

  try {
    // 1. Cek Caching 30 Hari (1 Bulan) di AiStockResearch
    const thirtyDaysAgo = new Date(Date.now() - (CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000));
    const existingResearch = await prisma.aiStockResearch.findFirst({
      where: {
        ticker,
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Skenario A: Data masih valid (< 30 hari) dan tidak dipaksa analisa ulang
    if (existingResearch && !forceRefresh) {
      const daysAgo = Math.floor((Date.now() - existingResearch.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[Discord-Bot] Menggunakan riset valid untuk ${ticker} (${daysAgo} hari lalu).`);

      const embed = buildDiscordEmbed(stock, existingResearch, true, daysAgo);
      await message.reply({ embeds: [embed] });
      return;
    }

    // Skenario B: Belum ada riset terkini ATAU pengguna minta "analisa ulang"
    console.log(`[Discord-Bot] Menjalankan pipeline riset AI baru untuk ${ticker}...`);
    const statusMessage = await message.reply({
      content: `⏳ Sedang memeriksa harga **${ticker}** (${stock.name}) dan meracik riset AI komprehensif di background...\n*Mohon tunggu ~1-2 menit untuk inferensi AI dan berita terkini.*`
    });

    const startTime = Date.now();

    // 1. Ambil berita & sentimen internet terkini
    let newsContext = '';
    try {
      newsContext = await fetchLatestStockNews(ticker, stock.name);
    } catch (e) {
      console.warn(`[Discord-Bot] Gagal mengambil berita untuk ${ticker}:`, e.message);
    }

    // 2. Rakit Super Prompt Komprehensif
    const promptText = buildResearchPrompt(stock, newsContext);
    const messages = [
      { role: 'system', content: 'You are a Senior Quantitative Equity Analyst and Institutional Value Investor specializing in Indonesian stocks (IDX/BEI).' },
      { role: 'user', content: promptText }
    ];

    // 3. Panggil Local LLM Llama.cpp
    const aiResult = await fetchAiCompletion(messages);
    const responseContent = aiResult.content;
    const modelName = aiResult.modelName || 'Qwen3.8-4B-Q4_K_M.gguf';
    const latencyMs = Date.now() - startTime;
    const durationSec = Number((latencyMs / 1000).toFixed(2));
    const completionTokens = aiResult.usage?.completionTokens || null;
    const tokensPerSec = aiResult.serverTps || (durationSec > 0 && completionTokens ? Number((completionTokens / durationSec).toFixed(2)) : null);

    // 4. Parse hasil
    const buyHoldSell = parseBuyHoldSell(responseContent);
    const score = parseAiScore(responseContent, buyHoldSell);

    // 5. Simpan ke database AiStockResearch & AiAuditLog
    const savedResearch = await prisma.aiStockResearch.create({
      data: {
        ticker,
        content: responseContent,
        buyHoldSell,
        score
      }
    });

    await prisma.aiAuditLog.create({
      data: {
        ticker,
        event: 'DISCORD_QUERY',
        modelName,
        promptTokens: aiResult.usage?.promptTokens || null,
        completionTokens,
        totalTokens: aiResult.usage?.totalTokens || null,
        latencyMs,
        durationSec,
        tokensPerSec,
        prompt: promptText,
        response: responseContent
      }
    });

    // 6. Edit balasan sementara dengan Rich Embed hasil riset lengkap
    const embed = buildDiscordEmbed(stock, savedResearch, false, 0, durationSec);
    await statusMessage.edit({
      content: null,
      embeds: [embed]
    });

    console.log(`[Discord-Bot] Berhasil membalas riset baru untuk ${ticker} (${durationSec}s)`);

  } catch (error) {
    console.error(`[Discord-Bot] Error memproses ${ticker}:`, error);
    await message.reply({
      content: `❌ Maaf, terjadi kesalahan saat memproses riset AI untuk **${ticker}**: ${error.message}`
    });
  }
});

// Jalankan bot jika file dieksekusi langsung
if (require.main === module) {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[Discord-Bot] Peringatan: DISCORD_BOT_TOKEN belum dikonfigurasi di .env!');
    console.log('[Discord-Bot] Silakan isi DISCORD_BOT_TOKEN di .env untuk mengaktifkan bot.');
  } else {
    client.login(DISCORD_BOT_TOKEN).catch(err => {
      console.error('[Discord-Bot] Gagal login ke Discord:', err.message);
    });
  }
}

module.exports = {
  extractTickerAndIntent,
  parseBuyHoldSell,
  parseAiScore,
  extractReason,
  buildDiscordEmbed,
  STOP_WORDS
};
