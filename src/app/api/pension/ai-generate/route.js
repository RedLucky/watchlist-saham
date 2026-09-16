import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAiCompletion } from '@/lib/ai/client';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateValuationScore } from '@/lib/scoring/valuation';
import { calculateDividendScore } from '@/lib/scoring/dividend';
import { optimizeDiscreteLots } from '@/lib/lotOptimizer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pension/ai-generate
 * Generates an optimized retirement portfolio with stock selection and lot calculation via local AI.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const riskProfile = (body.riskProfile || 'MODERATE').toUpperCase();
    const currentAge = Number(body.currentAge) || 30;
    const targetAge = Number(body.targetAge) || 55;
    const totalBudget = Number(body.totalBudget) || 4000000;
    const monthlyExpense = Number(body.monthlyExpense) || 5000000;
    const sbnAvailable = body.sbnAvailable !== undefined ? body.sbnAvailable : true;

    // Equity budget ratio based on risk profile
    let stockRatio = 0.35; // MODERATE default
    if (riskProfile === 'CONSERVATIVE') stockRatio = 0.20;
    if (riskProfile === 'AGGRESSIVE') stockRatio = 0.60;

    const equityBudget = totalBudget * stockRatio;

    // 1. Fetch top candidates from database
    const rawStocks = await prisma.stockData.findMany({
      take: 200,
      orderBy: { turnover: 'desc' }
    });

    const candidates = [];
    for (const st of rawStocks) {
      if (!st.price || st.price <= 0 || st.isDelisted) continue;

      let fundamentals = {};
      try {
        fundamentals = typeof st.fundamentals === 'string' ? JSON.parse(st.fundamentals) : (st.fundamentals || {});
      } catch (_) {}

      let kseiLatest = null;
      try {
        kseiLatest = typeof st.kseiLatest === 'string' ? JSON.parse(st.kseiLatest) : st.kseiLatest;
      } catch (_) {}

      const retailOwnership = Number(kseiLatest?.retailPct || 0);
      if (retailOwnership > 50) continue; // Anti-Gorengan filter

      const stockObj = {
        ticker: st.ticker,
        name: st.name,
        sector: st.sector,
        price: st.price,
        fundamentals,
        dividendHistory: (typeof st.dividendHistory === 'string' ? JSON.parse(st.dividendHistory) : st.dividendHistory) || []
      };

      const fundRes = calculateFundamentalScore(stockObj);
      const valRes = calculateValuationScore(stockObj);
      const divRes = calculateDividendScore(stockObj);

      const dividendYield = divRes.metrics?.dividendYield || 0;
      const roe = fundRes.metrics?.roe || 0;
      const der = fundRes.metrics?.der || 0;
      const opm = fundRes.metrics?.opm || 0;
      const streakYears = divRes.metrics?.streakYears || 0;

      // Filter out low quality stocks: must have reasonable fundamentals & dividend history
      if (roe < 6 && dividendYield < 3) continue;

      const compositeScore = Math.round(
        (fundRes.score * 0.40) + (divRes.score * 0.40) + (valRes.score * 0.20)
      );

      candidates.push({
        ticker: st.ticker,
        name: st.name,
        sector: st.sector || 'UNKNOWN',
        price: st.price,
        roe: Number(roe.toFixed(1)),
        der: Number(der.toFixed(2)),
        opm: Number(opm.toFixed(1)),
        dividendYield: Number(dividendYield.toFixed(2)),
        streakYears,
        compositeScore,
        rawStock: st,
        metrics: {
          roe,
          der,
          per: valRes.metrics?.per,
          pbv: valRes.metrics?.pbv,
          streakYears,
          dps: divRes.metrics?.dps || (st.price * (dividendYield / 100))
        }
      });
    }

    // Sort candidates by composite score and pick top 25
    candidates.sort((a, b) => b.compositeScore - a.compositeScore);
    const topCandidates = candidates.slice(0, 25);

    if (topCandidates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada kandidat saham yang memenuhi kriteria.' }, { status: 400 });
    }

    // 2. Prepare AI Prompt
    const yearsToRetire = Math.max(1, targetAge - currentAge);
    const candidateSummary = topCandidates.slice(0, 18).map(c => ({
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      price: c.price,
      lotPrice: c.price * 100,
      roe: `${c.roe}%`,
      der: c.der,
      opm: `${c.opm}%`,
      yield: `${c.dividendYield}%`,
      streak: `${c.streakYears} thn`,
      score: c.compositeScore
    }));

    const systemPrompt = `Anda adalah Senior Certified Financial Planner (CFP) spesialis portofolio pensiun BEI.
Tugas: Pilih tepat 4 sampai 5 saham terbaik dari daftar kandidat dan tentukan bobotnya.
PENTING: DILARANG menggunakan tag <think>. Langsung keluarkan format JSON valid dan ringkas:
- portfolioThesis: maksimal 1-2 kalimat ringkas.
- strategyAdvice: maksimal 1 kalimat ringkas.
- rationale tiap saham: maksimal 10 kata.
- targetWeightPct: total semua saham harus tepat 100%.
- priorityRank: 1, 2, 3, dst (urutan prioritas belanja).

Skema JSON:
{
  "portfolioThesis": "Tesis singkat strategi pensiun...",
  "strategyAdvice": "Saran disiplin DCA bulanan...",
  "stocks": [
    {
      "ticker": "BBCA",
      "targetWeightPct": 35,
      "role": "Core Compounder",
      "rationale": "Bank terbesar, ROE prima & dividen stabil.",
      "priorityRank": 1
    }
  ]
}`;

    const userPrompt = `Profil Keuangan Pengguna:
- Usia Sekarang: ${currentAge} tahun
- Target Usia Pensiun: ${targetAge} tahun (Horizon: ${yearsToRetire} tahun)
- Profil Risiko: ${riskProfile}
- Total Anggaran Tabungan Bulanan: Rp ${totalBudget.toLocaleString('id-ID')}
- Anggaran Khusus Saham (${Math.round(stockRatio * 100)}%): Rp ${Math.round(equityBudget).toLocaleString('id-ID')}

Daftar 18 Kandidat Saham Pensiun BEI Terbaik:
${JSON.stringify(candidateSummary, null, 2)}

Pilih 4 sampai 5 saham dengan total bobot 100% (JSON ringkas tanpa <think>)!`;

    let aiResult = null;
    let isAiGenerated = false;
    let rawContent = '';
    const startTime = Date.now();

    console.log(`[PensionAI] Mengirim permintaan inferensi ke Llama.cpp (${riskProfile}, budget: Rp ${totalBudget.toLocaleString('id-ID')})...`);

    try {
      const completion = await fetchAiCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.1,
        maxTokens: 850
      });

      const latencyMs = Date.now() - startTime;
      console.log(`[PensionAI] Respon diterima dari model ${completion.modelName} dalam ${(latencyMs / 1000).toFixed(1)} detik.`);

      if (completion?.content) {
        rawContent = completion.content;
        let cleanContent = rawContent.trim();
        // Bersihkan tag <think>...</think> jika model reasoning menyertakannya
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        // Bersihkan pembungkus markdown ```json ... ```
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        }
        // Pastikan JSON ditutup dengan kurung kurawal
        if (!cleanContent.endsWith('}')) {
          const lastBrace = cleanContent.lastIndexOf('}');
          if (lastBrace !== -1) {
            cleanContent = cleanContent.substring(0, lastBrace + 1);
          }
        }
        aiResult = JSON.parse(cleanContent);
        if (Array.isArray(aiResult?.stocks) && aiResult.stocks.length >= 3) {
          isAiGenerated = true;

          // Catat telemetri ke tabel AiAuditLog agar interaksi terekam di database
          await prisma.aiAuditLog.create({
            data: {
              ticker: 'PENSION_PORTFOLIO',
              event: 'SUCCESS',
              modelName: completion.modelName || 'local-model',
              promptTokens: completion.usage?.promptTokens ?? null,
              completionTokens: completion.usage?.completionTokens ?? null,
              totalTokens: completion.usage?.totalTokens ?? null,
              latencyMs,
              durationSec: Number((latencyMs / 1000).toFixed(2)),
              tokensPerSec: latencyMs > 0 && completion.usage?.completionTokens
                ? Number(((completion.usage.completionTokens / latencyMs) * 1000).toFixed(2))
                : null,
              prompt: userPrompt,
              response: cleanContent
            }
          }).catch((logErr) => console.error('[PensionAI] Gagal menyimpan AiAuditLog:', logErr.message));
        }
      }
    } catch (aiErr) {
      console.warn('[PensionAI] Inferensi model gagal atau server offline:', aiErr.message);
      await prisma.aiAuditLog.create({
        data: {
          ticker: 'PENSION_PORTFOLIO',
          event: 'FAILED',
          error: aiErr.message,
          prompt: userPrompt,
          response: rawContent || null
        }
      }).catch(() => {});
    }

    // 3. Process Selection (AI or Fallback)
    let selectedStocks = [];
    let portfolioThesis = '';
    let strategyAdvice = '';

    if (isAiGenerated && aiResult) {
      portfolioThesis = aiResult.portfolioThesis || 'Portofolio pensiun hasil analisis AI lokal.';
      strategyAdvice = aiResult.strategyAdvice || 'Disiplin investasi bulanan dengan reinvestasi dividen.';

      // Match AI tickers with candidate data
      for (const item of aiResult.stocks) {
        const found = topCandidates.find(c => c.ticker === item.ticker?.toUpperCase());
        if (found) {
          selectedStocks.push({
            ticker: found.ticker,
            name: found.name,
            sector: found.sector,
            price: found.price,
            dividendYield: found.dividendYield,
            estimatedGrowth: Math.max(2.0, Math.min(12.0, found.roe * 0.5)),
            totalEstimatedReturn: Number((found.dividendYield + (found.roe * 0.5)).toFixed(1)),
            finalPensionScore: found.compositeScore,
            targetWeightPct: Number(item.targetWeightPct) || Math.round(100 / aiResult.stocks.length),
            priorityRank: Number(item.priorityRank) || selectedStocks.length + 1,
            role: item.role || 'Pillar Asset',
            rationale: item.rationale || '',
            metrics: found.metrics
          });
        }
      }
    }

    // Fallback if AI selection resulted in fewer than 3 valid stocks
    if (selectedStocks.length < 3) {
      isAiGenerated = false;
      portfolioThesis = 'Portofolio pensiun dipilih berdasarkan Algoritma Kuantitatif Multi-Faktor Fundamental, Valuasi & Konsistensi Dividen BEI.';
      strategyAdvice = 'Lakukan akumulasi rutin bertahap setiap bulan dan optimalkan alokasi lot pada saham bernilai wajar.';

      // Pick top 4 diversified candidates
      const fallbackPicks = [];
      const usedSectors = {};
      for (const c of topCandidates) {
        if (fallbackPicks.length >= 4) break;
        const count = usedSectors[c.sector] || 0;
        if (count < 2) {
          usedSectors[c.sector] = count + 1;
          fallbackPicks.push(c);
        }
      }

      const defaultWeights = [35, 30, 20, 15];
      selectedStocks = fallbackPicks.map((c, idx) => ({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        price: c.price,
        dividendYield: c.dividendYield,
        estimatedGrowth: Math.max(2.0, Math.min(12.0, c.roe * 0.5)),
        totalEstimatedReturn: Number((c.dividendYield + (c.roe * 0.5)).toFixed(1)),
        finalPensionScore: c.compositeScore,
        targetWeightPct: defaultWeights[idx] || 25,
        priorityRank: idx + 1,
        role: idx === 0 ? 'Core Bedrock Compounder' : (idx === 1 ? 'High Yield Anchor' : 'Defensive Pillar'),
        rationale: `Kandidat fundamental terbaik di sektor ${c.sector} dengan ROE ${c.roe}% dan dividen yield ${c.dividendYield}%.`,
        metrics: c.metrics
      }));
    }

    // 4. Run Knapsack Lot Optimizer for maximum budget utilization
    const lotOptimization = optimizeDiscreteLots(selectedStocks, equityBudget);

    // Attach lot count and cost to each stock
    const presetStocks = selectedStocks.map(s => {
      const lots = lotOptimization.optimalLots[s.ticker] || 0;
      const lotCost = s.price * 100;
      return {
        ...s,
        lots,
        cost: lots * lotCost
      };
    });

    return NextResponse.json({
      success: true,
      isAiGenerated,
      riskProfile,
      equityBudget: Math.round(equityBudget),
      totalBudget,
      portfolioThesis,
      strategyAdvice,
      presetStocks,
      optimalLots: lotOptimization.optimalLots,
      totalSpent: lotOptimization.totalSpent,
      remainingCash: lotOptimization.remainingCash,
      utilizationPct: lotOptimization.utilizationPct,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[api/pension/ai-generate] error:', err);
    return NextResponse.json({ error: 'Gagal menghasilkan portofolio AI: ' + err.message }, { status: 500 });
  }
}
