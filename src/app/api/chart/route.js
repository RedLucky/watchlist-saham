import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { yahooFinance } from '@/lib/yahooClient';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const yearsParam = parseInt(searchParams.get('years') || '5', 10);
    const yearsBack = yearsParam > 0 ? yearsParam : 5;
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - yearsBack); // 5 years back for comprehensive historical chart
    const period2 = new Date();
    period2.setDate(period2.getDate() + 1); // include current trading day when provider uses exclusive period2
    
    // Fetch fresh 5-year data specifically for the chart using yahooFinance
    const strPeriod1 = period1.toISOString().split('T')[0];
    const strPeriod2 = period2.toISOString().split('T')[0];

    const targetTicker = ticker.includes('.JK') ? ticker : `${ticker}.JK`;

    const historical = await yahooFinance.historical(targetTicker, {
      period1: strPeriod1,
      period2: strPeriod2,
      interval: '1d'
    }, { validateResult: false });

    const chartData = normalizeChartRows(historical);

    // Generate MA data for the chart overlay
    const ma20Data = calculateMAForChart(chartData, 20);
    const ma50Data = calculateMAForChart(chartData, 50);
    const ma200Data = calculateMAForChart(chartData, 200);
    const bollingerData = calculateBollingerForChart(chartData, 20, 2);
    const rsiData = calculateRSIForChart(chartData, 14);
    const macdData = calculateMACDForChart(chartData, 12, 26, 9);
    const analytics = buildChartAnalytics(chartData, ma20Data, ma50Data);

    return NextResponse.json({ 
      ticker,
      data: chartData,
      ma20: ma20Data,
      ma50: ma50Data,
      ma200: ma200Data,
      bollinger: bollingerData,
      rsi: rsiData,
      macd: macdData,
      analytics
    });
  } catch (error) {
    console.error(`Chart API Error [${ticker}] Yahoo fetch failed:`, error?.message || error);

    try {
      const dbTicker = ticker.includes('.JK') ? ticker.replace('.JK', '') : ticker;
      const dbRow = await prisma.stockData.findUnique({
        where: { ticker: dbTicker },
        select: { historicalRaw: true, technicals: true }
      });

      let chartData = [];
      if (dbRow?.historicalRaw) {
        const parsed = JSON.parse(dbRow.historicalRaw);
        chartData = normalizeChartRows(parsed);
      }

      if (chartData.length === 0 && dbRow?.technicals) {
        const parsedTech = JSON.parse(dbRow.technicals);
        chartData = buildChartFromTechnicals(parsedTech);
      }

      if (chartData.length === 0) {
        return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
      }

      const ma20Data = calculateMAForChart(chartData, 20);
      const ma50Data = calculateMAForChart(chartData, 50);
      const ma200Data = calculateMAForChart(chartData, 200);
      const bollingerData = calculateBollingerForChart(chartData, 20, 2);
      const rsiData = calculateRSIForChart(chartData, 14);
      const macdData = calculateMACDForChart(chartData, 12, 26, 9);
      const analytics = buildChartAnalytics(chartData, ma20Data, ma50Data);

      return NextResponse.json({
        ticker,
        data: chartData,
        ma20: ma20Data,
        ma50: ma50Data,
        ma200: ma200Data,
        bollinger: bollingerData,
        rsi: rsiData,
        macd: macdData,
        analytics,
        source: 'database-fallback'
      });
    } catch (fallbackError) {
      console.error(`Chart API Error [${ticker}] DB fallback failed:`, fallbackError?.message || fallbackError);
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }
  }
}

function normalizeChartRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(row => row?.date && Number.isFinite(row?.open) && Number.isFinite(row?.high) && Number.isFinite(row?.low) && Number.isFinite(row?.close))
    .map(row => ({
      time: new Date(row.date).toISOString().split('T')[0],
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      value: Number(row.volume || 0)
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function buildChartFromTechnicals(technicals) {
  const prices = Array.isArray(technicals?.prices) ? technicals.prices : [];
  const volumes = Array.isArray(technicals?.volumes) ? technicals.volumes : [];
  if (prices.length === 0) return [];

  const today = new Date();
  const rows = [];
  for (let i = 0; i < prices.length; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (prices.length - i));
    const close = Number(prices[i]);
    const open = i > 0 ? Number(prices[i - 1]) : close;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    rows.push({
      time: d.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      value: Number(volumes[i] || 0)
    });
  }
  return rows;
}

function calculateMAForChart(chartData, period) {
  const maData = [];
  for (let i = 0; i < chartData.length; i++) {
    if (i < period - 1) continue; // Not enough data for MA yet
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += chartData[i - j].close;
    }
    
    maData.push({
      time: chartData[i].time,
      value: sum / period
    });
  }
  return maData;
}

function buildChartAnalytics(chartData, ma20Data, ma50Data) {
  if (!Array.isArray(chartData) || chartData.length === 0) {
    return {
      support: null,
      resistance: null,
      supportZone: { low: null, high: null },
      resistanceZone: { low: null, high: null },
      trend: { direction: 'sideways', label: 'Sideways', confidence: 0, slope20d: 0 },
      bounds: { lower: null, upper: null, rangeLow: null, rangeHigh: null },
      trendBoxes: [],
    };
  }

  const last = chartData[chartData.length - 1];
  const recent20 = chartData.slice(-20);
  const recent60 = chartData.slice(-60);
  const support = round2(Math.min(...recent20.map(d => d.low)));
  const resistance = round2(Math.max(...recent20.map(d => d.high)));
  const rangeLow = round2(Math.min(...recent60.map(d => d.low)));
  const rangeHigh = round2(Math.max(...recent60.map(d => d.high)));

  const ma20Last = ma20Data.length > 0 ? ma20Data[ma20Data.length - 1].value : last.close;
  const ma50Last = ma50Data.length > 0 ? ma50Data[ma50Data.length - 1].value : last.close;
  const ma20Prev = ma20Data.length > 6 ? ma20Data[ma20Data.length - 6].value : ma20Last;
  const slope20 = ma20Prev > 0 ? ((ma20Last - ma20Prev) / ma20Prev) * 100 : 0;

  const atr14 = calculateATR(chartData, 14);
  const band = atr14 > 0 ? atr14 * 1.5 : Math.max(last.close * 0.03, 1);
  const lower = round2(Math.max(0, last.close - band));
  const upper = round2(last.close + band);
  const zoneHalfWidth = atr14 > 0 ? Math.max(atr14 * 0.35, last.close * 0.003) : Math.max(last.close * 0.005, 1);
  const supportZone = {
    low: round2(Math.max(0, support - zoneHalfWidth)),
    high: round2(support + zoneHalfWidth),
  };
  const resistanceZone = {
    low: round2(Math.max(0, resistance - zoneHalfWidth)),
    high: round2(resistance + zoneHalfWidth),
  };

  const maAlignedUp = ma20Last > ma50Last;
  const maAlignedDown = ma20Last < ma50Last;
  const priceAboveMa20 = last.close > ma20Last;
  const priceBelowMa20 = last.close < ma20Last;

  let direction = 'sideways';
  if (maAlignedUp && slope20 > 0.4 && priceAboveMa20) direction = 'up';
  else if (maAlignedDown && slope20 < -0.4 && priceBelowMa20) direction = 'down';

  const confidence = computeTrendConfidence({
    direction,
    ma20Last,
    ma50Last,
    lastClose: last.close,
    slope20,
    support,
    resistance,
  });

  return {
    support,
    resistance,
    supportZone,
    resistanceZone,
    trend: {
      direction,
      label: direction === 'up' ? 'Naik' : direction === 'down' ? 'Turun' : 'Sideways',
      confidence,
      slope20d: round2(slope20),
    },
    bounds: {
      lower,
      upper,
      rangeLow,
      rangeHigh,
    },
    trendBoxes: buildTrendBoxes(chartData),
  };
}

function calculateATR(chartData, period = 14) {
  if (!Array.isArray(chartData) || chartData.length < period + 1) return 0;
  let trSum = 0;
  for (let i = chartData.length - period; i < chartData.length; i++) {
    const high = chartData[i].high;
    const low = chartData[i].low;
    const prevClose = chartData[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

function computeTrendConfidence({ direction, ma20Last, ma50Last, lastClose, slope20, support, resistance }) {
  let score = 50;
  const maGapPct = ma50Last > 0 ? Math.abs((ma20Last - ma50Last) / ma50Last) * 100 : 0;
  score += Math.min(20, maGapPct * 2);
  score += Math.min(15, Math.abs(slope20) * 2);
  if (direction === 'up' && lastClose > resistance * 0.98) score += 10;
  if (direction === 'down' && lastClose < support * 1.02) score += 10;
  if (direction === 'sideways') score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function buildTrendBoxes(chartData) {
  if (!Array.isArray(chartData) || chartData.length < 55) return [];

  const boxes = [];
  for (let i = 55; i < chartData.length; i += 3) {
    const close = chartData[i].close;
    const ma20 = averageClose(chartData, i, 20);
    const ma50 = averageClose(chartData, i, 50);
    const prev20 = averageClose(chartData, i - 5, 20);
    const slope20 = prev20 > 0 ? ((ma20 - prev20) / prev20) * 100 : 0;

    let direction = 'sideways';
    if (ma20 > ma50 && slope20 > 0.2 && close > ma20) direction = 'up';
    else if (ma20 < ma50 && slope20 < -0.2 && close < ma20) direction = 'down';

    boxes.push({
      time: chartData[i].time,
      direction,
    });
  }

  return boxes;
}

function averageClose(chartData, endIndex, period) {
  if (endIndex < period - 1) return chartData[endIndex]?.close || 0;
  let sum = 0;
  for (let j = 0; j < period; j++) {
    sum += chartData[endIndex - j].close;
  }
  return sum / period;
}

function calculateBollingerForChart(chartData, period = 20, multiplier = 2) {
  if (!Array.isArray(chartData) || chartData.length < period) {
    return { upper: [], middle: [], lower: [] };
  }
  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = 0; i < chartData.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += chartData[i - j].close;
    }
    const mid = sum / period;
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      sumSq += Math.pow(chartData[i - j].close - mid, 2);
    }
    const stdDev = Math.sqrt(sumSq / period);
    const up = mid + stdDev * multiplier;
    const low = mid - stdDev * multiplier;
    const time = chartData[i].time;

    upper.push({ time, value: Math.round(up * 100) / 100 });
    middle.push({ time, value: Math.round(mid * 100) / 100 });
    lower.push({ time, value: Math.round(low * 100) / 100 });
  }

  return { upper, middle, lower };
}

function calculateRSIForChart(chartData, period = 14) {
  if (!Array.isArray(chartData) || chartData.length <= period) return [];
  const rsiData = [];

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = chartData[i].close - chartData[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  rsiData.push({ time: chartData[period].time, value: Math.round(rsi * 10) / 10 });

  for (let i = period + 1; i < chartData.length; i++) {
    const diff = chartData[i].close - chartData[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsiData.push({ time: chartData[i].time, value: Math.round(rsi * 10) / 10 });
  }

  return rsiData;
}

function calculateMACDForChart(chartData, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(chartData) || chartData.length <= slowPeriod + signalPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const fastK = 2 / (fastPeriod + 1);
  const slowK = 2 / (slowPeriod + 1);
  const sigK = 2 / (signalPeriod + 1);

  let fastEma = chartData.slice(0, fastPeriod).reduce((acc, d) => acc + d.close, 0) / fastPeriod;
  for (let i = fastPeriod; i < slowPeriod; i++) {
    fastEma = chartData[i].close * fastK + fastEma * (1 - fastK);
  }

  let slowEma = chartData.slice(0, slowPeriod).reduce((acc, d) => acc + d.close, 0) / slowPeriod;

  const macdValues = [];
  for (let i = slowPeriod; i < chartData.length; i++) {
    fastEma = chartData[i].close * fastK + fastEma * (1 - fastK);
    slowEma = chartData[i].close * slowK + slowEma * (1 - slowK);
    macdValues.push({
      time: chartData[i].time,
      macd: fastEma - slowEma
    });
  }

  if (macdValues.length < signalPeriod) return { macd: [], signal: [], histogram: [] };

  let sigEma = macdValues.slice(0, signalPeriod).reduce((acc, d) => acc + d.macd, 0) / signalPeriod;

  const macdSeries = [];
  const signalSeries = [];
  const histSeries = [];

  for (let i = signalPeriod - 1; i < macdValues.length; i++) {
    if (i >= signalPeriod) {
      sigEma = macdValues[i].macd * sigK + sigEma * (1 - sigK);
    }
    const mVal = Math.round(macdValues[i].macd * 100) / 100;
    const sVal = Math.round(sigEma * 100) / 100;
    const hVal = Math.round((mVal - sVal) * 100) / 100;
    const time = macdValues[i].time;

    macdSeries.push({ time, value: mVal });
    signalSeries.push({ time, value: sVal });
    histSeries.push({
      time,
      value: hVal,
      color: hVal >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
    });
  }

  return { macd: macdSeries, signal: signalSeries, histogram: histSeries };
}
