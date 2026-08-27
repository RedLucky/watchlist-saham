import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { yahooFinance } from '@/lib/yahooClient';
import { deepSyncStock } from '@/lib/syncService';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateTechnicalScore } from '@/lib/scoring/technical';
import { calculateTrendingScore } from '@/lib/scoring/trending';

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

    // Check lastDeepSync
    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - new Date(stock.lastDeepSync) > twentyFourHours) {
      // Trigger background sync
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

    const fundamentals = parseJsonField(stock.fundamentals) || {};
    const technicals = parseJsonField(stock.technicals) || {};
    const kseiLatest = parseJsonField(stock.kseiLatest) || {};
    const kseiHistory = parseJsonField(stock.kseiHistory) || [];
    const ownership = parseJsonField(stock.ownership) || {};
    const dividendHistory = parseJsonField(stock.dividendHistory) || [];
    const insiderTrades = parseJsonField(stock.insiderTrades) || [];

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

    // Estimate Piotroski F-Score (out of 9)
    let computedFScore = 5; // default moderate score
    let computedZScore = 2.5; // default neutral
    if (fundamentals) {
      let score = 0;
      const roe = fundamentals.roe || 0;
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
      // 4. Net Profit growth (latest > previous)
      if (netProfitList.length >= 2) {
        if (netProfitList[netProfitList.length - 1] > netProfitList[netProfitList.length - 2]) score++;
      }
      // 5. Debt leverage (DER <= 1.0)
      if (der > 0 && der <= 1.0) score++;
      // 6. Liquidity (Current Ratio >= 1.5)
      if (currentRatio >= 1.5) score++;
      // 7. Sales growth (Revenue growth > 0)
      if (revenueGrowth > 0) score++;
      // 8. ROE > 12% (Efficiency)
      if (roe > 12) score++;
      // 9. Profit CAGR > 0 (Long term growth)
      if (cagr > 0) score++;
      
      computedFScore = Math.max(1, Math.min(9, score));
    }

    // Estimate Altman Z-Score
    const sectorUpper = (stock.sector || '').toUpperCase();
    if (sectorUpper === 'FINANCIALS' || sectorUpper === 'FINANCE') {
      computedZScore = 3.0; // Banks typically safe zones by default due to deposit backing
    } else if (fundamentals) {
      let z = 0.5; // base
      const cr = fundamentals.currentRatio || 1.2;
      const der = fundamentals.der || 1.0;
      const roe = fundamentals.roe || 8;
      
      // Liquidity contribution (proxy for working capital / assets)
      z += Math.min(1.5, cr * 0.5);
      
      // Debt contribution (proxy for equity / debt leverage)
      if (der > 0) {
        z += Math.min(1.5, 1.0 / der);
      } else {
        z += 1.5;
      }
      
      // Profitability contribution
      if (roe > 0) {
        z += Math.min(1.0, (roe / 100) * 4);
      }
      
      computedZScore = Number(Math.max(0.5, Math.min(4.5, z + 1.0)).toFixed(2));
    }

    // Assign to fundamentals object
    fundamentals.piotroskiFScore = computedFScore;
    fundamentals.altmanZScore = computedZScore;

    const enrichedStock = {
      ...stock,
      fundamentals,
      technicals
    };

    // Calculate Projections
    const projections = {};
    const price = stock.price || 0;
    
    // EPS & BVPS
    let eps = 0;
    let bvps = 0;
    let cagr = 0;

    if (fundamentals.netProfit && stock.sharesOutstanding) {
      const netProfitList = Array.isArray(fundamentals.netProfit) ? fundamentals.netProfit : [];
      if (netProfitList.length > 0) {
        const latestProfit = netProfitList[netProfitList.length - 1];
        eps = latestProfit / Number(stock.sharesOutstanding);
      }
      
      if (netProfitList.length >= 2) {
        const first = netProfitList[0];
        const last = netProfitList[netProfitList.length - 1];
        if (first > 0 && last > 0) {
          cagr = Math.pow(last / first, 1 / (netProfitList.length - 1)) - 1;
        }
      }
    }

    if (fundamentals.pbv && fundamentals.pbv > 0) {
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
      
      if (projections.fairValue > 0) {
        projections.marginOfSafety = Number((((projections.fairValue - price) / projections.fairValue) * 100).toFixed(1));
      }

      projections.projectedPrice12m = Math.round(price * (1 + cagr));
      if (price > 0) {
        projections.projectedUpside = Number((((projections.projectedPrice12m - price) / price) * 100).toFixed(1));
      }
      projections.cagrPercent = Number((cagr * 100).toFixed(1));
    }

    // Scores
    let fundamentalScore = null;
    let technicalScore = null;
    let trendingScore = null;

    try {
      fundamentalScore = calculateFundamentalScore(enrichedStock);
    } catch(e) {}
    try {
      technicalScore = calculateTechnicalScore(enrichedStock);
    } catch(e) {}
    try {
      trendingScore = calculateTrendingScore(enrichedStock);
    } catch(e) {}

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
      scores: {
        fundamental: fundamentalScore,
        technical: technicalScore,
        trending: trendingScore
      }
    };

    return NextResponse.json(serializeData(responseData));
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
