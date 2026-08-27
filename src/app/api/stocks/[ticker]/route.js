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
    let { ticker } = params;
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
      const fairVal = eps * (8.5 + 2 * (cagr * 100)) * (4.4 / 6.5);
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
