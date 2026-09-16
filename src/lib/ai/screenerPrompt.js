/**
 * AI Stock Screener Prompt Builder & Criteria Extractor
 * Parses natural language queries into structured quantitative filter parameters.
 */

export const SUPPORTED_SECTORS = [
  'Financials',
  'Energy',
  'Basic Materials',
  'Industrials',
  'Consumer Non-Cyclicals',
  'Consumer Cyclicals',
  'Healthcare',
  'Properties & Real Estate',
  'Technology',
  'Infrastructures',
  'Transportation & Logistics'
];

/**
 * Builds system & user messages for LLM extraction
 */
export function buildScreenerAiMessages(userPrompt) {
  const systemPrompt = `Anda adalah asisten kuantitatif pasar modal Indonesia (IDX) yang bertugas mengekstrak kriteria penyaringan saham dari bahasa alami pengguna.
Tugas Anda adalah merespons HANYA dalam format JSON valid tanpa teks pengantar, markdown blocks, atau penjelasan tambahan di luar JSON.

Format JSON yang diwajibkan:
{
  "sector": string atau null, // Sektor BEI yang cocok: "Financials" | "Energy" | "Basic Materials" | "Industrials" | "Consumer Non-Cyclicals" | "Consumer Cyclicals" | "Healthcare" | "Properties & Real Estate" | "Technology" | "Infrastructures" | "Transportation & Logistics"
  "minDividendYield": number atau null, // Persentase dividen yield minimum (contoh: 5 untuk 5%)
  "minRoe": number atau null, // ROE minimum dalam % (contoh: 12)
  "minOpm": number atau null, // Operating Profit Margin minimum dalam % (contoh: 10)
  "maxPer": number atau null, // Batas atas Price-to-Earnings Ratio (contoh: 15)
  "maxPbv": number atau null, // Batas atas Price-to-Book Value (contoh: 1.5)
  "maxDer": number atau null, // Batas atas Debt-to-Equity Ratio (contoh: 1.5)
  "smartMoneyOnly": boolean, // true jika pengguna meminta saham yang diakumulasi bandar/asing/institusi
  "syariahOnly": boolean, // true jika pengguna meminta saham syariah / ISSI
  "explanation": string // Ringkasan singkat 1-2 kalimat dalam bahasa Indonesia mengenai filter yang diterapkan
}

Contoh 1:
Pengguna: "Cari saham bank dengan dividen yield di atas 5% dan ROE minimal 15%"
JSON:
{"sector": "Financials", "minDividendYield": 5, "minRoe": 15, "minOpm": null, "maxPer": null, "maxPbv": null, "maxDer": null, "smartMoneyOnly": false, "syariahOnly": false, "explanation": "Menyaring saham sektor finansial dengan yield dividen >= 5% dan profitabilitas modal ROE >= 15%."}

Contoh 2:
Pengguna: "Saham murah valuasi PER di bawah 10 dan PBV di bawah 1, utang rendah"
JSON:
{"sector": null, "minDividendYield": null, "minRoe": null, "minOpm": null, "maxPer": 10, "maxPbv": 1.0, "maxDer": 1.0, "smartMoneyOnly": false, "syariahOnly": false, "explanation": "Menyaring saham bervaluasi diskon (PER <= 10x, PBV <= 1.0x) dengan neraca sehat (DER <= 1.0x)."}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Safely parses raw LLM text output into structured JSON criteria
 */
export function parseScreenerAiResponse(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return createDefaultCriteria('Gagal menerima respons AI.');
  }

  try {
    // Clean code blocks if present (```json ... ```)
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // Find JSON boundaries
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx >= 0 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    const parsed = JSON.parse(cleaned);

    const parseNullableNumber = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return Number.isFinite(num) ? num : null;
    };

    let sector = null;
    if (typeof parsed.sector === 'string' && parsed.sector.trim().length > 0) {
      const trimmed = parsed.sector.trim();
      const lower = trimmed.toLowerCase();
      if (lower !== 'null' && lower !== 'all' && lower !== 'semua' && lower !== 'none' && lower !== 'any') {
        sector = trimmed;
      }
    }

    return {
      sector,
      minDividendYield: parseNullableNumber(parsed.minDividendYield),
      minRoe: parseNullableNumber(parsed.minRoe),
      minOpm: parseNullableNumber(parsed.minOpm),
      maxPer: parseNullableNumber(parsed.maxPer),
      maxPbv: parseNullableNumber(parsed.maxPbv),
      maxDer: parseNullableNumber(parsed.maxDer),
      smartMoneyOnly: Boolean(parsed.smartMoneyOnly),
      syariahOnly: Boolean(parsed.syariahOnly),
      explanation: typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0
        ? parsed.explanation.trim()
        : 'Filter kuantitatif diekstrak berdasarkan kriteria pencarian Anda.'
    };
  } catch (err) {
    return createDefaultCriteria(`Format kriteria tidak dapat diuraikan secara otomatis (${err.message}).`);
  }
}

function createDefaultCriteria(explanation) {
  return {
    sector: null,
    minDividendYield: null,
    minRoe: null,
    minOpm: null,
    maxPer: null,
    maxPbv: null,
    maxDer: null,
    smartMoneyOnly: false,
    syariahOnly: false,
    explanation
  };
}

/**
 * Filters and scores stocks based on extracted AI criteria
 */
export function filterStocksByAiCriteria(stocks = [], criteria = {}) {
  if (!Array.isArray(stocks) || stocks.length === 0) return [];

  const matched = [];

  for (const s of stocks) {
    if (s.isDelisted) continue;

    const f = s.fundamentals || {};
    const t = s.technicals || {};
    const sector = s.sector || '';

    // 1. Sector Check
    if (criteria.sector) {
      const targetSec = criteria.sector.toLowerCase();
      const actualSec = sector.toLowerCase();
      if (!actualSec.includes(targetSec) && !targetSec.includes(actualSec)) {
        continue;
      }
    }

    // 2. Syariah Check
    if (criteria.syariahOnly && !s.isSyariah) {
      continue;
    }

    // 3. Dividend Yield Check
    const divYield = Number(f.dividendYield ?? s.dividendYield ?? s.metrics?.dividendYield ?? 0) || 0;
    if (criteria.minDividendYield !== null && divYield < criteria.minDividendYield) {
      continue;
    }

    // 4. ROE Check
    const roe = Number(f.roe);
    if (criteria.minRoe !== null) {
      if (!Number.isFinite(roe) || roe < criteria.minRoe) continue;
    }

    // 5. OPM Check
    const opm = Number(f.opm);
    if (criteria.minOpm !== null) {
      if (!Number.isFinite(opm) || opm < criteria.minOpm) continue;
    }

    // 6. PER Check
    const per = Number(f.per);
    if (criteria.maxPer !== null) {
      if (!Number.isFinite(per) || per <= 0 || per > criteria.maxPer) continue;
    }

    // 7. PBV Check
    const pbv = Number(f.pbv);
    if (criteria.maxPbv !== null) {
      if (!Number.isFinite(pbv) || pbv <= 0 || pbv > criteria.maxPbv) continue;
    }

    // 8. DER Check (Kecuali sektor finansial/perbankan)
    const der = Number(f.der);
    const isFinancial = sector.toUpperCase().includes('FINANC') || sector.toUpperCase().includes('BANK');
    if (criteria.maxDer !== null && !isFinancial) {
      if (Number.isFinite(der) && der > criteria.maxDer) continue;
    }

    // 9. Smart Money Check
    let isAccumulated = false;
    let bfi = 0;
    if (s.kseiLatest) {
      const kLatest = typeof s.kseiLatest === 'string' ? JSON.parse(s.kseiLatest) : s.kseiLatest;
      bfi = Number(kLatest?.bfi) || 0;
      isAccumulated = bfi > 0 || (kLatest?.delta?.foreignShares || 0) > 0;
    }
    if (criteria.smartMoneyOnly && !isAccumulated) {
      continue;
    }

    // Calculate AI Match Score (0 - 100)
    let score = 50;
    if (roe >= 15) score += 15;
    if (divYield >= 5) score += 15;
    if (per > 0 && per <= 12) score += 10;
    if (pbv > 0 && pbv <= 1.5) score += 10;
    if (isAccumulated) score += 10;

    matched.push({
      ticker: s.ticker,
      name: s.name || s.ticker,
      sector: s.sector,
      price: s.price,
      changePercent: s.changePercent,
      volume: s.volume,
      fundamentals: f,
      technicals: t,
      score: Math.min(99, score),
      matchScore: Math.min(99, score),
      metrics: {
        per,
        pbv,
        roe,
        opm,
        der,
        dividendYield: divYield,
        bfi
      }
    });
  }

  // Sort descending by match score
  return matched.sort((a, b) => b.matchScore - a.matchScore);
}

