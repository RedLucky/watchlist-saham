import { NextResponse } from 'next/server';
import { getStyleConfig } from '@/lib/modes';
import { evaluateStyleSignal } from '@/lib/signals/styleSignal';
import yf from 'yahoo-finance2';
const YFClass = yf.default || yf;
const yahooFinance = typeof YFClass === 'function' ? new YFClass() : YFClass;
try { yahooFinance.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']); } catch(e){}

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const styleRaw = searchParams.get('style') || 'swing';

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const style = getStyleConfig(styleRaw);
    const targetTicker = ticker.includes('.JK') ? ticker : `${ticker}.JK`;

    const period2 = new Date();
    const period1 = new Date();
    // Fetch 1 year of data for backtesting + extra 50 days buffer for initial MAs
    period1.setFullYear(period1.getFullYear() - 1);
    period1.setDate(period1.getDate() - 50);

    const strPeriod1 = period1.toISOString().split('T')[0];
    const strPeriod2 = period2.toISOString().split('T')[0];

    const historical = await yahooFinance.historical(targetTicker, {
      period1: strPeriod1,
      period2: strPeriod2,
      interval: '1d'
    });

    const bars = normalizeBars(historical);
    const shortMAPeriod = Number(style?.indicators?.maShort || 20);
    const longMAPeriod = Number(style?.indicators?.maLong || 50);
    const rsiPeriod = Number(style?.indicators?.rsiPeriod || 14);
    const warmup = Math.max(longMAPeriod, rsiPeriod + 1, 20);

    if (bars.length < warmup + 5) {
      return NextResponse.json({ error: 'Not enough historical data' }, { status: 400 });
    }

    // Engine: Long-only backtest with next-day open entry, TP/SL, and realistic fee model.
    const trades = [];
    let currentPosition = null;
    const initialCapital = 10000000; // start with 10jt fiktif
    let currentCapital = initialCapital;
    const feePerSide = 0.0015; // 0.15% entry + 0.15% exit
    const styleRules = getBacktestRules(style.name);

    let i = warmup;
    while (i < bars.length - 1) {
      const today = bars[i];
      const yesterday = bars[i - 1];

      const shortMA = calculateMA(bars, i, shortMAPeriod);
      const longMA = calculateMA(bars, i, longMAPeriod);
      const rsi = calculateRSI(bars, i, rsiPeriod);
      const avgVol20 = calculateAvgVolume(bars, i, 20);

      if (!currentPosition) {
        const recent20 = bars.slice(Math.max(0, i - 19), i + 1);
        const resistance20 = recent20.length > 0
          ? Math.max(...recent20.map((b) => Number(b.high || 0)))
          : today.high;
        const volumeRatio = avgVol20 > 0 ? Number(today.volume || 0) / avgVol20 : 1;
        const signal = evaluateStyleSignal(style.name, {
          price: today.close,
          shortMA,
          longMA,
          ma20: calculateMA(bars, i, 20),
          rsi,
          volumeRatio,
          volSpike: Number(style?.indicators?.volSpike || 1.1),
          resistance: resistance20,
          isBullishCandle: today.close >= today.open,
          yesterdayHigh: yesterday.high,
        });

        if (signal.actionable && i + 1 < bars.length) {
          // No look-ahead: execute at next candle open.
          const entryIndex = i + 1;
          const entryBar = bars[entryIndex];
          const entryPriceRaw = entryBar.open;
          const tp = entryPriceRaw * (1 + Number(style.exit.tp || 0) / 100);
          const sl = entryPriceRaw * (1 - Number(style.exit.sl || 0) / 100);
          currentPosition = {
            entryDate: entryBar.time,
            entryIndex,
            entryPriceRaw,
            entryPriceEffective: entryPriceRaw * (1 + feePerSide),
            tp,
            sl,
            maxHoldDays: styleRules.maxHoldDays,
            setup: signal.setup,
          };
          i = entryIndex;
          continue;
        }
      } else {
        const daysHeld = i - currentPosition.entryIndex + 1;
        const hitSL = today.low <= currentPosition.sl;
        const hitTP = today.high >= currentPosition.tp;

        let exitPriceRaw = null;
        let reason = null;

        // Conservative assumption for same-candle TP and SL touch.
        if (hitSL && hitTP) {
          exitPriceRaw = currentPosition.sl;
          reason = 'SL&TP';
        } else if (hitSL) {
          exitPriceRaw = currentPosition.sl;
          reason = 'SL';
        } else if (hitTP) {
          exitPriceRaw = currentPosition.tp;
          reason = 'TP';
        } else if (daysHeld >= currentPosition.maxHoldDays) {
          exitPriceRaw = today.close;
          reason = 'TIME';
        }

        if (exitPriceRaw !== null) {
          const exitPriceEffective = exitPriceRaw * (1 - feePerSide);
          const pnlPercent = currentPosition.entryPriceEffective > 0
            ? ((exitPriceEffective - currentPosition.entryPriceEffective) / currentPosition.entryPriceEffective) * 100
            : 0;
          currentCapital *= (1 + pnlPercent / 100);

          const type = pnlPercent > 0.05 ? 'WIN' : pnlPercent < -0.05 ? 'LOSS' : 'FLAT';

          trades.push({
            type,
            reason,
            setup: currentPosition.setup,
            entryDate: currentPosition.entryDate,
            exitDate: today.time,
            entryPrice: roundPrice(currentPosition.entryPriceRaw),
            exitPrice: roundPrice(exitPriceRaw),
            pnlPercent: round2(pnlPercent),
            daysHeld,
          });

          currentPosition = null;
        }
      }

      i += 1;
    }

    // Force close on last bar if still open.
    if (currentPosition) {
      const last = bars[bars.length - 1];
      const exitPriceRaw = last.close;
      const exitPriceEffective = exitPriceRaw * (1 - feePerSide);
      const pnlPercent = currentPosition.entryPriceEffective > 0
        ? ((exitPriceEffective - currentPosition.entryPriceEffective) / currentPosition.entryPriceEffective) * 100
        : 0;
      currentCapital *= (1 + pnlPercent / 100);
      const type = pnlPercent > 0.05 ? 'WIN' : pnlPercent < -0.05 ? 'LOSS' : 'FLAT';

      trades.push({
        type,
        reason: 'EOD',
        setup: currentPosition.setup,
        entryDate: currentPosition.entryDate,
        exitDate: last.time,
        entryPrice: roundPrice(currentPosition.entryPriceRaw),
        exitPrice: roundPrice(exitPriceRaw),
        pnlPercent: round2(pnlPercent),
        daysHeld: bars.length - currentPosition.entryIndex,
      });
    }

    const wins = trades.filter(t => t.type === 'WIN').length;
    const losses = trades.filter(t => t.type === 'LOSS').length;
    const flat = trades.filter(t => t.type === 'FLAT').length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const netReturn = ((currentCapital - initialCapital) / initialCapital) * 100;
    const avgPnl = totalTrades > 0
      ? trades.reduce((sum, t) => sum + Number(t.pnlPercent || 0), 0) / totalTrades
      : 0;
    const avgHoldDays = totalTrades > 0
      ? trades.reduce((sum, t) => sum + Number(t.daysHeld || 0), 0) / totalTrades
      : 0;

    return NextResponse.json({
      ticker,
      style: style.label,
      summary: {
        totalTrades,
        wins,
        losses,
        flat,
        winRate,
        netReturn: round2(netReturn),
        avgPnl: round2(avgPnl),
        avgHoldDays: round2(avgHoldDays),
        finalCapital: roundPrice(currentCapital),
      },
      config: {
        maShort: shortMAPeriod,
        maLong: longMAPeriod,
        rsiPeriod,
        tpPercent: Number(style.exit.tp || 0),
        slPercent: Number(style.exit.sl || 0),
        feePerSidePercent: feePerSide * 100,
      },
      trades: trades.sort((a,b) => new Date(b.entryDate) - new Date(a.entryDate)),
    });

  } catch (error) {
    console.error("Backtest API Error:", error);
    return NextResponse.json({ error: 'Failed to run backtest' }, { status: 500 });
  }
}

function normalizeBars(historical) {
  if (!Array.isArray(historical)) return [];
  return historical
    .filter((d) =>
      d?.date &&
      Number.isFinite(Number(d.open)) &&
      Number.isFinite(Number(d.high)) &&
      Number.isFinite(Number(d.low)) &&
      Number.isFinite(Number(d.close))
    )
    .map((d) => ({
      time: new Date(d.date).toISOString().split('T')[0],
      open: Number(d.open),
      high: Number(d.high),
      low: Number(d.low),
      close: Number(d.close),
      volume: Number(d.volume || 0),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getBacktestRules(styleName) {
  if (styleName === 'scalping') return { maxHoldDays: 3 };
  if (styleName === 'daily') return { maxHoldDays: 5 };
  return { maxHoldDays: 15 };
}

function calculateMA(data, currentIndex, period) {
  if (currentIndex < period - 1) return NaN;
  let sum = 0;
  for (let j = 0; j < period; j++) {
    sum += data[currentIndex - j].close;
  }
  return sum / period;
}

function calculateAvgVolume(data, currentIndex, period) {
  if (currentIndex < period - 1) return 0;
  let sum = 0;
  for (let j = 0; j < period; j++) {
    sum += Number(data[currentIndex - j].volume || 0);
  }
  return sum / period;
}

function calculateRSI(data, currentIndex, period) {
  if (currentIndex < period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
    const diff = Number(data[i].close || 0) - Number(data[i - 1].close || 0);
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function roundPrice(n) {
  return Math.round(Number(n) * 100) / 100;
}
