import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { getStyleConfig } from '@/lib/modes';
import { isSyariahStock } from '@/lib/sectorUniverse';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateValuationScore } from '@/lib/scoring/valuation';
import { calculateDividendScore } from '@/lib/scoring/dividend';
import { calculateTechnicalScore } from '@/lib/scoring/technical';
import { calculateSmartMoneyScore } from '@/lib/scoring/smartMoney';
import { calculateTrendingScore } from '@/lib/scoring/trending';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function applyGlobalPenalties(s, baseScore) {
  let score = baseScore;
  return Math.max(0, score);
}

function getPassiveResults(validStocks) {
  const compounders = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'ICBP', 'AMRT', 'INDF', 'KLBF'];

  const passiveCandidates = validStocks.map(s => {
    const divScore = calculateDividendScore(s);
    const fundScore = calculateFundamentalScore(s);
    const streak = divScore.metrics?.streakYears || s.fundamentals?.dividendStreakYears || 0;
    const opm = Number.isFinite(s.fundamentals?.opm) ? s.fundamentals.opm : null;
    const eps = Number.isFinite(s.fundamentals?.eps) ? s.fundamentals.eps : null;

    // Passive Income Engine: High Dividend Yield Quality (70%) + Fundamental Stability (30%) + Moat/Veteran Bonus
    let compositeScore = Math.round(((divScore.score || 0) * 0.70) + ((fundScore.score || 0) * 0.30));
    if (compounders.includes(s.ticker)) compositeScore += 6;
    if (streak >= 10) compositeScore += 4;
    // OPM & EPS Safety Bonus: Arus kas operasional tebal & laba positif menjamin dividen berkelanjutan
    if (opm !== null && opm >= 15) compositeScore += 5;
    if (eps !== null && eps > 0) compositeScore += 3;

    compositeScore = applyGlobalPenalties(s, Math.min(100, compositeScore));

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      changePercent: s.changePercent ?? 0,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      isDividendTrap: s.isDividendTrap,
      kseiLatest: s.kseiLatest || null,
      kseiHistory: s.kseiHistory || [],
      ownership: s.ownership || null,
      sharesOutstanding: s.sharesOutstanding || null,
      fundamentals: s.fundamentals || null,
      insiderTrades: s.insiderTrades || [],
      metrics: { 
        ...(divScore.metrics || {}), 
        ...(fundScore.metrics || {}),
        opm,
        eps,
      },
      divScore: divScore.score || 0,
      fundScore: fundScore.score || 0,
      score: compositeScore,
      details: [...(divScore.details || []), ...(fundScore.details || [])],
      shareholders: s.shareholders || [],
      smartMoney: s.smartMoney || null,
    };
  });

  // Strict Passive Income Mandate: Must have unbroken 5+ year dividend streak & meaningful yield (>= 4%)
  let filteredPassive = passiveCandidates.filter(
    s => (s.metrics.streakYears ?? 0) >= 5 && (s.metrics.dividendYield ?? 0) >= 4.0 && s.divScore >= 60
  );

  if (filteredPassive.length === 0) {
    filteredPassive = passiveCandidates.filter(s => (s.metrics.dividendYield ?? 0) > 0);
  }

  return filteredPassive
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.metrics.dividendYield || 0) - (a.metrics.dividendYield || 0);
    })
    .slice(0, 10);
}

function getDividendResults(validStocks) {
  return validStocks
    .map(s => {
      const divScore = calculateDividendScore(s);
      const fundScore = calculateFundamentalScore(s);
      const opm = Number.isFinite(s.fundamentals?.opm) ? s.fundamentals.opm : null;
      const eps = Number.isFinite(s.fundamentals?.eps) ? s.fundamentals.eps : null;

      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        price: s.price,
        changePercent: s.changePercent ?? 0,
        isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
        isDividendTrap: s.isDividendTrap,
        kseiLatest: s.kseiLatest || null,
        kseiHistory: s.kseiHistory || [],
        ownership: s.ownership || null,
        sharesOutstanding: s.sharesOutstanding || null,
        fundamentals: s.fundamentals || null,
        insiderTrades: s.insiderTrades || [],
        metrics: { 
          ...(fundScore.metrics || {}), 
          ...(divScore.metrics || {}),
          opm,
          eps,
        },
        score: applyGlobalPenalties(s, divScore.score || 0),
        details: divScore.details || [],
        shareholders: s.shareholders || [],
        smartMoney: s.smartMoney || null,
      };
    })
    .filter(s => (s.metrics.dividendYield ?? 0) > 0)
    .sort((a, b) => (b.metrics.dividendYield || 0) - (a.metrics.dividendYield || 0))
    .slice(0, 30);
}

function getCheapResults(validStocks) {
  const cheapCandidates = validStocks.map(s => {
    const valScore = calculateValuationScore(s);
    const fundScore = calculateFundamentalScore(s);
    const opm = Number.isFinite(s.fundamentals?.opm) ? s.fundamentals.opm : null;
    const eps = Number.isFinite(s.fundamentals?.eps) ? s.fundamentals.eps : null;
    const price = s.price || 1;
    const earningsYield = (eps && eps > 0 && price > 0) ? (eps / price * 100) : (s.fundamentals?.per > 0 ? 100 / s.fundamentals.per : 0);

    // Murah & Wajar: Valuasi Bagus (70%) + Fundamental & Earning Safety (30%)
    let compositeScore = Math.round(((valScore.score || 0) * 0.70) + ((fundScore.score || 0) * 0.30));

    // Value Trap Protection & Earnings Yield Booster:
    if (earningsYield >= 10.0) compositeScore += 8; // High Earnings Yield
    if (opm !== null && opm >= 12.0) compositeScore += 6; // Solid Operating Margin
    if (opm !== null && opm < 0) compositeScore -= 25; // Penalty: Value Trap (Rugi Operasi)
    if (eps !== null && eps < 0) compositeScore -= 30; // Penalty: Earning Negatif

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      changePercent: s.changePercent ?? 0,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      isDividendTrap: s.isDividendTrap,
      kseiLatest: s.kseiLatest || null,
      kseiHistory: s.kseiHistory || [],
      ownership: s.ownership || null,
      sharesOutstanding: s.sharesOutstanding || null,
      fundamentals: s.fundamentals || null,
      insiderTrades: s.insiderTrades || [],
      metrics: { 
        ...(fundScore.metrics || {}), 
        ...(valScore.metrics || {}),
        opm,
        eps,
        earningsYield: Number(earningsYield.toFixed(1)),
      },
      score: applyGlobalPenalties(s, Math.min(100, compositeScore)),
      details: [
        ...(valScore.details || []),
        ...(earningsYield >= 8 ? [`Earnings Yield menarik: ${earningsYield.toFixed(1)}%`] : []),
        ...(opm !== null && opm >= 10 ? [`Margin Operasional (OPM) sehat: ${opm.toFixed(1)}%`] : []),
      ],
      shareholders: s.shareholders || [],
      smartMoney: s.smartMoney || null,
    };
  });

  // Filter out negative earnings and extremely low margins
  let filteredCheap = cheapCandidates.filter(
    s => s.metrics.per > 0 && s.metrics.pbv > 0 && s.metrics.per <= (s.metrics.sectorAvgPER * 1.15) && (s.metrics.eps === null || s.metrics.eps > 0)
  );

  if (filteredCheap.length === 0) {
    filteredCheap = cheapCandidates.filter(s => (s.metrics.per ?? 0) > 0 || (s.metrics.pbv ?? 0) > 0);
  }

  return filteredCheap
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

function getQualityResults(validStocks) {
  const qualityCandidates = validStocks.map(s => {
    const valScore = calculateValuationScore(s);
    const fundScore = calculateFundamentalScore(s);
    const opm = Number.isFinite(s.fundamentals?.opm) ? s.fundamentals.opm : null;
    const eps = Number.isFinite(s.fundamentals?.eps) ? s.fundamentals.eps : null;
    const forwardEps = Number.isFinite(s.fundamentals?.forwardEps) ? s.fundamentals.forwardEps : null;

    let compositeScore = Math.round(((valScore.score || 0) * 0.45) + ((fundScore.score || 0) * 0.55));
    
    // Quality Moat & Forward EPS Boost
    if (opm !== null && opm >= 18.0) compositeScore += 6; // High Operating Moat
    if (eps !== null && forwardEps !== null && forwardEps > eps) compositeScore += 4; // EPS Momentum

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      changePercent: s.changePercent ?? 0,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      isDividendTrap: s.isDividendTrap,
      kseiLatest: s.kseiLatest || null,
      kseiHistory: s.kseiHistory || [],
      ownership: s.ownership || null,
      sharesOutstanding: s.sharesOutstanding || null,
      fundamentals: s.fundamentals || null,
      insiderTrades: s.insiderTrades || [],
      metrics: { 
        ...(valScore.metrics || {}), 
        ...(fundScore.metrics || {}),
        opm,
        eps,
        forwardEps,
      },
      valScore: valScore.score || 0,
      fundScore: fundScore.score || 0,
      score: applyGlobalPenalties(s, Math.min(100, compositeScore)),
      details: [
        ...(valScore.details || []), 
        ...(fundScore.details || []),
        ...(opm !== null && opm >= 15 ? [`Wide Moat: OPM ${opm.toFixed(1)}% di atas standar industri`] : []),
      ],
      shareholders: s.shareholders || [],
      smartMoney: s.smartMoney || null,
    };
  });

  let filteredQuality = qualityCandidates.filter(s => s.valScore >= 50 && s.fundScore >= 50);
  if (filteredQuality.length === 0) {
    filteredQuality = qualityCandidates;
  }

  return filteredQuality
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

function getPotentialResults(validStocks, swingStyle) {
  const potentialCandidates = validStocks.map(s => {
    const techScore = calculateTechnicalScore(s, swingStyle);
    const smScore = calculateSmartMoneyScore(s);
    const trendScore = calculateTrendingScore(s);
    const fundScore = calculateFundamentalScore(s);
    
    const compositeScore = Math.round(
      ((techScore.score || 0) * 0.4) + 
      ((smScore.score || 0) * 0.35) + 
      ((trendScore.score || 0) * 0.25)
    );
    
    const changePercent = Number.isFinite(s.changePercent) ? Number(s.changePercent) : 0;
    const volume = Number.isFinite(s.volume) ? Number(s.volume) : 0;

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      isDividendTrap: s.isDividendTrap,
      kseiLatest: s.kseiLatest || null,
      kseiHistory: s.kseiHistory || [],
      ownership: s.ownership || null,
      sharesOutstanding: s.sharesOutstanding || null,
      fundamentals: s.fundamentals || null,
      insiderTrades: s.insiderTrades || [],
      changePercent,
      volume,
      techScore: techScore.score || 0,
      smScore: smScore.score || 0,
      trendScore: trendScore.score || 0,
      metrics: { ...(fundScore.metrics || {}), techScore: techScore.score || 0, smScore: smScore.score || 0, trendScore: trendScore.score || 0 },
      score: compositeScore,
      details: [...(techScore.details || []), ...(smScore.details || []), ...(trendScore.details || [])],
      shareholders: s.shareholders || [],
      smartMoney: s.smartMoney || null,
    };
  });

  let filteredPotential = potentialCandidates.filter(
    s => s.techScore >= 45 && s.smScore >= 45 && s.trendScore >= 40
  );

  if (filteredPotential.length === 0) {
    filteredPotential = potentialCandidates;
  }

  return filteredPotential
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'pick';
    
    const provider = getActiveProvider();
    const stocks = await provider.getStocks();

    // Basic filter: price > 50 and not index
    const validStocks = stocks.filter(s => s && s.price > 50 && s.ticker !== '^JKSE');

    let results = [];
    const swingStyle = getStyleConfig('swing');

    switch (type) {
      case 'pick': {
        const passiveRes = getPassiveResults(validStocks);
        const dividendRes = getDividendResults(validStocks);
        const cheapRes = getCheapResults(validStocks);
        const qualityRes = getQualityResults(validStocks);

        const passiveSet = new Set(passiveRes.map(s => s.ticker));
        const dividendSet = new Set(dividendRes.map(s => s.ticker));
        const cheapSet = new Set(cheapRes.map(s => s.ticker));
        const qualitySet = new Set(qualityRes.map(s => s.ticker));

        const stockMap = {};

        validStocks.forEach(s => {
          const divScore = calculateDividendScore(s);
          const valScore = calculateValuationScore(s);
          const fundScore = calculateFundamentalScore(s);

          const matchedScreeners = [];
          if (passiveSet.has(s.ticker)) matchedScreeners.push('Passive Income');
          if (dividendSet.has(s.ticker)) matchedScreeners.push('High Dividend');
          if (cheapSet.has(s.ticker)) matchedScreeners.push('Murah & Wajar');
          if (qualitySet.has(s.ticker)) matchedScreeners.push('Valuasi Bagus');

          const matchCount = matchedScreeners.length;
          if (matchCount === 0) return;

          const yieldVal = divScore.metrics?.dividendYield ?? 0;
          const payoutVal = divScore.metrics?.payoutRatio ?? 0;
          const perVal = valScore.metrics?.per;
          const pbvVal = valScore.metrics?.pbv;
          const roeVal = fundScore.metrics?.roe;
          const derVal = fundScore.metrics?.der;
          const opmVal = Number.isFinite(s.fundamentals?.opm) ? s.fundamentals.opm : null;
          const epsVal = Number.isFinite(s.fundamentals?.eps) ? s.fundamentals.eps : null;

          const baseScore = Math.round(
            ((divScore.score || 0) * 0.3) + 
            ((valScore.score || 0) * 0.35) + 
            ((fundScore.score || 0) * 0.35)
          );
          let finalPickScore = Math.min(100, baseScore + (matchCount * 5));
          if (opmVal !== null && opmVal >= 15.0 && epsVal !== null && epsVal > 0) {
            finalPickScore = Math.min(100, finalPickScore + 4); // Super Pick bonus
          }
          finalPickScore = applyGlobalPenalties(s, finalPickScore);

          stockMap[s.ticker] = {
            ticker: s.ticker,
            name: s.name,
            sector: s.sector,
            price: s.price,
            changePercent: s.changePercent ?? 0,
            isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
            isDividendTrap: s.isDividendTrap,
            kseiLatest: s.kseiLatest || null,
            kseiHistory: s.kseiHistory || [],
            ownership: s.ownership || null,
            sharesOutstanding: s.sharesOutstanding || null,
            fundamentals: s.fundamentals || null,
            insiderTrades: s.insiderTrades || [],
            matchCount,
            matchedScreeners,
            metrics: {
              dividendYield: yieldVal,
              payoutRatio: payoutVal,
              per: perVal,
              pbv: pbvVal,
              roe: roeVal,
              der: derVal,
              opm: opmVal,
              eps: epsVal,
              cagr: fundScore.metrics?.cagr ?? null,
            },
            divScore: divScore.score || 0,
            valScore: valScore.score || 0,
            fundScore: fundScore.score || 0,
            score: finalPickScore,
            details: [
              `Muncul di ${matchCount} halaman screener utama: ${matchedScreeners.join(', ')}`,
              ...(opmVal !== null && opmVal >= 15 ? [`Super Moat: OPM ${opmVal.toFixed(1)}%`] : []),
              ...(epsVal !== null && epsVal > 0 ? [`Laba per Saham: EPS Rp ${epsVal.toLocaleString('id-ID')}`] : []),
              ...(divScore.details || []),
              ...(valScore.details || []),
              ...(fundScore.details || []),
            ],
            shareholders: s.shareholders || [],
            smartMoney: s.smartMoney || null,
          };
        });

        const allPicks = Object.values(stockMap);
        
        let topPicks = allPicks.filter(s => s.matchCount >= 2);
        if (topPicks.length < 5) {
          topPicks = allPicks.filter(s => s.matchCount >= 1);
        }

        results = topPicks
          .sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            return b.score - a.score;
          })
          .slice(0, 15);
        break;
      }

      case 'passive': {
        results = getPassiveResults(validStocks);
        break;
      }

      case 'dividend': {
        results = getDividendResults(validStocks);
        break;
      }

      case 'cheap': {
        results = getCheapResults(validStocks);
        break;
      }

      case 'quality': {
        results = getQualityResults(validStocks);
        break;
      }

      case 'potential': {
        results = getPotentialResults(validStocks, swingStyle);
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(
      {
        type,
        results,
        count: results.length,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err) {
    console.error('[screener API error]:', err);
    return NextResponse.json(
      { error: 'Gagal memproses data screener' },
      { status: 500 }
    );
  }
}
