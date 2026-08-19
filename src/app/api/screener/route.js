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

function getPassiveResults(validStocks) {
  const passiveCandidates = validStocks.map(s => {
    const divScore = calculateDividendScore(s);
    const fundScore = calculateFundamentalScore(s);
    const compositeScore = Math.round(((divScore.score || 0) * 0.6) + ((fundScore.score || 0) * 0.4));

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      metrics: { ...(divScore.metrics || {}), ...(fundScore.metrics || {}) },
      divScore: divScore.score || 0,
      fundScore: fundScore.score || 0,
      score: compositeScore,
      details: [...(divScore.details || []), ...(fundScore.details || [])],
    };
  });

  let filteredPassive = passiveCandidates.filter(
    s => (s.metrics.dividendYield ?? 0) > 0 && s.divScore >= 45 && s.fundScore >= 45
  );

  if (filteredPassive.length === 0) {
    filteredPassive = passiveCandidates.filter(s => (s.metrics.dividendYield ?? 0) > 0);
  }

  return filteredPassive
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function getDividendResults(validStocks) {
  return validStocks
    .map(s => {
      const divScore = calculateDividendScore(s);
      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        price: s.price,
        isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
        metrics: divScore.metrics || {},
        score: divScore.score || 0,
        details: divScore.details || [],
      };
    })
    .filter(s => (s.metrics.dividendYield ?? 0) > 0)
    .sort((a, b) => (b.metrics.dividendYield || 0) - (a.metrics.dividendYield || 0))
    .slice(0, 30);
}

function getCheapResults(validStocks) {
  const cheapCandidates = validStocks.map(s => {
    const valScore = calculateValuationScore(s);
    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      metrics: valScore.metrics || {},
      score: valScore.score || 0,
      details: valScore.details || [],
    };
  });

  let filteredCheap = cheapCandidates.filter(
    s => s.metrics.per > 0 && s.metrics.pbv > 0 && s.metrics.per <= (s.metrics.sectorAvgPER * 1.15)
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
    const compositeScore = Math.round(((valScore.score || 0) * 0.5) + ((fundScore.score || 0) * 0.5));

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.price,
      isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
      metrics: { ...(valScore.metrics || {}), ...(fundScore.metrics || {}) },
      valScore: valScore.score || 0,
      fundScore: fundScore.score || 0,
      score: compositeScore,
      details: [...(valScore.details || []), ...(fundScore.details || [])],
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
      changePercent,
      volume,
      techScore: techScore.score || 0,
      smScore: smScore.score || 0,
      trendScore: trendScore.score || 0,
      metrics: { techScore: techScore.score || 0, smScore: smScore.score || 0, trendScore: trendScore.score || 0 },
      score: compositeScore,
      details: [...(techScore.details || []), ...(smScore.details || []), ...(trendScore.details || [])],
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

          const baseScore = Math.round(
            ((divScore.score || 0) * 0.3) + 
            ((valScore.score || 0) * 0.35) + 
            ((fundScore.score || 0) * 0.35)
          );
          const finalPickScore = Math.min(100, baseScore + (matchCount * 5));

          stockMap[s.ticker] = {
            ticker: s.ticker,
            name: s.name,
            sector: s.sector,
            price: s.price,
            isSyariah: s.isSyariah ?? isSyariahStock(s.ticker, s.sector),
            matchCount,
            matchedScreeners,
            metrics: {
              dividendYield: yieldVal,
              payoutRatio: payoutVal,
              per: perVal,
              pbv: pbvVal,
              roe: roeVal,
              der: derVal,
            },
            divScore: divScore.score || 0,
            valScore: valScore.score || 0,
            fundScore: fundScore.score || 0,
            score: finalPickScore,
            details: [
              `Muncul di ${matchCount} halaman screener utama: ${matchedScreeners.join(', ')}`,
              ...(divScore.details || []),
              ...(valScore.details || []),
              ...(fundScore.details || []),
            ],
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

    return NextResponse.json({
      type,
      results,
      count: results.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[screener API error]:', err);
    return NextResponse.json(
      { error: 'Gagal memproses data screener' },
      { status: 500 }
    );
  }
}
