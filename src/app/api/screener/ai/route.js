import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { isSyariahStock } from '@/lib/sectorUniverse';
import { fetchAiCompletion } from '@/lib/ai/client';
import {
  buildScreenerAiMessages,
  parseScreenerAiResponse,
  filterStocksByAiCriteria,
  SUPPORTED_SECTORS
} from '@/lib/ai/screenerPrompt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Heuristic fallback criteria when local AI is offline or unreachable
 */
function buildHeuristicFallbackCriteria(promptText) {
  const p = promptText.toLowerCase();
  let sector = null;

  if (p.includes('bank') || p.includes('finan')) sector = 'Financials';
  else if (p.includes('energi') || p.includes('minyak') || p.includes('tambang') || p.includes('batu bara') || p.includes('batubara')) sector = 'Energy';
  else if (p.includes('konsum') || p.includes('makan') || p.includes('rokok')) sector = 'Consumer Non-Cyclicals';
  else if (p.includes('tekno') || p.includes('digital')) sector = 'Technology';
  else if (p.includes('infra') || p.includes('telko')) sector = 'Infrastructures';
  else if (p.includes('sehat') || p.includes('farmasi') || p.includes('rs')) sector = 'Healthcare';
  else if (p.includes('properti') || p.includes('gedung')) sector = 'Properties & Real Estate';

  let minYield = null;
  const yieldMatch = p.match(/(?:deviden|dividen|dividend|yield)\s*(?:yield\s*)?(?:>|>=|di atas|minimal|min)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (yieldMatch) {
    minYield = parseFloat(yieldMatch[1]);
  } else if (p.includes('dividen') || p.includes('deviden') || p.includes('yield')) {
    minYield = 4.0;
  }

  let minRoe = null;
  const roeMatch = p.match(/roe\s*(?:>|>=|di atas|minimal|min)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (roeMatch) {
    minRoe = parseFloat(roeMatch[1]);
  } else if (p.includes('kualitas') || p.includes('profit') || p.includes('untung')) {
    minRoe = 12.0;
  }

  let maxPer = null;
  const perMatch = p.match(/per\s*(?:<|<=|di bawah|maksimal|max)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (perMatch) {
    maxPer = parseFloat(perMatch[1]);
  } else if (p.includes('murah') || p.includes('diskon') || p.includes('undervalue')) {
    maxPer = 15.0;
  }

  let maxPbv = null;
  const pbvMatch = p.match(/pbv\s*(?:<|<=|di bawah|maksimal|max)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (pbvMatch) {
    maxPbv = parseFloat(pbvMatch[1]);
  } else if (p.includes('murah') || p.includes('diskon') || p.includes('undervalue')) {
    maxPbv = 1.5;
  }

  let maxDer = null;
  const hasDerRequest = p.includes('der') || p.includes('utang') || p.includes('debt');
  if (hasDerRequest) {
    const derMatch = p.match(/der\s*(?:<|<=|di bawah|maksimal|max)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    maxDer = derMatch ? parseFloat(derMatch[1]) : 1.5;
  }

  const smartMoneyOnly = p.includes('bandar') || p.includes('asing') || p.includes('institusi') || p.includes('akumulasi');
  const syariahOnly = p.includes('syariah') || p.includes('issi') || p.includes('jii');

  return {
    sector,
    minDividendYield: minYield,
    minRoe,
    minOpm: null,
    maxPer,
    maxPbv,
    maxDer: sector === 'Financials' ? null : maxDer,
    smartMoneyOnly,
    syariahOnly,
    explanation: 'Filter kuantitatif diekstrak menggunakan pencocokan heuristik kata kunci.'
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = (body?.prompt || '').trim();

    if (!prompt || prompt.length < 3) {
      return NextResponse.json(
        { error: 'Prompt pencarian terlalu pendek. Silakan masukkan kriteria saham yang ingin dicari.' },
        { status: 400 }
      );
    }

    let criteria = null;
    let modelName = 'local-ai-fallback';

    // 1. Attempt AI Parsing via local LLM
    try {
      const messages = buildScreenerAiMessages(prompt);
      const aiResponse = await fetchAiCompletion(messages, {
        temperature: 0.1,
        maxTokens: 500
      });

      if (aiResponse?.content) {
        criteria = parseScreenerAiResponse(aiResponse.content);
        modelName = aiResponse.modelName || 'local-ai';
      }
    } catch (aiErr) {
      console.warn('[AI-Screener] Local AI offline, using keyword heuristic fallback:', aiErr.message);
      criteria = buildHeuristicFallbackCriteria(prompt);
    }

    if (!criteria) {
      criteria = buildHeuristicFallbackCriteria(prompt);
    }

    // 2. Fetch all stocks from active data provider
    const provider = getActiveProvider();
    const rawStocks = await provider.getStocks();

    // 3. Filter valid active stocks
    const validStocks = rawStocks.filter(s =>
      s &&
      s.price > 50 &&
      s.ticker !== '^JKSE' &&
      !s.isDelisted
    ).map(s => ({
      ...s,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector)
    }));

    // 4. Run Quantitative Screening based on Extracted AI Criteria
    const filteredResults = filterStocksByAiCriteria(validStocks, criteria);

    // Limit to top 25 candidates
    const results = filteredResults.slice(0, 25);

    return NextResponse.json({
      success: true,
      prompt,
      criteria,
      results,
      count: results.length,
      totalMatched: filteredResults.length,
      modelName,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API /api/screener/ai Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses pencarian screener AI' },
      { status: 500 }
    );
  }
}

