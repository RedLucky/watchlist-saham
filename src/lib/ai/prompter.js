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

function buildResearchPrompt(stockData, searchContext = "") {
  const f = safeParseJson(stockData.fundamentals) || {};
  const t = safeParseJson(stockData.technicals) || {};

  // Formatted Fundamental Metrics
  const roe = formatPercent(f.roe);
  const roa = formatPercent(f.roa);
  const opm = formatPercent(f.opm);
  const npm = formatPercent(f.npm);
  const der = f.der !== null && f.der !== undefined ? Number(f.der).toFixed(2) : 'Data unavailable';
  const eps = f.eps !== null && f.eps !== undefined ? `Rp ${formatRupiah(f.eps)}` : '-';
  const per = f.per !== null && f.per !== undefined ? `${Number(f.per).toFixed(2)}x` : '-';
  const pbv = f.pbv !== null && f.pbv !== undefined ? `${Number(f.pbv).toFixed(2)}x` : '-';
  const peg = f.pegRatio !== null && f.pegRatio !== undefined ? Number(f.pegRatio).toFixed(2) : '-';
  const divYield = formatPercent(f.dividendYield);
  const cr = f.currentRatio !== null && f.currentRatio !== undefined ? Number(f.currentRatio).toFixed(2) : '-';

  // Formatted Technical Metrics
  const rsi = t.rsi !== null && t.rsi !== undefined ? Number(t.rsi).toFixed(1) : '-';
  const macdHist = t.macdHistogram !== null && t.macdHistogram !== undefined ? Number(t.macdHistogram).toFixed(2) : '-';
  const ma20 = t.ma20 ? `Rp ${formatRupiah(t.ma20)}` : '-';
  const ma50 = t.ma50 ? `Rp ${formatRupiah(t.ma50)}` : '-';
  const high52 = t.high52w ? `Rp ${formatRupiah(t.high52w)}` : '-';
  const low52 = t.low52w ? `Rp ${formatRupiah(t.low52w)}` : '-';

  return `You are a Senior Quantitative Equity Analyst and Institutional Value Investor specializing in the Indonesia Stock Exchange (IDX/BEI).
Your objective is to conduct an institutional-grade, rigorous, empirical, and completely objective research analysis for the specified Indonesian equity.
You must synthesize the financial metrics, technical indicators, and real-time internet news headlines provided below.

======================================================================
1. COMPANY & MARKET OVERVIEW
======================================================================
- Ticker: ${stockData.ticker}
- Company Name: ${stockData.name}
- Sector / Sub-Sector: ${stockData.sector || '-'} / ${stockData.subSector || '-'}
- Current Market Price: Rp ${formatRupiah(stockData.price)}
- Daily Change: ${stockData.changePercent ? Number(stockData.changePercent).toFixed(2) + '%' : '0%'}
- 52-Week Range: Low ${low52} — High ${high52}

======================================================================
2. FINANCIAL & VALUATION METRICS (DATABASE RECORD)
======================================================================
[Profitability & Operational Growth]
- Return on Equity (ROE): ${roe}
- Return on Assets (ROA): ${roa}
- Operating Profit Margin (OPM): ${opm}
- Net Profit Margin (NPM): ${npm}
- Earnings Per Share (EPS): ${eps}

[Valuation, Solvency & Health]
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
4. REAL-TIME INTERNET SEARCH & NEWS HEADLINES (LIVE WEB CONTEXT)
======================================================================
${searchContext || 'No recent significant news found on the internet.'}

======================================================================
DETAILED RESEARCH INSTRUCTIONS:
======================================================================
Synthesize all the above data into a cohesive, highly professional investment thesis. You must cover the following core areas:
1. **Fundamental Health & Business Quality**: Evaluate operational efficiency, profitability durability (ROE/ROA/margins), debt sustainability (DER), and cash flow resilience.
2. **Valuation & Fair Value Projection**: Determine whether the current price is undervalued, fairly priced, or overvalued based on PER, PBV, and PEG. Explicitly assess whether a Margin of Safety exists.
3. **Technical Momentum & Price Action**: Interpret RSI momentum, MACD dynamics, and critical support/resistance boundaries relative to MA20 and MA50.
4. **Internet News, Catalysts & Macro Risks**: Directly reference the live news headlines provided above. Analyze specific catalysts (such as share buybacks, corporate actions, commodity price fluctuations, earnings announcements, dividend distributions, or government regulations) and potential downside hazards.
5. **Definitive Investment Recommendation**: Deliver an unequivocal conclusion with a quantitative score.

======================================================================
MANDATORY RESPONSE FORMAT (YOU MUST WRITE YOUR ENTIRE ANALYSIS IN BAHASA INDONESIA):
======================================================================
## 1. Kesimpulan Fundamental & Kinerja Bisnis
(Write 2-3 detailed paragraphs in Bahasa Indonesia analyzing profitability, debt structure, capital allocation, and business moat)

## 2. Valuasi & Harga Wajar
(Write 2-3 detailed paragraphs in Bahasa Indonesia detailing PER, PBV, PEG ratios, intrinsic value estimation, and Margin of Safety against current market price)

## 3. Arah Tren & Momentum Teknikal
(Write 2-3 detailed paragraphs in Bahasa Indonesia evaluating short-term and medium-term price action, key support/resistance levels, RSI, MACD histogram, and MA20/MA50)

## 4. Analisis Sentimen Berita & Katalis Terkini
(Write 2-3 detailed paragraphs in Bahasa Indonesia directly connecting the real-time internet news headlines above to company outlook, corporate actions, regulatory shifts, and commodity catalysts)

## 5. Rekomendasi Akhir
SKOR AI: [0-100] (Provide an integer score between 0 and 100 representing overall investment attractiveness, e.g. SKOR AI: 85)
KESIMPULAN: [BELI / JUAL / HOLD]
ALASAN SINGKAT: (Write 1-2 sharp, concise, and objective sentences in Bahasa Indonesia summarizing the primary justification)

======================================================================
CRITICAL COMPLIANCE RULES:
- YOUR ENTIRE GENERATED OUTPUT MUST BE STRICTLY WRITTEN IN BAHASA INDONESIA.
- Do NOT hallucinate financial figures. If a metric is missing or marked as unavailable, explicitly state that it is not available.
- In Section 5, you MUST strictly output "SKOR AI: [0-100]" and exactly one of "KESIMPULAN: BELI", "KESIMPULAN: JUAL", or "KESIMPULAN: HOLD".
- Maintain an objective, disciplined, and institutional tone without emotional bias.`;
}

module.exports = { buildResearchPrompt };
