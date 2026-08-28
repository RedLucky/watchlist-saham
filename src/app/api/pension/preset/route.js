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

function getCombinations(array, size) {
  const result = [];
  function combine(start, currentCombo) {
    if (currentCombo.length === size) {
      result.push([...currentCombo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      currentCombo.push(array[i]);
      combine(i + 1, currentCombo);
      currentCombo.pop();
    }
  }
  combine(0, []);
  return result;
}

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

      let kseiLatest = null;
      try {
        kseiLatest = typeof st.kseiLatest === 'string' ? JSON.parse(st.kseiLatest) : (st.kseiLatest || null);
      } catch (e) {}

      let retailOwnership = kseiLatest?.retailPercent ?? 0;
      if (retailOwnership === 0 && ownership && Array.isArray(ownership.shareholders)) {
        ownership.shareholders.forEach(p => {
          const isMasyarakat = p.Nama?.toLowerCase().includes('masyarakat') || p.Kategori?.toLowerCase().includes('masyarakat');
          if (isMasyarakat) {
             let rawStr = String(p.Persentase || '0').replace('%', '').trim();
             retailOwnership += Number(rawStr);
          }
        });
      }

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

      // 3-Pillar Pension Stock Selection Engine:
      // Pillar 1: Fundamental Stability & Quality (Kestabilan Finansial & Profitabilitas ROE/DER)
      // Pillar 2: Dividend Cashflow & Sustainability (Kepastian Dividen Rutin & Payout Ratio Sehat)
      // Pillar 3: Valuation Margin of Safety (Keselamatan Harga Saham PER/PBV)

      const dividendYield = divRes.metrics.dividendYield || 0;
      const roe = fundRes.metrics.roe || 0;
      const der = fundRes.metrics.der || 0;
      const payoutRatio = divRes.metrics.payoutRatio || 50;
      const fcf = typeof fundamentals.freeCashflow === 'number' ? fundamentals.freeCashflow : null;
      const currentRatio = typeof fundamentals.currentRatio === 'number' ? fundamentals.currentRatio : 1.5;
      
      // Calculate Piotroski F-Score & Altman Z-Score equivalents internally or use defaults
      const fScore = 6; // simplified for now, as we'd need full historicals to calc it perfectly, but we will use it as a concept
      const zScore = 2.0;

      // 1. Economic Moat & Mega-Cap Bonus (The "Compounders")
      let moatBonus = 0;
      const compounders = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'KLBF', 'TLKM', 'ICBP', 'ASII', 'AMRT', 'INDF'];
      if (compounders.includes(st.ticker)) {
        moatBonus += 30; // Huge bonus for extreme safety and compounding history (Charlie Munger Quality)
      }

      // 2. Sector-Awareness Bonus/Penalty
      let sectorBonus = 0;
      const sector = st.sector?.toUpperCase() || '';
      const cyclicalSectors = ['ENERGY', 'BASIC MATERIALS', 'PROPERTIES & REAL ESTATE'];
      
      if (sector === 'FINANCIALS' || sector === 'HEALTHCARE') sectorBonus += 10;
      if (cyclicalSectors.includes(sector)) sectorBonus -= 20;
      
      // Override for pseudo-defensive value traps (Poultry, Construction)
      if (['CPIN', 'JPFA', 'MAIN', 'TOTL', 'WIKA', 'PTPP'].includes(st.ticker)) {
        sectorBonus -= 20; 
      }

      // 3. Free Cash Flow (FCF) Guard
      let fcfGuard = 0;
      if (fcf !== null) {
        if (fcf < 0) fcfGuard -= 40; // Penalty: Bakar uang / utang bayar dividen
        else fcfGuard += 10; // Bonus: Cashflow positif
      }

      // 4. Financial Distress & Valuation Penalty Relief
      let stabilityBonus = 0;
      if (der > 0 && der <= 1.2) stabilityBonus += 10; // Neraca sehat
      
      // Operational Moat Bonus (OPM)
      const opm = fundRes.metrics?.opm;
      if (opm !== null && opm >= 18) stabilityBonus += 15; // Tebal margin operasional = perlindungan arus kas dividen
      
      // Valuation Relief: If ROE is outstanding, reward heavily to offset bad PBV score
      if (roe >= 18) stabilityBonus += 25; 
      else if (roe >= 12) stabilityBonus += 15; 

      let safetyPenalty = 0;
      if (der > 2.0) safetyPenalty += 30; // Utang terlalu tinggi
      if (payoutRatio > 90) safetyPenalty += 20; // Dividend trap risk
      if (currentRatio < 1.0) safetyPenalty += 20; // Likuiditas buruk

      // 4. Calculate Total Pension Quality Score (0-100 normalized)
      // New Pension-Grade Weights: Kestabilan (40%), Dividen (40%), Valuasi (20%)
      let basePensionScore = 0;
      if (riskProfile === 'CONSERVATIVE') {
        basePensionScore = (fundRes.score * 0.45) + (divRes.score * 0.40) + (valRes.score * 0.15);
      } else if (riskProfile === 'AGGRESSIVE') {
        basePensionScore = (fundRes.score * 0.35) + (divRes.score * 0.35) + (valRes.score * 0.30);
      } else {
        // MODERATE
        basePensionScore = (fundRes.score * 0.40) + (divRes.score * 0.40) + (valRes.score * 0.20);
      }

      // 9. Anti-Gorengan Filter (KSEI Data)
      let retailPenalty = 0;
      if (retailOwnership > 50) {
        retailPenalty = -150; // MASSIVE PENALTY for Pension-Grade (Too Volatile/Uncontrollable)
      }

      const finalPensionScore = Math.max(0, Math.round(basePensionScore + stabilityBonus + sectorBonus + fcfGuard + moatBonus - safetyPenalty + retailPenalty));

      const reinvestmentRate = Math.max(0, (100 - payoutRatio) / 100);
      const estimatedGrowth = Math.max(2.0, Math.min(15.0, roe * reinvestmentRate));
      const totalEstimatedReturn = dividendYield + estimatedGrowth;

      let isDividendTrap = false;
      const historyArr = stockObj.dividendHistory;
      if (Array.isArray(historyArr)) {
        const now = new Date();
        for (const div of historyArr) {
          if (div.TanggalCum) {
            const cumDate = new Date(div.TanggalCum);
            const diffDays = (cumDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            if (diffDays >= -14 && diffDays <= 30) {
              isDividendTrap = true;
              break;
            }
          }
        }
      }
      
      // Cek apakah Ritel Sedang Masuk (Distribusi Bandar)
      let isRetailEntering = false;
      if (kseiLatest && Number.isFinite(kseiLatest.deltaRetail)) {
        isRetailEntering = kseiLatest.deltaRetail > 0;
      }

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
        isDividendTrap: isDividendTrap && isRetailEntering,
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
      // MINI PORTFOLIO OPTIMIZER
      // 1. Get Top 20 Candidates by Pension Score (Safety First)
      const topCandidates = scoredStocks.slice(0, 20);
      
      // 2. Generate all combinations of 4 stocks from Top 20 (max 4845 combinations)
      // If we have less than 4 stocks (which shouldn't happen unless DB is empty), handle it
      if (topCandidates.length >= 4) {
        const allCombos = getCombinations(topCandidates, 4);
        
        let bestCombo = topCandidates.slice(0, 4); // fallback
        let maxReturn = -1;

        // 3. Evaluate each combination
        const validCombos = [];
        for (const combo of allCombos) {
          // Diversification check: Max 2 stocks per sector
          const sectorCounts = {};
          let isDiversified = true;
          for (const st of combo) {
            const sec = st.sector || 'UNKNOWN';
            sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
            if (sectorCounts[sec] > 2) {
              isDiversified = false;
              break;
            }
          }

          if (isDiversified) {
            const avgReturn = combo.reduce((sum, st) => sum + st.totalEstimatedReturn, 0) / 4;
            validCombos.push({ combo, avgReturn });
          }
        }
        
        if (validCombos.length > 0) {
          // Sort combos by highest return
          validCombos.sort((a, b) => b.avgReturn - a.avgReturn);
          
          // Take the Top 5 best combinations
          const topCombos = validCombos.slice(0, 5);
          
          // Randomly pick one of the top 5 to give a "Regenerate" feel while still being optimal
          const randomIndex = Math.floor(Math.random() * topCombos.length);
          selectedPreset = topCombos[randomIndex].combo;
        } else {
          selectedPreset = topCandidates.slice(0, 4);
        }
        
        // Sort the final selected preset by score just to keep it orderly in the UI
        selectedPreset.sort((a, b) => b.finalPensionScore - a.finalPensionScore);
      } else {
        selectedPreset = topCandidates;
      }
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
