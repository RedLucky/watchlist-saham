import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateValuationScore } from '@/lib/scoring/valuation';
import { calculateDividendScore } from '@/lib/scoring/dividend';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/preset?riskProfile=CONSERVATIVE|MODERATE|AGGRESSIVE
 * Dynamically picks and ranks stocks based on real-time BEI database fundamentals,
 * valuation (PER/PBV), and dividend yield + consistency.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const riskProfile = (searchParams.get('riskProfile') || 'MODERATE').toUpperCase();
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    let customTickers = null;
    if (!forceRefresh) {
      const userId = getUserIdFromRequest(request);
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { customPreset: true } });
        if (user?.customPreset) {
          try {
            customTickers = JSON.parse(user.customPreset);
          } catch (e) {
            console.error('Failed to parse customPreset:', e);
          }
        }
      }
    }

    // 1. Query stocks with fundamental data from Database
    const whereClause = customTickers && customTickers.length > 0 
      ? { ticker: { in: customTickers } } 
      : {};

    const rawStocks = await prisma.stockData.findMany({
      where: whereClause,
      take: customTickers ? customTickers.length : 200,
      orderBy: { turnover: 'desc' }
    });

    const scoredStocks = rawStocks.map((st) => {
      let fundamentals = {};
      try {
        fundamentals = typeof st.fundamentals === 'string' ? JSON.parse(st.fundamentals) : (st.fundamentals || {});
      } catch (e) {
        fundamentals = {};
      }

      const stockObj = {
        ticker: st.ticker,
        name: st.name,
        sector: st.sector,
        price: st.price,
        fundamentals
      };

      const fundRes = calculateFundamentalScore(stockObj);
      const valRes = calculateValuationScore(stockObj);
      const divRes = calculateDividendScore(stockObj);

      // 3-Pillar Pension Stock Selection Engine:
      // Pillar 1: Fundamental Stability & Quality (Kestabilan Finansial & Profitabilitas ROE/DER)
      // Pillar 2: Dividend Cashflow & Sustainability (Kepastian Dividen Rutin & Payout Ratio Sehat)
      // Pillar 3: Valuation Margin of Safety (Keselamatan Harga Saham PER/PBV)

      const dividendYield = divRes.metrics.dividendYield || 0;
      const roe = fundRes.metrics.roe || 0;
      const der = fundRes.metrics.der || 0;
      const payoutRatio = divRes.metrics.payoutRatio || 50;

      // Filter/Penalty: Hindari saham utang berlebih (DER > 2.0) atau payout ratio > 95% (dividen rawan terpangkas)
      let stabilityBonus = 0;
      if (der > 0 && der <= 1.2) stabilityBonus += 15; // Neraca sangat sehat
      if (roe >= 12) stabilityBonus += 15; // Profitabilitas tinggi

      let safetyPenalty = 0;
      if (der > 2.0) safetyPenalty += 30; // Utang terlalu tinggi
      if (payoutRatio > 90) safetyPenalty += 20; // Dividend trap risk

      // Calculate Total Pension Quality Score (0-100 normalized)
      let basePensionScore = 0;
      if (riskProfile === 'CONSERVATIVE') {
        // 45% Fundamental Stability, 35% Dividend Safety, 20% Valuation Margin
        basePensionScore = (fundRes.score * 0.45) + (divRes.score * 0.35) + (valRes.score * 0.20);
      } else if (riskProfile === 'AGGRESSIVE') {
        // 35% Fundamental Growth, 35% Dividend Yield, 30% Valuation Upside
        basePensionScore = (fundRes.score * 0.35) + (divRes.score * 0.35) + (valRes.score * 0.30);
      } else {
        // MODERATE: 40% Fundamental Stability, 35% Dividend Safety, 25% Valuation Margin
        basePensionScore = (fundRes.score * 0.40) + (divRes.score * 0.35) + (valRes.score * 0.25);
      }

      const finalPensionScore = Math.max(0, Math.round(basePensionScore + stabilityBonus - safetyPenalty));

      const reinvestmentRate = Math.max(0, (100 - payoutRatio) / 100);
      const estimatedGrowth = Math.max(2.0, Math.min(15.0, roe * reinvestmentRate));
      const totalEstimatedReturn = dividendYield + estimatedGrowth;

      return {
        ticker: st.ticker,
        name: st.name,
        sector: st.sector,
        price: st.price,
        fundamentalScore: fundRes.score,
        valuationScore: valRes.score,
        dividendScore: divRes.score,
        dividendYield: divRes.metrics.dividendYield || 0,
        estimatedGrowth: Number(estimatedGrowth.toFixed(1)),
        totalEstimatedReturn: Number(totalEstimatedReturn.toFixed(1)),
        finalPensionScore,
        metrics: {
          roe: fundRes.metrics.roe,
          der: fundRes.metrics.der,
          per: valRes.metrics.per,
          pbv: valRes.metrics.pbv,
          streakYears: divRes.metrics.streakYears
        }
      };
    });

    // Sort by dynamic pension score descending
    scoredStocks.sort((a, b) => b.finalPensionScore - a.finalPensionScore);

    // Pick top 4 stocks dynamically IF not custom
    let selectedPreset = scoredStocks;
    if (!customTickers || customTickers.length === 0) {
      selectedPreset = scoredStocks.slice(0, 4);
    }

    // If custom tickers are provided, make sure they follow the exact order
    if (customTickers && customTickers.length > 0) {
      selectedPreset.sort((a, b) => customTickers.indexOf(a.ticker) - customTickers.indexOf(b.ticker));
    }

    // Dynamic Bluechip Options (Top liquid Bluechips ranked dynamically by real-time market fundamental & dividend score)
    const bluechipsList = ['BBRI', 'BMRI', 'BBCA', 'BBNI', 'TLKM', 'ASII', 'ICBP', 'UNVR', 'ADRO', 'PGAS', 'KLBF', 'PTBA'];
    const dynamicBluechips = scoredStocks
      .filter(st => bluechipsList.includes(st.ticker))
      .sort((a, b) => b.finalPensionScore - a.finalPensionScore)
      .map(st => st.ticker);

    const finalBluechipOptions = Array.from(new Set([...dynamicBluechips, ...bluechipsList])).slice(0, 8);

    return NextResponse.json({
      riskProfile,
      updatedAt: new Date().toISOString(),
      presetStocks: selectedPreset,
      bluechipOptions: finalBluechipOptions
    });
  } catch (err) {
    console.error('[api/pension/preset] error:', err);
    return NextResponse.json({ error: 'Gagal memuat preset pensiun' }, { status: 500 });
  }
}
