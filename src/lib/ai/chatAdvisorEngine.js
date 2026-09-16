/**
 * AI Stock Consultation & Advisory Engine
 *
 * Provides deterministic mathematical pre-calculations, ticker extraction,
 * strict grounding anti-hallucination prompt formatting, and multi-turn history trimming.
 */

// Common Indonesian & trading words that must not be falsely treated as 4-letter tickers
const TICKER_STOPWORDS = new Set([
  'BISA', 'KITA', 'DARI', 'YANG', 'PADA', 'SAYA', 'AKAN', 'HOLD', 'SELL',
  'LOSS', 'GAIN', 'CASH', 'DOWN', 'RISK', 'PORT', 'DATA', 'JUAL', 'BELI',
  'TIDAK', 'JIKA', 'MAU', 'LAGI', 'BAGA', 'MANA', 'APAP', 'KALA', 'DULU',
  'NAIK', 'TURU', 'SUDA', 'KEMA', 'HARI', 'ESOK', 'TAHU', 'LEBI', 'BAIK',
  'AREA', 'ZONE', 'TICK', 'BULL', 'BEAR', 'SWIN', 'FAST', 'SLOW', 'CHAT',
  'INFO', 'USER', 'POST', 'OPEN', 'REAL', 'CUAN', 'RUGI', 'ARUS', 'LOTS',
  'ATAU', 'AGAR', 'BIAR', 'KAMI', 'KAMU', 'BAGI', 'LAIN', 'SAMA', 'CARA',
  'SAAT', 'BELU', 'JUGA', 'MASA', 'CEPAT', 'CEK', 'OKE'
]);

/**
 * Extracts 4-character Indonesian stock codes from conversational text
 * @param {string} text
 * @param {Array<string>} [knownTickers] - Optional whitelist from database
 * @returns {Array<string>} Unique list of uppercase tickers
 */
export function extractTickersFromText(text = '', knownTickers = []) {
  if (!text || typeof text !== 'string') return [];

  const found = new Set();
  const knownSet = Array.isArray(knownTickers) && knownTickers.length > 0
    ? new Set(knownTickers.map(t => t.toUpperCase().replace('.JK', '')))
    : null;

  // Regex pattern matching potential 4-letter ticker words
  const matches = text.match(/\b[A-Za-z]{4}\b/g) || [];

  for (const m of matches) {
    const candidate = m.toUpperCase();

    if (TICKER_STOPWORDS.has(candidate)) continue;

    // Special case for 'AUTO' (Astra Otoparts vs adverb "auto")
    if (candidate === 'AUTO') {
      const lowerOriginal = m.toLowerCase();
      const isExplicitTicker = text.toUpperCase().includes('SAHAM AUTO') || text.includes('AUTO');
      if (lowerOriginal === 'auto' && !isExplicitTicker) continue;
    }

    if (knownSet) {
      if (knownSet.has(candidate)) found.add(candidate);
    } else {
      found.add(candidate);
    }
  }

  return Array.from(found);
}

/**
 * Pre-calculates deterministic financial facts for tickers and portfolio items.
 * Math is executed in JavaScript, strictly preventing arithmetic hallucinations by LLM.
 */
export function buildPrecalculatedFinancialContext({
  tickers = [],
  userPortfolios = [],
  stockMap = {}
}) {
  const stockContexts = [];

  for (const ticker of tickers) {
    const s = stockMap[ticker];
    if (!s) continue;

    const price = Number(s.price || 0);
    const changePct = Number(s.changePercent ?? 0);
    const f = s.fundamentals || {};
    const t = s.technicals || {};
    const k = s.kseiLatest || {};

    const roe = Number.isFinite(Number(f.roe)) ? Number(f.roe) : null;
    const per = Number.isFinite(Number(f.per)) ? Number(f.per) : null;
    const pbv = Number.isFinite(Number(f.pbv)) ? Number(f.pbv) : null;
    const der = Number.isFinite(Number(f.der)) ? Number(f.der) : null;
    const divYield = Number.isFinite(Number(f.dividendYield ?? s.dividendYield)) ? Number(f.dividendYield ?? s.dividendYield) : 0;
    const isTrap = Boolean(s.isDividendTrap);

    // KSEI Flow & BFI
    const bfi = Number(k.bfi || 0);
    const smartMoneyStatus = bfi > 0 ? 'Akumulasi Institusi/Bandar' : (bfi < 0 ? 'Distribusi/Tekanan Jual' : 'Netral');

    // Technical Levels (Support & Resistance)
    const support = Number(t.support || Math.round(price * 0.95));
    const resistance = Number(t.resistance || Math.round(price * 1.05));

    // Check if user owns this stock in portfolio
    const userHolding = userPortfolios.find(p => p.ticker.toUpperCase() === ticker);
    let holdingDetail = null;

    if (userHolding && userHolding.averagePrice > 0) {
      const avgPrice = Number(userHolding.averagePrice);
      const totalShares = Number(userHolding.totalShares || 0);
      const totalLots = Math.floor(totalShares / 100);
      const investedVal = Number(userHolding.investedValue || (avgPrice * totalShares));
      const currentVal = price * totalShares;
      const floatingPnLRp = currentVal - investedVal;
      const floatingPnLPct = investedVal > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

      // Pre-calculate Average Down Scenarios
      const simLots50 = 50;
      const newShares50 = totalShares + (simLots50 * 100);
      const newInvested50 = investedVal + (support * simLots50 * 100);
      const newAvg50 = newShares50 > 0 ? Math.round(newInvested50 / newShares50) : avgPrice;
      const breakevenDistancePct50 = price > 0 ? ((newAvg50 - price) / price) * 100 : 0;

      holdingDetail = {
        avgPrice,
        totalLots,
        totalShares,
        investedVal,
        currentVal,
        floatingPnLRp: Math.round(floatingPnLRp),
        floatingPnLPct: Number(floatingPnLPct.toFixed(2)),
        simulations: [
          {
            label: `Beli Tambah +${simLots50} Lot di Support (Rp ${support.toLocaleString('id-ID')})`,
            newAvgPrice: newAvg50,
            breakevenDistancePct: Number(breakevenDistancePct50.toFixed(2))
          }
        ]
      };
    }

    stockContexts.push({
      ticker,
      name: s.name || ticker,
      sector: s.sector || 'Umum',
      price,
      changePct: Number(changePct.toFixed(2)),
      per,
      pbv,
      roe,
      der,
      divYield: Number(divYield.toFixed(2)),
      isDividendTrap: isTrap,
      bfi,
      smartMoneyStatus,
      support,
      resistance,
      holdingDetail
    });
  }

  return stockContexts;
}

/**
 * Builds the strict anti-hallucination system prompt and multi-turn message payload
 */
export function buildAdvisorPromptMessages({
  history = [],
  userMessage = '',
  financialContext = [],
  userPortfolios = [],
  attachPortfolio = false,
  maxHistoryTurns = 6
}) {
  // Format verified data block
  let dataBlock = '### [DATA PASAR TERVERIFIKASI DARI DATABASE IDX]\n';
  if (financialContext.length > 0) {
    for (const item of financialContext) {
      dataBlock += `\nEMITEN: ${item.ticker} (${item.name}) - Sektor: ${item.sector}\n`;
      dataBlock += `- Harga Pasar Saat Ini: Rp ${item.price.toLocaleString('id-ID')} (${item.changePct >= 0 ? '+' : ''}${item.changePct}%)\n`;
      dataBlock += `- Valuasi: PER = ${item.per != null ? item.per + 'x' : 'N/A'}, PBV = ${item.pbv != null ? item.pbv + 'x' : 'N/A'}\n`;
      dataBlock += `- Profitabilitas & Solvabilitas: ROE = ${item.roe != null ? item.roe + '%' : 'N/A'}, DER = ${item.der != null ? item.der + 'x' : 'N/A'}\n`;
      dataBlock += `- Dividen TTM: ${item.divYield}% (Status Trap: ${item.isDividendTrap ? 'BERISIKO JEBAKAN DIVIDEN' : 'Aman'})\n`;
      dataBlock += `- Aliran Bandar/KSEI: ${item.smartMoneyStatus} (BFI: ${item.bfi})\n`;
      dataBlock += `- Level Kunci BEI: Support Kuat = Rp ${item.support.toLocaleString('id-ID')}, Resisten = Rp ${item.resistance.toLocaleString('id-ID')}\n`;

      if (item.holdingDetail) {
        const h = item.holdingDetail;
        dataBlock += `  * KEPEMILIKAN USER DI ${item.ticker}:\n`;
        dataBlock += `    - Rata-rata Beli: Rp ${h.avgPrice.toLocaleString('id-ID')} (${h.totalLots} Lot / ${h.totalShares.toLocaleString('id-ID')} lembar)\n`;
        dataBlock += `    - Posisi PnL: ${h.floatingPnLPct >= 0 ? 'PROFIT +' : 'FLOATING LOSS '}${h.floatingPnLPct}% (Rp ${h.floatingPnLRp.toLocaleString('id-ID')})\n`;
        for (const sim of h.simulations) {
          dataBlock += `    - Simulasi Averaging: ${sim.label} -> Avg Price baru menjadi Rp ${sim.newAvgPrice.toLocaleString('id-ID')} (Jarak ke Breakeven: ${sim.breakevenDistancePct}%)\n`;
        }
      }
    }
  } else {
    dataBlock += 'Tidak ada kode saham spesifik yang terdeteksi di pertanyaan ini.\n';
  }

  // Format full user portfolio if attachment toggle is active
  if (attachPortfolio && Array.isArray(userPortfolios) && userPortfolios.length > 0) {
    dataBlock += '\n### [PORTOFOLIO LENGKAP PENGGUNA SAAT INI]\n';
    userPortfolios.forEach((p, idx) => {
      const shares = Number(p.totalShares || 0);
      const lots = Math.floor(shares / 100);
      dataBlock += `${idx + 1}. ${p.ticker} | Modal: Rp ${Number(p.averagePrice || 0).toLocaleString('id-ID')} | Volume: ${lots} Lot (${shares} lbr)\n`;
    });
  }

  const systemPrompt = `Anda adalah "Senior Equity Analyst & Risk Manager IDX" pada platform analisis pasar modal Indonesia.
Tugas Anda adalah memberikan konsultasi finansial kuantitatif yang objektif, mendalam, taktis, dan mengutamakan perlindungan modal (Capital Preservation).

ATURAN ANTI-HALUSINASI & INTEGRITAS DATA (MANDATORI):
1. Anda HANYA boleh mengutip angka harga, laba, rasio valuasi, level support/resistance, dan posisi PnL dari blok [DATA PASAR TERVERIFIKASI DARI DATABASE IDX].
2. DILARANG KERAS mengarang, menebak, atau mengingat angka masa lalu dari memori pelatihan Anda sendiri.
3. Jangan menghitung matematika kompleks di dalam kepala. Gunakan angka persentase floating loss dan simulasi averaging yang telah dihitung pasti oleh sistem di blok data.
4. Jika suatu metrik bernilai N/A atau saham tidak ditemukan di database, nyatakan secara jujur bahwa data tersebut tidak tersedia di registri BEI terkini.

PROTOKOL PENALARAN (MANDATORI):
Sebelum menyajikan jawaban akhir, lakukan proses pemikiran terstruktur di dalam tag <think>...</think>:
- Audit Fakta: Cocokkan harga pasar saat ini vs modal user.
- Audit Risiko: Identifikasi kesehatan neraca (DER), jebakan dividen, dan status akumulasi/distribusi KSEI.
- Formulasi Strategi: Tentukan aksi nyata (Tahan, Averaging bertahap di Support, atau Cut Loss/Rotasi) beserta alasannya.

GAYA KOMUNIKASI & FORMATTING:
- Bahasa: Bahasa Indonesia profesional, tegas, empatik terhadap kerugian, dan solutif.
- Sajikan poin rekomendasi dalam bentuk bullet points atau tabel simulasi sederhana bila membahas perbandingan saham.
- Berikan disclaimer elegan di akhir: "Catatan: Analisis kuantitatif ini disusun untuk edukasi & pertimbangan risiko, bukan paksaan transaksi."

${dataBlock}`;

  const messages = [{ role: 'system', content: systemPrompt }];

  // Rolling window: trim history to last N messages to fit within context without degradation
  const trimmedHistory = history.slice(-maxHistoryTurns);
  for (const h of trimmedHistory) {
    if (h.role === 'user' || h.role === 'assistant') {
      messages.push({
        role: h.role,
        content: h.content
      });
    }
  }

  // Append latest user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Separates reasoning block (<think>...</think>) from final markdown answer
 * @param {string} rawContent
 * @returns {{ thinking: string | null, content: string }}
 */
export function parseThinkingAndResponse(rawContent = '') {
  if (!rawContent || typeof rawContent !== 'string') {
    return { thinking: null, content: '' };
  }

  let thinking = null;
  let content = rawContent;

  const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    content = rawContent.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
  }

  return { thinking, content };
}
