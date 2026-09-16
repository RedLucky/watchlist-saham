const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { fetchAiCompletion } = require('../lib/ai/client.js');
const { buildResearchPrompt } = require('../lib/ai/prompter.js');
const { fetchLatestStockNews } = require('../lib/ai/search.js');

const POLL_INTERVAL = 3000; // 3 detik (responsif terhadap antrian baru)
const STALE_JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit batas toleransi task PROCESSING

// Ambil isi satu section jawaban AI berdasarkan nomor section (e.g. 2 untuk Valuasi, 3 untuk Tren)
// Menggunakan regex fleksibel yang tahan terhadap variasi format markdown (## 2., ## 2:, ## 2, ### 2.)
function extractSection(responseContent, sectionNum) {
  if (!responseContent || !sectionNum) return null;
  const regex = new RegExp(`(?:^|\\n)#{2,3}\\s*${sectionNum}[.:\\s][\\s\\S]*?(?=(?:\\n#{2,3}\\s*\\d|$))`, 'i');
  const match = responseContent.match(regex);
  return match ? match[0].trim() : null;
}

// Parsing kesimpulan rekomendasi AI dengan toleransi format markdown (*, _, [])
function parseBuyHoldSell(content) {
  if (!content) return 'HOLD';

  const upper = content.toUpperCase();
  // Hilangkan karakter formatting markdown (*, _, #, [], ())
  const cleanUpper = upper.replace(/[*_#[\]()]/g, ' ');

  // Cari pola "KESIMPULAN: BELI", "REKOMENDASI: BUY", dll
  const match = cleanUpper.match(/(?:KESIMPULAN|REKOMENDASI|VERDICT|RECOMMENDATION)\s*:\s*(BELI|BUY|JUAL|SELL|HOLD|TAHAN)/i);
  if (match) {
    const verdict = match[1].trim();
    if (verdict === 'BELI' || verdict === 'BUY') return 'BELI';
    if (verdict === 'JUAL' || verdict === 'SELL') return 'JUAL';
    return 'HOLD';
  }

  // Fallback: periksa 400 karakter terakhir
  const tail = cleanUpper.slice(-400);
  if (tail.includes('BELI') || tail.includes(' BUY ')) return 'BELI';
  if (tail.includes('JUAL') || tail.includes(' SELL ')) return 'JUAL';

  return 'HOLD';
}

// Parsing skor kuantitatif AI (0 - 100)
function parseAiScore(content, buyHoldSell) {
  if (!content) return 50;

  const clean = content.replace(/[*_#[\]()]/g, ' ');
  const match = clean.match(/(?:SKOR|SCORE|NILAI)\s*(?:AI)?\s*:\s*(\d{1,3})/i);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      return val;
    }
  }

  // Fallback berdasarkan kesimpulan jika AI tidak menulis angka spesifik
  if (buyHoldSell === 'BELI' || buyHoldSell === 'BUY') return 85;
  if (buyHoldSell === 'JUAL' || buyHoldSell === 'SELL') return 30;
  return 50;
}

async function sendDiscordNotification(ticker, conclusion) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    content: `🤖 **AI Research Selesai: ${ticker}**\n\nKesimpulan: **${conclusion}**\nCek Stock Explorer untuk membaca hasil riset mendalam.`
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error(`Gagal mengirim notifikasi discord untuk ${ticker}:`, error);
  }
}

async function processQueue() {
  try {
    // 0. Auto-Recovery: Pulihkan task yang macet di PROCESSING (> 10 menit) akibat worker crash
    const staleCutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
    const staleTasks = await prisma.aiResearchQueue.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: staleCutoff }
      }
    });

    for (const stale of staleTasks) {
      console.warn(`[AI-Worker] Mendeteksi task macet untuk ${stale.ticker} (id: ${stale.id}). Mereset ke FAILED agar dapat diproses ulang.`);
      await prisma.aiResearchQueue.update({
        where: { id: stale.id },
        data: {
          status: 'FAILED',
          error: 'Task timed out in PROCESSING state (worker crash / timeout recovery)',
          updatedAt: new Date()
        }
      });
    }

    // Cari 1 antrian yang PENDING
    const task = await prisma.aiResearchQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    if (!task) return; // Tidak ada tugas

    console.log(`[AI-Worker] Memproses antrian: ${task.ticker}`);

    // Tandai sebagai PROCESSING
    await prisma.aiResearchQueue.update({
      where: { id: task.id },
      data: { status: 'PROCESSING', updatedAt: new Date() }
    });

    const startTime = Date.now();

    try {
      // Ambil data saham
      const stockData = await prisma.stockData.findUnique({
        where: { ticker: task.ticker }
      });

      if (!stockData) throw new Error('Stock data not found in DB');

      // 1. Ambil berita & riset internet terbaru
      console.log(`[AI-Worker] Mengambil berita internet terkini untuk ${task.ticker}...`);
      let searchContext = '';
      try {
        searchContext = await fetchLatestStockNews(task.ticker, stockData.name);
        console.log(`[AI-Worker] Konteks berita internet berhasil dimuat untuk ${task.ticker}`);
      } catch (newsErr) {
        console.warn(`[AI-Worker] Peringatan: gagal memuat berita untuk ${task.ticker}:`, newsErr.message);
      }

      // 2. Rakit Super Prompt Komprehensif
      const promptText = buildResearchPrompt(stockData, searchContext);
      
      const messages = [
        { role: 'system', content: 'You are a Senior Quantitative Equity Analyst and Institutional Value Investor specializing in Indonesian stocks (IDX/BEI).' },
        { role: 'user', content: promptText }
      ];

      // 2. Panggil API AI (Llama.cpp Docker)
      console.log(`[AI-Worker] Mengirim prompt ke Llama.cpp untuk ${task.ticker}...`);
      const aiResult = await fetchAiCompletion(messages);
      const responseContent = aiResult.content;
      const modelName = aiResult.modelName;
      const promptTokens = aiResult.usage?.promptTokens || null;
      const completionTokens = aiResult.usage?.completionTokens || null;
      const totalTokens = aiResult.usage?.totalTokens || null;
      
      const latencyMs = Date.now() - startTime;
      const durationSec = Number((latencyMs / 1000).toFixed(2));
      const tokensPerSec = aiResult.serverTps || (durationSec > 0 && completionTokens ? Number((completionTokens / durationSec).toFixed(2)) : null);
      console.log(`[AI-Worker] Respons diterima untuk ${task.ticker} dalam ${latencyMs}ms (${durationSec}s, ${tokensPerSec || 0} tps). Model: ${modelName}, Tokens: ${promptTokens} in / ${completionTokens} out`);

      // 3. Parsing kesimpulan (BELI/JUAL/HOLD) dan skor kuantitatif AI
      const buyHoldSell = parseBuyHoldSell(responseContent);
      const score = parseAiScore(responseContent, buyHoldSell);

      // 4. Simpan hasil (content penuh + section valuasi & tren terpisah + skor)
      await prisma.aiStockResearch.create({
        data: {
          ticker: task.ticker,
          content: responseContent,
          buyHoldSell,
          score,
          valuation: extractSection(responseContent, 2),
          trend: extractSection(responseContent, 3)
        }
      });

      // 5. Audit Log (Sukses - mencatat model, token input/output, durasi, dan TPS)
      await prisma.aiAuditLog.create({
        data: {
          ticker: task.ticker,
          event: 'SUCCESS',
          modelName,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          durationSec,
          tokensPerSec,
          prompt: promptText,
          response: responseContent
        }
      });

      // 6. Update Queue
      await prisma.aiResearchQueue.update({
        where: { id: task.id },
        data: { status: 'COMPLETED', updatedAt: new Date() }
      });

      // 7. Notifikasi Discord
      await sendDiscordNotification(task.ticker, buyHoldSell);

    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const durationSec = Number((latencyMs / 1000).toFixed(2));
      console.error(`[AI-Worker] Error saat memproses ${task.ticker}:`, err.message);
      
      // Update Queue
      await prisma.aiResearchQueue.update({
        where: { id: task.id },
        data: { status: 'FAILED', error: err.message, updatedAt: new Date() }
      });

      // Audit Log (Gagal)
      await prisma.aiAuditLog.create({
        data: {
          ticker: task.ticker,
          event: 'FAILED',
          modelName: process.env.AI_MODEL_NAME || 'local-model',
          latencyMs,
          durationSec,
          error: err.stack
        }
      });
    }

  } catch (error) {
    console.error('[AI-Worker] Error utama pada poller:', error);
  }
}

// Polling loop
console.log(`[AI-Worker] Mulai berjalan, polling interval: ${POLL_INTERVAL}ms`);
setInterval(processQueue, POLL_INTERVAL);
// Panggil pertama kali langsung
processQueue();

