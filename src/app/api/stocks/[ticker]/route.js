import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { yahooFinance } from '@/lib/yahooClient';
import { deepSyncStock } from '@/lib/syncService';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateTechnicalScore } from '@/lib/scoring/technical';
import { calculateTrendingScore } from '@/lib/scoring/trending';
import { calculateSmartMoneyScore, getBandarmologiVerdict } from '@/lib/scoring/smartMoney';
import { calculateDividendScore } from '@/lib/scoring/dividend';
import { calculatePiotroskiFScore, calculateAltmanZScore, calculateGrahamValuation } from '@/lib/scoring/financialHealth';
import { calculateAllValuationBands } from '@/lib/valuationBands';
import { calculateWaccAndEconomicValue } from '@/lib/waccEngine';
import { analyzeDividendTrap } from '@/lib/dividendTrapEngine';
import { buildCorporateActionsTimeline } from '@/lib/corporateActionEngine';

export const dynamic = 'force-dynamic';

function parseJsonField(field) {
  if (!field) return null;
  try {
    return JSON.parse(field);
  } catch (e) {
    return null;
  }
}

function serializeData(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export async function GET(request, { params }) {
  try {
    let { ticker } = await params;
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    // Normalize ticker
    ticker = ticker.toUpperCase().replace(/\.JK$/, '');

    const stock = await prisma.stockData.findUnique({
      where: { ticker },
    });

    if (!stock) {
      return NextResponse.json({ error: 'Saham tidak ditemukan' }, { status: 404 });
    }

    // Parse cached fields
    let fundamentals = parseJsonField(stock.fundamentals) || {};
    let technicals = parseJsonField(stock.technicals) || {};
    let kseiLatest = parseJsonField(stock.kseiLatest) || {};
    let kseiHistory = parseJsonField(stock.kseiHistory) || [];
    let ownership = parseJsonField(stock.ownership) || {};
    let dividendHistory = parseJsonField(stock.dividendHistory) || [];
    let insiderTrades = parseJsonField(stock.insiderTrades) || [];

    // Check if deep sync is needed (e.g. older snapshot missing totalRevenue/OPM/NPM/ROA/bookValue, abnormal USD PBV, > 24 hours ago, or refresh requested)
    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const hasAbnormalPBV = (fundamentals.pbv != null && fundamentals.pbv > 500) || (fundamentals.bookValue != null && fundamentals.bookValue > 0 && fundamentals.bookValue < 50);
    const isMissingNewFields = fundamentals.opm === undefined || fundamentals.npm === undefined || fundamentals.totalRevenue === undefined || fundamentals.bookValue === undefined || fundamentals.roa === undefined || hasAbnormalPBV;
    const isOldSync = (now - new Date(stock.lastDeepSync)) > twentyFourHours;
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if ((isMissingNewFields || forceRefresh) && !stock.isDelisted) {
      try {
        const syncResult = await deepSyncStock(ticker);
        if (syncResult?.success) {
          const freshStock = await prisma.stockData.findUnique({ where: { ticker } });
          if (freshStock) {
            Object.assign(stock, freshStock);
            fundamentals = parseJsonField(freshStock.fundamentals) || {};
            technicals = parseJsonField(freshStock.technicals) || {};
            dividendHistory = parseJsonField(freshStock.dividendHistory) || [];
          }
        }
      } catch (err) {
        console.error(`[StockDetail] Auto deep-sync failed for ${ticker}:`, err.message);
      }
    } else if (isOldSync && !stock.isDelisted) {
      // Trigger background sync for stale data
      deepSyncStock(ticker).catch(console.error);
    }

    let realTimeData = null;
    try {
      const quote = await yahooFinance.quote(`${ticker}.JK`, { validateResult: false });
      const bid = quote.bid || null;
      const ask = quote.ask || null;
      const bidSize = quote.bidSize || null;
      const askSize = quote.askSize || null;
      const spread = (bid && ask) ? Number((ask - bid).toFixed(2)) : null;
      const spreadPercent = (bid && ask && bid > 0) ? Number(((ask - bid) / bid * 100).toFixed(2)) : null;

      realTimeData = {
        bid,
        ask,
        bidSize,
        askSize,
        spread,
        spreadPercent,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
      };
    } catch (e) {
      // Ignore yahoo finance errors
    }

    // Technical Volume Analysis
    const todayVol = Number(stock.volume || 0);
    const avgVol3m = Number(stock.avgVolume3mo || 0);
    const volHistory = Array.isArray(technicals.volumes) ? technicals.volumes : [];
    const last20Vols = volHistory.slice(-20);
    const avgVol20d = last20Vols.length > 0 
      ? Math.round(last20Vols.reduce((a, b) => a + Number(b || 0), 0) / last20Vols.length) 
      : (avgVol3m || 0);

    const volumeSpikeRatio = avgVol3m > 0 ? Number((todayVol / avgVol3m).toFixed(2)) : (avgVol20d > 0 ? Number((todayVol / avgVol20d).toFixed(2)) : 1);
    
    let volumeStatus = 'Normal';
    if (volumeSpikeRatio >= 3.0) volumeStatus = 'Spike Ekstrem 🚀';
    else if (volumeSpikeRatio >= 1.5) volumeStatus = 'Akumulasi Volume 🔥';
    else if (volumeSpikeRatio < 0.5 && volumeSpikeRatio > 0) volumeStatus = 'Volume Rendah / Sepi ❄️';

    const volumeAnalysis = {
      todayVolume: todayVol,
      avgVolume3mo: avgVol3m,
      avgVolume20d: avgVol20d,
      volumeSpikeRatio,
      volumeStatus,
      turnover: Number(stock.turnover || 0),
      frequency: stock.frequency || 0,
      isBreakoutVolume: volumeSpikeRatio >= 1.5 && (stock.changePercent || 0) > 1.5
    };

    // 1. Projections (EPS, BVPS, CAGR, Graham, Fair Value)
    // 1. Projections & Financial Health (DRY via financialHealth.js)
    // Mendukung penyesuaian yield obligasi SUN dinamis & realtime dari client
    const { searchParams } = new URL(request.url);
    const bondYieldParam = searchParams.get('bondYield');
    const bondYield = bondYieldParam ? (parseFloat(bondYieldParam) || 6.5) : 6.5;

    const price = stock.price || 0;

    const grahamVal = calculateGrahamValuation({
      fundamentals,
      price,
      bondYield
    });

    fundamentals.eps = grahamVal.eps;
    fundamentals.piotroskiFScore = calculatePiotroskiFScore(fundamentals, stock.sector);
    fundamentals.altmanZScore = calculateAltmanZScore(fundamentals, stock.sector, price);

    const projections = {
      grahamNumber: grahamVal.grahamNumber,
      fairValue: grahamVal.fairValue,
      marginOfSafety: grahamVal.marginOfSafety,
      projectedPrice12m: grahamVal.projectedPrice12m,
      projectedUpside: grahamVal.projectedUpside,
      cagrPercent: grahamVal.cagrPercent,
      bondYield: grahamVal.bondYield
    };

    const enrichedStock = {
      ...stock,
      fundamentals,
      technicals,
      kseiLatest
    };

    // 4. Bandarmologi & Smart Money Verdict
    let smartMoneyScoreObj = null;
    let bandarmologiVerdict = null;
    try {
      smartMoneyScoreObj = calculateSmartMoneyScore(enrichedStock);
    } catch(e) {}
    try {
      bandarmologiVerdict = getBandarmologiVerdict({
        bfi: kseiLatest?.bfi,
        deltaSmartMoney: kseiLatest?.deltaSmartMoney,
        deltaRetail: kseiLatest?.deltaRetail,
        deltaForeign: kseiLatest?.deltaForeign,
        priceChange: stock.changePercent,
        turnoverSpikeRatio: volumeAnalysis.volumeSpikeRatio,
        retailPercent: kseiLatest?.retailPercent
      });
    } catch(e) {}

    // Calculate Controller (PSP) & Management (Direksi/Komisaris) Holdings
    const rawShareholders = Array.isArray(ownership?.shareholders) ? ownership.shareholders : (parseJsonField(stock.shareholders) || []);
    const controllerHolders = rawShareholders.filter(s => s.Pengendali === true || s.Kategori === 'Lebih dari 5%');
    const topController = controllerHolders[0] || null;
    const controllerTotalPct = controllerHolders.reduce((acc, s) => acc + Number(s.Persentase || 0), 0) || Number(kseiLatest?.controllerPercent || 0);

    const directorHolders = rawShareholders.filter(s => s.Kategori === 'Direksi');
    const commissionerHolders = rawShareholders.filter(s => s.Kategori === 'Komisaris');
    const directorsTotalPct = directorHolders.reduce((acc, s) => acc + Number(s.Persentase || 0), 0);
    const commissionersTotalPct = commissionerHolders.reduce((acc, s) => acc + Number(s.Persentase || 0), 0);
    const managementTotalPct = Number((directorsTotalPct + commissionersTotalPct).toFixed(3));

    const bandarmologi = {
      score: smartMoneyScoreObj?.score || 50,
      bfiScore: Number(kseiLatest?.bfi || 0),
      wyckoffPhase: bandarmologiVerdict?.wyckoffPhase || (smartMoneyScoreObj?.score >= 70 ? 1 : 3),
      wyckoffPhaseName: bandarmologiVerdict?.title || 'Fase Konsolidasi / Akumulasi',
      status: bandarmologiVerdict?.status || 'Netral',
      smartMoneyStatus: (kseiLatest?.deltaSmartMoney > 0 || (smartMoneyScoreObj?.score || 0) >= 60) ? 'Net Inflow ↑' : 'Net Outflow ↓',
      foreignPercent: Number(kseiLatest?.foreignPercent || 0),
      retailPercent: Number(kseiLatest?.retailPercent || 0),
      pensionPercent: Number(kseiLatest?.pensionPercent || 0),
      controllerPercent: Number((controllerTotalPct || kseiLatest?.controllerPercent || 0).toFixed(2)),
      controllerName: topController?.Nama || null,
      directorsPercent: Number(directorsTotalPct.toFixed(3)),
      commissionersPercent: Number(commissionersTotalPct.toFixed(3)),
      managementTotalPercent: managementTotalPct,
      topShareholders: rawShareholders.slice(0, 5),
      mutualFundPercent: Number(kseiLatest?.mutualFundPercent || 0),
      deltaForeign: Number(kseiLatest?.deltaForeign || 0),
      deltaRetail: Number(kseiLatest?.deltaRetail || 0),
      deltaSmartMoney: Number(kseiLatest?.deltaSmartMoney || 0),
      details: smartMoneyScoreObj?.details || []
    };

    // 5. Scores (extract numeric score values)
    let fundamentalScoreObj = null;
    let technicalScoreObj = null;
    let trendingScoreObj = null;
    let dividendScoreObj = null;

    try {
      fundamentalScoreObj = calculateFundamentalScore(enrichedStock);
    } catch(e) {}
    try {
      technicalScoreObj = calculateTechnicalScore(enrichedStock);
    } catch(e) {}
    try {
      trendingScoreObj = calculateTrendingScore(enrichedStock);
    } catch(e) {}
    try {
      dividendScoreObj = calculateDividendScore(enrichedStock);
    } catch(e) {}

    const fundamentalScore = typeof fundamentalScoreObj === 'object' ? (fundamentalScoreObj?.score ?? 50) : Number(fundamentalScoreObj) || 50;
    const technicalScore = typeof technicalScoreObj === 'object' ? (technicalScoreObj?.score ?? 50) : Number(technicalScoreObj) || 50;
    const trendingScore = typeof trendingScoreObj === 'object' ? (trendingScoreObj?.score ?? 50) : Number(trendingScoreObj) || 50;
    const smartMoneyScore = typeof smartMoneyScoreObj === 'object' ? (smartMoneyScoreObj?.score ?? 50) : Number(smartMoneyScoreObj) || 50;
    const dividendScore = typeof dividendScoreObj === 'object' ? (dividendScoreObj?.score ?? 0) : Number(dividendScoreObj) || 0;

    // Bloomberg RV: Relative Valuation & Peer Comparison Matrix
    const MIN_PEER_PRICE = 50;
    const MAX_PEERS = 4;
    const MIN_PEERS_BEFORE_BACKFILL = 3;
    const PEER_FUNDAMENTAL_WEIGHT = 0.55;
    const PEER_TECHNICAL_WEIGHT = 0.45;
    const GRAHAM_MULTIPLIER = 22.5;

    let peers = [];
    try {
      if (stock.sector) {
        let rawPeers = [];
        if (stock.subSector) {
          rawPeers = await prisma.stockData.findMany({
            where: {
              sector: stock.sector,
              subSector: stock.subSector,
              ticker: { not: ticker },
              isDelisted: false,
              price: { gt: MIN_PEER_PRICE }
            },
            take: MAX_PEERS,
            orderBy: { turnover: 'desc' },
            select: {
              ticker: true,
              name: true,
              price: true,
              changePercent: true,
              sector: true,
              subSector: true,
              fundamentals: true,
              technicals: true,
            }
          });
        }

        // If subSector has < 3 peers, complement with top peers from the broader sector
        if (rawPeers.length < MIN_PEERS_BEFORE_BACKFILL) {
          const existingTickers = [ticker, ...rawPeers.map(p => p.ticker)];
          const morePeers = await prisma.stockData.findMany({
            where: {
              sector: stock.sector,
              ticker: { notIn: existingTickers },
              isDelisted: false,
              price: { gt: MIN_PEER_PRICE }
            },
            take: MAX_PEERS - rawPeers.length,
            orderBy: { turnover: 'desc' },
            select: {
              ticker: true,
              name: true,
              price: true,
              changePercent: true,
              sector: true,
              subSector: true,
              fundamentals: true,
              technicals: true,
            }
          });
          rawPeers = [...rawPeers, ...morePeers];
        }

        peers = rawPeers.map(p => {
          const pf = parseJsonField(p.fundamentals) || {};
          const pt = parseJsonField(p.technicals) || {};

          let peerFScore = 50;
          let peerTScore = 50;
          try {
            peerFScore = calculateFundamentalScore({ price: p.price, fundamentals: pf })?.score ?? 50;
          } catch(e) {}
          try {
            peerTScore = calculateTechnicalScore({ price: p.price, technicals: pt })?.score ?? 50;
          } catch(e) {}

          const peerCompScore = Math.round((peerFScore * PEER_FUNDAMENTAL_WEIGHT) + (peerTScore * PEER_TECHNICAL_WEIGHT));

          // Graham Fair Value for peer
          const peerEps = pf.eps || 0;
          const peerPbv = pf.pbv ?? 0;
          const peerBvps = p.price > 0 && peerPbv > 0 ? p.price / peerPbv : 0;
          let peerGraham = 0;
          if (peerEps > 0 && peerBvps > 0) {
            peerGraham = Math.round(Math.sqrt(GRAHAM_MULTIPLIER * peerEps * peerBvps));
          }
          const peerMoS = peerGraham > 0 && p.price > 0
            ? Number((((peerGraham - p.price) / peerGraham) * 100).toFixed(1))
            : null;

          return {
            ticker: p.ticker,
            name: p.name,
            price: p.price,
            changePercent: p.changePercent,
            sector: p.sector,
            subSector: p.subSector,
            marketCap: pf.marketCap || 0,
            per: pf.per ?? null,
            pbv: pf.pbv ?? null,
            roe: pf.roe ?? null,
            npm: pf.npm ?? null,
            der: pf.der ?? null,
            dividendYield: pf.dividendYield ?? 0,
            fScore: pf.piotroskiFScore ?? null,
            grahamNumber: peerGraham,
            marginOfSafety: peerMoS,
            score: peerCompScore
          };
        });
      }
    } catch (peerErr) {
      console.warn('[RV] Error fetching relative valuation peers:', peerErr.message);
    }

    // Bloomberg PBND: Historical PE & PBV Valuation Bands
    let valuationBands = null;
    try {
      const historicalCloses = Array.isArray(technicals?.closes) && technicals.closes.length >= 10
        ? technicals.closes
        : (parseJsonField(stock.historicalRaw) || []);

      const currentEps = fundamentals?.eps || (fundamentals?.per > 0 ? stock.price / fundamentals.per : 0);
      const currentBvps = fundamentals?.bookValue || (fundamentals?.pbv > 0 ? stock.price / fundamentals.pbv : 0);

      valuationBands = calculateAllValuationBands({
        historicalPrices: historicalCloses,
        currentPrice: stock.price,
        eps: currentEps,
        bvps: currentBvps
      });
    } catch (bandErr) {
      console.warn('[PBND] Error calculating valuation bands:', bandErr.message);
    }

    // Bloomberg WACC & ROIC Economic Value Added Engine
    let waccData = null;
    try {
      const mCap = Number(fundamentals?.marketCap) || (stock.price * Number(stock.sharesOutstanding || 0));
      const tDebt = Number(fundamentals?.totalDebt) || 0;
      const tEquity = Number(fundamentals?.totalEquity) || (fundamentals?.pbv > 0 && stock.price > 0 ? (stock.price / fundamentals.pbv) * Number(stock.sharesOutstanding || 0) : mCap * 0.4);
      const tRevenue = Number(fundamentals?.totalRevenue) || 0;
      const netProfitList = Array.isArray(fundamentals?.netProfit) ? fundamentals.netProfit : [];
      const netInc = Number(fundamentals?.netIncome) || (netProfitList.length > 0 ? netProfitList[netProfitList.length - 1] : 0);

      waccData = calculateWaccAndEconomicValue({
        marketCap: mCap,
        totalDebt: tDebt,
        totalEquity: tEquity,
        totalRevenue: tRevenue,
        operatingIncome: fundamentals?.operatingIncome,
        opm: fundamentals?.opm,
        netIncome: netInc,
        cash: fundamentals?.cash || 0,
        beta: technicals?.beta || 1.0,
        riskFreeRate: bondYield
      });
    } catch (waccErr) {
      console.warn('[WACC] Error calculating WACC & EVA:', waccErr.message);
    }

    // Bloomberg DTRP: Dividend Trap & Ex-Date Drop Analyzer + DVD Run-Rate
    let dividendTrap = null;
    try {
      const netProfitList = Array.isArray(fundamentals?.netProfit) ? fundamentals.netProfit : [];
      const latestProfit = Number(fundamentals?.netIncome) || (netProfitList.length > 0 ? netProfitList[netProfitList.length - 1] : null);

      dividendTrap = analyzeDividendTrap({
        dividendYield: fundamentals?.dividendYield,
        payoutRatio: fundamentals?.payoutRatio,
        fcf: fundamentals?.freeCashflow,
        netProfit: latestProfit,
        totalDividendsPaid: null,
        der: fundamentals?.der,
        dividendStreakYears: fundamentals?.dividendStreakYears,
        dividendHistory,
        price: stock.price,
        sector: stock.sector
      });
    } catch (dtrpErr) {
      console.warn('[DTRP] Error analyzing dividend trap:', dtrpErr.message);
    }

    // Bloomberg CA: Live Corporate Actions & Catalyst Calendar
    let corporateActions = [];
    try {
      corporateActions = buildCorporateActionsTimeline({
        dividendHistory,
        fundamentals,
        ticker
      });
    } catch (caErr) {
      console.warn('[CA] Error building corporate actions timeline:', caErr.message);
    }

    const responseData = {
      ...enrichedStock,
      kseiLatest,
      kseiHistory,
      ownership,
      dividendHistory,
      insiderTrades,
      realTimeData,
      volumeAnalysis,
      projections,
      bandarmologi,
      peers,
      valuationBands,
      wacc: waccData,
      dividendTrap,
      corporateActions,
      scores: {
        fundamental: fundamentalScore,
        technical: technicalScore,
        trending: trendingScore,
        smartMoney: smartMoneyScore,
        dividend: dividendScore,
        details: {
          fundamental: fundamentalScoreObj?.details || [],
          technical: technicalScoreObj?.details || [],
          trending: trendingScoreObj?.details || [],
          smartMoney: smartMoneyScoreObj?.details || []
        }
      }
    };

    return NextResponse.json(serializeData(responseData));
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
