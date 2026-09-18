/**
 * Utility to assemble the Comprehensive AI Equity Research Prompt.
 * All prompt instructions are written in English to maximize LLM instruction-following precision,
 * while strictly directing the model to generate the final analytical report in Bahasa Indonesia.
 */

function safeParseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('id-ID');
}

function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toFixed(2) + '%';
}

const { matchAlphaLegendSector } = require('./sectorIntelligence.js');

/**
 * Detects the specific industry sector framework across all 35 Alpha Legend sectors
 * and returns tailored analytical rubrics, industry KPIs, and macro-relational models.
 */
function detectSectorFramework(sector = '', subSector = '', companyName = '') {
  return matchAlphaLegendSector(sector, subSector, companyName);
}

function buildResearchPrompt(stockData, searchContext = "") {
  const f = safeParseJson(stockData.fundamentals) || {};
  const t = safeParseJson(stockData.technicals) || {};

  // Formatted Fundamental Metrics
  const roe = formatPercent(f.roe);
  const roa = formatPercent(f.roa);
  const opm = formatPercent(f.opm);
  const npm = formatPercent(f.npm);
  const gpm = formatPercent(f.gpm);
  const der = f.der !== null && f.der !== undefined ? `${Number(f.der).toFixed(2)}x` : 'Data unavailable';
  const eps = f.eps !== null && f.eps !== undefined ? `Rp ${formatRupiah(f.eps)}` : '-';
  const per = f.per !== null && f.per !== undefined ? `${Number(f.per).toFixed(2)}x` : '-';
  const pbv = f.pbv !== null && f.pbv !== undefined ? `${Number(f.pbv).toFixed(2)}x` : '-';
  const peg = f.pegRatio !== null && f.pegRatio !== undefined ? Number(f.pegRatio).toFixed(2) : '-';
  const divYield = formatPercent(f.dividendYield);
  const cr = f.currentRatio !== null && f.currentRatio !== undefined ? `${Number(f.currentRatio).toFixed(2)}x` : '-';
  const revGrowth = formatPercent(f.revenueGrowth);
  const fcf = f.freeCashflow !== null && f.freeCashflow !== undefined ? `Rp ${formatRupiah(f.freeCashflow)}` : '-';

  // Formatted Technical Metrics
  const rsi = t.rsi !== null && t.rsi !== undefined ? Number(t.rsi).toFixed(1) : '-';
  const macdHist = t.macdHistogram !== null && t.macdHistogram !== undefined ? Number(t.macdHistogram).toFixed(2) : '-';
  const ma20 = t.ma20 ? `Rp ${formatRupiah(t.ma20)}` : '-';
  const ma50 = t.ma50 ? `Rp ${formatRupiah(t.ma50)}` : '-';
  const high52 = t.high52w ? `Rp ${formatRupiah(t.high52w)}` : '-';
  const low52 = t.low52w ? `Rp ${formatRupiah(t.low52w)}` : '-';

  // Sector framework detection
  const sectorFramework = detectSectorFramework(stockData.sector, stockData.subSector, stockData.name);

  return `You are a Senior Quantitative Equity Research Analyst and Institutional Value Investor specializing in the Indonesia Stock Exchange (IDX/BEI).
Your objective is to conduct an institutional-grade, rigorous, empirical, and completely objective research analysis for the specified Indonesian equity.
You must synthesize the financial metrics, sector dynamics, technical momentum, and real-time internet news headlines provided below.

======================================================================
1. COMPANY & MARKET OVERVIEW
======================================================================
- Ticker: ${stockData.ticker}
- Company Name: ${stockData.name}
- Sector / Sub-Sector: ${stockData.sector || '-'} / ${stockData.subSector || '-'}
- Industry Framework: ${sectorFramework.name}
- Current Market Price: Rp ${formatRupiah(stockData.price)}
- Daily Change: ${stockData.changePercent ? Number(stockData.changePercent).toFixed(2) + '%' : '0%'}
- 52-Week Range: Low ${low52} — High ${high52}

======================================================================
2. FINANCIAL & VALUATION METRICS (DATABASE RECORD)
======================================================================
[Profitability & Operational Quality]
- Return on Equity (ROE): ${roe}
- Return on Assets (ROA): ${roa}
- Gross Profit Margin (GPM): ${gpm}
- Operating Profit Margin (OPM): ${opm}
- Net Profit Margin (NPM): ${npm}
- Revenue Growth (YoY): ${revGrowth}
- Free Cash Flow (FCF): ${fcf}
- Earnings Per Share (EPS): ${eps}

[Valuation, Solvency & Balance Sheet Health]
- Price-to-Earnings Ratio (PER): ${per}
- Price-to-Book Value (PBV): ${pbv}
- Price/Earnings-to-Growth (PEG Ratio): ${peg}
- Dividend Yield: ${divYield}
- Debt-to-Equity Ratio (DER): ${der}
- Current Ratio: ${cr}

======================================================================
3. TECHNICAL MOMENTUM & PRICE ACTION (DATABASE RECORD)
======================================================================
- Relative Strength Index (RSI 14-Period): ${rsi}
- MACD Histogram: ${macdHist}
- Moving Average 20 (MA20): ${ma20}
- Moving Average 50 (MA50): ${ma50}

======================================================================
4. REAL-TIME INTERNET RESEARCH & NEWS HEADLINES (LIVE WEB CONTEXT)
======================================================================
[ANTI-CLICKBAIT FILTER]: Berita telah disaring secara ketat berdasarkan skor sinyal finansial dan cuplikan artikel substantif. Abaikan spekulasi harian, rekomendasi trading broker harian, atau rumor tidak berdasar. Prioritaskan angka riil (kinerja laba/rugi, dividen, capex, kontrak, ekspansi).
${searchContext || 'Tidak ada berita terkini dalam 90 hari terakhir. Analisis harus bersandar pada fundamental dan dinamika industri resmi.'}

======================================================================
5. SECTOR-SPECIFIC INDUSTRY DYNAMICS & ANALYTICAL RUBRIC
======================================================================
${sectorFramework.rubric}

======================================================================
MANDATORY RESPONSE FORMAT (YOU MUST WRITE YOUR ENTIRE ANALYSIS IN BAHASA INDONESIA):
======================================================================
You MUST produce your comprehensive report strictly following this 7-section structure:

## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Jelaskan unit bisnis inti emiten, bauran produk/jasa utama, dan kontribusi pendapatan.
- Paparkan rencana aksi korporasi, alokasi belanja modal (capex), rencana ekspansi kapasitas, atau diversifikasi produk yang dicanangkan manajemen untuk menghadapi tahun-tahun mendatang.)

## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Analisis kebutuhan riil pasar saat ini dan sejauh mana produk/jasa emiten memiliki kesesuaian pasar (product-market fit).
- Hubungkan dengan korelasi siklus industri spesifik (misalnya untuk komponen otomotif seperti AUTO: korelasi penjualan mobil/motor lampau terhadap populasi kendaraan berumur 3-7 tahun yang membutuhkan penggantian suku cadang/aftermarket; kesiapan menghadapi transisi kendaraan bensin/ICE ke Hybrid dan mobil listrik/EV).
- Jelaskan pula dampak regulasi pemerintah, siklus komoditas, atau faktor makro yang mempengaruhi industri ini.)

## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Bandingkan secara langsung dengan kompetitor utama di industrinya (sebutkan nama-nama kompetitor relevan).
- Identifikasi parit pertahanan ekonomi (economic moat) yang dimiliki perusahaan: apakah jaringan distribusi, skala ekonomi, efisiensi biaya, sinergi grup induk, atau loyalitas pelanggan.
- Jelaskan bagaimana perusahaan mengantisipasi persaingan, mempertahankan pangsa pasar (defend market share), dan menjaga margin profitabilitas.)

## 4. Analisis Fundamental & Valuasi Saham
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Evaluasi profitabilitas (ROE, ROA, OPM, NPM), ketahanan arus kas, serta struktur solvabilitas neraca (DER, likuiditas).
- Analisis metrik valuasi (PER, PBV, PEG Ratio, dan dividen), proyeksikan estimasi nilai wajar, serta evaluasi apakah terdapat Margin of Safety yang memadai pada harga pasar saat ini.)

## 5. Arah Tren & Momentum Teknikal
(Tulis 1-2 paragraf mendalam dalam Bahasa Indonesia:
- Interpretasi aksi harga terhadap rata-rata pergerakan MA20 dan MA50.
- Evaluasi momentum indikator RSI 14, histogram MACD, serta batas support dan resistance krusial.)

## 6. Analisis Sentimen Berita & Katalis Terkini
(Tulis 1-2 paragraf mendalam dalam Bahasa Indonesia:
- [ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]: Abaikan judul sensasional, rekomendasi harian broker ("rekomendasi saham", "target harga", "potensi cuan"), atau rumor tidak berdasar. Fokuslah secara ketat pada berita berbasis data nyata: rilis kinerja keuangan (laba/pendapatan), pembagian dividen resmi, realisasi/anggaran belanja modal (capex), ekspansi pabrik/kapasitas, kontrak kerja baru, atau regulasi pemerintah yang berdampak langsung terhadap fundamental emiten.
- Hubungkan secara langsung berita-berita internet terkini dari konteks di atas dengan prospek bisnis nyata, aksi korporasi, kinerja kuartalan, dan sentimen pasar.)

## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir
(Tulis 1-2 paragraf narasi prospek jangka 1-2 tahun ke depan yang merangkum katalis pemicu pertumbuhan, daya tahan bisnis emiten, serta risiko utama yang wajib diawasi investor.)

SKOR AI: [0-100] (Tuliskan satu angka bulat antara 0 sampai 100 yang merepresentasikan daya tarik investasi secara keseluruhan, contoh: SKOR AI: 85)
KESIMPULAN: [BELI / JUAL / HOLD] (Pilih salah satu secara tegas: KESIMPULAN: BELI, KESIMPULAN: JUAL, atau KESIMPULAN: HOLD)
ALASAN SINGKAT: (Tulis 1-2 kalimat tegas, tajam, dan objektif yang merangkum alasan utama rekomendasi Anda)

======================================================================
CRITICAL COMPLIANCE RULES:
======================================================================
- ENTIRE GENERATED OUTPUT MUST BE STRICTLY WRITTEN IN BAHASA INDONESIA.
- Do NOT hallucinate financial figures. If a metric is marked as unavailable or missing, state it clearly.
- In Section 7, you MUST strictly output "SKOR AI: [0-100]" and exactly one of "KESIMPULAN: BELI", "KESIMPULAN: JUAL", or "KESIMPULAN: HOLD".
- Maintain an objective, institutional, and disciplined equity research tone.`;
}

module.exports = { buildResearchPrompt, detectSectorFramework };
