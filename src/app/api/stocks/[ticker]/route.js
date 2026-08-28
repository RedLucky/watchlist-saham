import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { yahooFinance } from '@/lib/yahooClient';
import { deepSyncStock } from '@/lib/syncService';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateTechnicalScore } from '@/lib/scoring/technical';
import { calculateTrendingScore } from '@/lib/scoring/trending';
import { calculateSmartMoneyScore, getBandarmologiVerdict } from '@/lib/scoring/smartMoney';

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

    // Check if deep sync is needed (e.g. older snapshot missing OPM/NPM, > 24 hours ago, or refresh requested)
    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const isMissingOpm = fundamentals.opm === undefined || fundamentals.npm === undefined;
    const isOldSync = (now - new Date(stock.lastDeepSync)) > twentyFourHours;
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if ((isMissingOpm || forceRefresh) && !stock.isDelisted) {
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
        regularMarketChangePercent: quote.regularMarketChangePercent
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
    // 1. Projections (EPS, BVPS, CAGR, Graham, Fair Value)
    const projections = {};
    const price = stock.price || 0;
    
    let eps = 0;
    let bvps = 0;
    let cagr = 0;

    // 1a. EPS in Local Currency
    if (fundamentals.eps && fundamentals.eps > 0) {
      eps = Number(fundamentals.eps);
    } else if (fundamentals.per && fundamentals.per > 0 && price > 0) {
      eps = price / fundamentals.per;
    } else if (fundamentals.netProfit && stock.sharesOutstanding) {
      const netProfitList = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit : [];
      if (netProfitList.length > 0) {
        const latestProfit = netProfitList[netProfitList.length - 1];
        const shares = Number(stock.sharesOutstanding);
        if (shares > 0 && Number.isFinite(latestProfit)) {
          eps = latestProfit / shares;
        }
      }
    }
    fundamentals.eps = eps > 0 ? Number(eps.toFixed(2)) : (fundamentals.eps || null);

    // 1b. Profit CAGR
    if (fundamentals.netProfit) {
      const netProfitList = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit : [];
      if (netProfitList.length >= 2) {
        const first = netProfitList[0];
        const last = netProfitList[netProfitList.length - 1];
        const years = netProfitList.length - 1;
        if (first > 0 && last > 0 && years > 0) {
          cagr = Math.pow(last / first, 1 / years) - 1;
        }
      }
    }

    // CAGR Fallback: use revenueGrowth if profit CAGR is unavailable
    if (cagr === 0 && fundamentals.revenueGrowth && Number.isFinite(fundamentals.revenueGrowth)) {
      cagr = fundamentals.revenueGrowth / 100;
    }

    // 1c. BVPS in Local Currency (Price / PBV)
    if (fundamentals.pbv && fundamentals.pbv > 0 && price > 0) {
      bvps = price / fundamentals.pbv;
    }

    if (eps > 0 && bvps > 0) {
      const grahamValue = 22.5 * eps * bvps;
      if (grahamValue > 0) {
        projections.grahamNumber = Math.round(Math.sqrt(grahamValue));
      }
    }

    if (eps > 0) {
      // Benjamin Graham Fair Value = EPS * (8.5 + 2 * CAGR%) * (4.4 / 6.5)
      // Clamp CAGR between 0% and 25% for conservative valuation
      const cappedCAGR = Math.max(0, Math.min(25, cagr * 100));
      const fairVal = eps * (8.5 + 2 * cappedCAGR) * (4.4 / 6.5);
      projections.fairValue = Math.round(fairVal);
      
      if (projections.fairValue > 0 && price > 0) {
        projections.marginOfSafety = Number((((projections.fairValue - price) / projections.fairValue) * 100).toFixed(1));
      }

      projections.projectedPrice12m = Math.round(price * (1 + (cagr > -0.5 ? cagr : 0)));
      if (price > 0) {
        projections.projectedUpside = Number((((projections.projectedPrice12m - price) / price) * 100).toFixed(1));
      }
      projections.cagrPercent = Number((cagr * 100).toFixed(1));
    }

    // 2. Estimate Piotroski F-Score (out of 9)
    let computedFScore = 5; // default moderate score
    let computedZScore = 2.5; // default neutral
    if (fundamentals) {
      let score = 0;
      const roe = fundamentals.roe || 0;
      const opm = fundamentals.opm || 0;
      const eps = fundamentals.eps || 0;
      const fcf = fundamentals.freeCashflow || 0;
      const der = fundamentals.der || 0;
      const currentRatio = fundamentals.currentRatio || 0;
      const revenueGrowth = fundamentals.revenueGrowth || 0;
      const netProfitList = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit : [];
      
      // 1. ROA/ROE > 0 (Profitability)
      if (roe > 0) score++;
      // 2. FCF > 0 (Cash Flow)
      if (fcf > 0) score++;
      // 3. FCF > Net Profit (Cash Flow quality)
      if (netProfitList.length > 0) {
        const latestProfit = netProfitList[netProfitList.length - 1];
        if (fcf > latestProfit) score++;
      }
      // 4. Net Profit growth or EPS > 0
      if (netProfitList.length >= 2) {
        if (netProfitList[netProfitList.length - 1] > netProfitList[netProfitList.length - 2]) score++;
      } else if (eps > 0) {
        score++;
      }
      // 5. Debt leverage (DER <= 1.0)
      if (der > 0 && der <= 1.0) score++;
      // 6. Liquidity (Current Ratio >= 1.5)
      if (currentRatio >= 1.5) score++;
      // 7. Sales growth (Revenue growth > 0)
      if (revenueGrowth > 0) score++;
      // 8. OPM & Margin Quality (OPM >= 12% or ROE > 12%)
      if (opm >= 12 || roe > 12) score++;
      // 9. Profit CAGR > 0 (Long term growth)
      if (cagr > 0) score++;
      
      computedFScore = Math.max(1, Math.min(9, score));
    }

    // 3. Estimate Altman Z-Score
    const sectorUpper = (stock.sector || '').toUpperCase();
    if (sectorUpper === 'FINANCIALS' || sectorUpper === 'FINANCE') {
      computedZScore = 3.0; // Banks typically safe zones by default due to deposit backing
    } else if (fundamentals) {
      let z = 0.5; // base
      const cr = fundamentals.currentRatio || 1.2;
      const der = fundamentals.der || 1.0;
      const roe = fundamentals.roe || 8;
      const opm = fundamentals.opm || 0;
      
      // Liquidity contribution (proxy for working capital / assets)
      z += Math.min(1.5, cr * 0.5);
      
      // Debt contribution (proxy for equity / debt leverage)
      if (der > 0) {
        z += Math.min(1.5, 1.0 / der);
      } else {
        z += 1.5;
      }
      
      // Profitability & Operating Margin contribution (EBIT proxy)
      if (roe > 0) {
        z += Math.min(0.8, (roe / 100) * 3);
      }
      if (opm > 0) {
        z += Math.min(0.8, (opm / 100) * 2.5);
      }
      
      computedZScore = Number(Math.max(0.5, Math.min(4.5, z + 0.8)).toFixed(2));
    }

    // Assign to fundamentals object
    fundamentals.piotroskiFScore = computedFScore;
    fundamentals.altmanZScore = computedZScore;

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

    try {
      fundamentalScoreObj = calculateFundamentalScore(enrichedStock);
    } catch(e) {}
    try {
      technicalScoreObj = calculateTechnicalScore(enrichedStock);
    } catch(e) {}
    try {
      trendingScoreObj = calculateTrendingScore(enrichedStock);
    } catch(e) {}

    const fundamentalScore = typeof fundamentalScoreObj === 'object' ? (fundamentalScoreObj?.score ?? 50) : Number(fundamentalScoreObj) || 50;
    const technicalScore = typeof technicalScoreObj === 'object' ? (technicalScoreObj?.score ?? 50) : Number(technicalScoreObj) || 50;
    const trendingScore = typeof trendingScoreObj === 'object' ? (trendingScoreObj?.score ?? 50) : Number(trendingScoreObj) || 50;
    const smartMoneyScore = typeof smartMoneyScoreObj === 'object' ? (smartMoneyScoreObj?.score ?? 50) : Number(smartMoneyScoreObj) || 50;

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
      scores: {
        fundamental: fundamentalScore,
        technical: technicalScore,
        trending: trendingScore,
        smartMoney: smartMoneyScore,
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
