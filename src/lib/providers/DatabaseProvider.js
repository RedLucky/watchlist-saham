/**
 * Database Provider — Reads pre-synced stock data from the local MySQL DB.
 *
 * This is the primary data provider (DATA_PROVIDER=database).
 * Data is populated and maintained by the syncService + worker.
 */
import { DataProvider } from './DataProvider';
import { prisma } from '../prisma';
import { getSectorByTicker, normalizeSectorName, isSyariahStock } from '../sectorUniverse';
import { calculateVolumeMA } from '../indicators';

export class DatabaseProvider extends DataProvider {
  async getMarketData() {
    try {
      const FLAT_THRESHOLD_PCT = 0.05;
      // 1. Fetch IHSG Ticker (^JKSE)
      const ihsg = await prisma.stockData.findUnique({
        where: { ticker: '^JKSE' }
      });

      // 2. Calculate real Advance/Decline from all other stocks
      const allStocks = await prisma.stockData.findMany({
        where: {
          NOT: { ticker: '^JKSE' },
          price: { gt: 0 }
        },
        select: { changePercent: true }
      });

      const safeChanges = allStocks
        .map((s) => Number(s.changePercent))
        .filter((v) => Number.isFinite(v));

      const advance = safeChanges.filter((v) => v > FLAT_THRESHOLD_PCT).length;
      const decline = safeChanges.filter((v) => v < -FLAT_THRESHOLD_PCT).length;
      const unchanged = safeChanges.length - advance - decline;
      const ihsgChange = Number.isFinite(Number(ihsg?.changePercent)) ? Number(ihsg.changePercent) : 0;
      const indexTrend = ihsgChange > FLAT_THRESHOLD_PCT ? 'up' : ihsgChange < -FLAT_THRESHOLD_PCT ? 'down' : 'sideways';
      const volumeVsAvg = Number(ihsg?.avgVolume3mo || 0) > 0
        ? Number(ihsg?.volume || 0) / Number(ihsg.avgVolume3mo)
        : 1;

      return {
        indexName: 'IHSG',
        indexValue: ihsg?.price || 7200,
        indexChange: ihsgChange,
        indexTrend,
        volumeVsAvg,
        advanceDecline: { advance, decline, unchanged },
      };
    } catch (e) {
      console.error("DatabaseProvider Market Error:", e);
      return {
        indexName: 'IHSG',
        indexValue: 7000,
        indexChange: 0,
        indexTrend: 'sideways',
        volumeVsAvg: 1,
        advanceDecline: { advance: 1, decline: 1, unchanged: 1 }
      };
    }
  }

  async getSectorPerformance() {
    try {
      const stocks = await prisma.stockData.findMany({
        where: {
          NOT: { ticker: '^JKSE' },
          price: { gt: 0 },
          sector: { not: null }
        },
        select: {
          ticker: true,
          sector: true,
          changePercent: true,
          volume: true,
          technicals: true
        }
      });

      // Calculate global average volume for relative comparison
      const volumes = stocks
        .map(s => Number(s.volume || 0))
        .filter(v => Number.isFinite(v) && v > 0);
      const globalAvgVolume = volumes.length > 0
        ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length
        : 1;

      const sectorMap = {};
      stocks.forEach(s => {
        const rawSector = s.sector || '';
        const name = normalizeSectorName(rawSector) || getSectorByTicker(s.ticker);
        if (name === 'INDEX' || name === 'General') return; // Skip index & unmapped

        if (!sectorMap[name]) {
          sectorMap[name] = { totalChange: 0, count: 0, winners: 0, totalVolume: 0 };
        }

        // Try to compute real 5-day return from historical prices
        let return5d = Number(s.changePercent || 0);
        try {
          if (s.technicals) {
            const parsed = JSON.parse(s.technicals);
            const prices = Array.isArray(parsed?.prices) ? parsed.prices : [];
            if (prices.length >= 6) {
              const current = Number(prices[prices.length - 1]);
              const prev5 = Number(prices[prices.length - 6]);
              if (Number.isFinite(current) && Number.isFinite(prev5) && prev5 > 0) {
                return5d = ((current - prev5) / prev5) * 100;
              }
            }
          }
        } catch (_err) { /* ignore JSON parse errors */ }

        sectorMap[name].totalChange += return5d;
        sectorMap[name].count += 1;
        if (return5d > 0) sectorMap[name].winners += 1;
        sectorMap[name].totalVolume += Number(s.volume || 0);
      });

      const result = {};
      Object.keys(sectorMap).forEach(name => {
        const data = sectorMap[name];
        if (data.count === 0) return;
        const avgSectorVolume = data.totalVolume / data.count;
        const volumeGrowth = globalAvgVolume > 0 ? avgSectorVolume / globalAvgVolume : 1;
        result[name] = {
          return5d: Number((data.totalChange / data.count).toFixed(2)),
          volumeGrowth: Number(volumeGrowth.toFixed(2)),
          winnersRatio: data.winners / data.count,
          stockCount: data.count,
        };
      });

      if (Object.keys(result).length === 0) {
        return {
          General: { return5d: 0, volumeGrowth: 1.0, winnersRatio: 0.5, stockCount: 0 }
        };
      }

      return result;
    } catch (e) {
      console.error("DatabaseProvider Sector Error:", e);
      return {};
    }
  }

  async getStocks() {
    try {
      console.log(`[DatabaseProvider] Querying StockData...`);
      const dbStocks = await prisma.stockData.findMany();
      console.log(`[DatabaseProvider] Found ${dbStocks.length} total rows in DB.`);

      const MIN_VOL = 30000000;
      
      const filtered = dbStocks.filter(s => {
        if (s.ticker === '^JKSE') return false; // Exclude index
        const meetsVol = Number(s.avgVolume3mo || 0) >= MIN_VOL;
        const hasPrice = s.price > 0;
        return meetsVol && hasPrice;
      });

      console.log(`[DatabaseProvider] After liquidity filter: ${filtered.length}`);

      // Calculate daily turnover for ranking
      const turnoverByTicker = {};
      filtered.forEach((s) => {
        turnoverByTicker[s.ticker] = Number(s.volume || 0) * Number(s.price || 0);
      });
      const sortedByTurnover = [...filtered].sort((a, b) =>
        (turnoverByTicker[b.ticker] || 0) - (turnoverByTicker[a.ticker] || 0)
      );
      const freqRankMap = {};
      sortedByTurnover.forEach((s, idx) => {
        freqRankMap[s.ticker] = idx + 1;
      });
      
      return filtered.map(s => {
        let fundamentals = {};
        let technicals = {};
        
        try {
          fundamentals = s.fundamentals ? JSON.parse(s.fundamentals) : {};
          technicals = s.technicals ? JSON.parse(s.technicals) : {};
        } catch (e) {
          console.error(`Error parsing JSON for ${s.ticker}:`, e);
        }
        
        const normalizedTechnicals = {
          prices: technicals.prices ?? [s.price],
          volumes: technicals.volumes ?? [Number(s.volume || 0)],
          highs: technicals.highs ?? [s.price],
          lows: technicals.lows ?? [s.price],
          ma9: technicals.ma9 ?? s.price,
          ma20: technicals.ma20 ?? s.price,
          ma50: technicals.ma50 ?? s.price,
          ma200: technicals.ma200 ?? s.price,
          rsi7: technicals.rsi7 ?? 50,
          rsi14: technicals.rsi14 ?? 50,
          resistance: technicals.resistance ?? s.price * 1.05,
          support: technicals.support ?? s.price * 0.95,
          atr14: technicals.atr14 ?? 0,
          macd: technicals.macd ?? { macdLine: 0, signalLine: 0, histogram: 0 },
          bollingerBands: technicals.bollingerBands ?? { upper: s.price, middle: s.price, lower: s.price, bandwidth: 0 },
        };

        const brokerData = deriveBrokerData(normalizedTechnicals, Number(s.price || 0));
        
        // avgDailyTurnover = avgVolume3mo * current price (proper "average" metric)
        const avgDailyTurnover = Number(s.avgVolume3mo || 0) * Number(s.price || 0);
        // dailyTurnover = today's volume * price
        const dailyTurnover = Number(s.volume || 0) * Number(s.price || 0);

        const resolvedSector = normalizeSectorName(s.sector || '') || getSectorByTicker(s.ticker);
        const isSyariah = isSyariahStock(s.ticker, resolvedSector);

        return {
          ticker: s.ticker,
          name: s.name,
          sector: resolvedSector === 'INDEX' ? 'General' : resolvedSector,
          price: s.price,
          isSyariah,
          changePercent: s.changePercent ?? 0,
          fundamentals: {
            roe: fundamentals.roe ?? null,
            der: fundamentals.der ?? null,
            netProfit: fundamentals.netProfit ?? null,
            per: fundamentals.per ?? null,
            pbv: fundamentals.pbv ?? null,
            dividendYield: fundamentals.dividendYield ?? 0,
            payoutRatio: fundamentals.payoutRatio ?? 0,
            dividendStreakYears: fundamentals.dividendStreakYears ?? (fundamentals.dividendYield > 0 ? 5 : 0),
            revenueGrowth: fundamentals.revenueGrowth ?? null,
            cash: fundamentals.cash ?? 0
          },
          technicals: normalizedTechnicals,
          brokerData,
          transactionAvg: avgDailyTurnover,
          dailyTurnover,
          status: 'active',
          freqRank: freqRankMap[s.ticker] || 999
        };
      });
    } catch (e) {
      console.error("DatabaseProvider Error:", e);
      return [];
    }
  }
}

/**
 * Derives a heuristic proxy for institutional flow from price/volume data.
 * This is NOT real broker data — it's an approximation.
 */
function deriveBrokerData(technicals, price) {
  const prices = Array.isArray(technicals?.prices) ? technicals.prices : [];
  const volumes = Array.isArray(technicals?.volumes) ? technicals.volumes : [];

  if (prices.length < 6 || volumes.length < 6) {
    return {
      netBuy: [0, 0, 0, 0, 0],
      topBrokers: ['N/A'],
      concentration: 0.4,
    };
  }

  const recentPrices = prices.slice(-6);
  const recentVolumes = volumes.slice(-6);
  const netBuy = [];

  for (let i = 1; i < recentPrices.length; i++) {
    const prev = Number(recentPrices[i - 1] || 0);
    const curr = Number(recentPrices[i] || 0);
    const vol = Number(recentVolumes[i] || 0);
    const deltaPct = prev > 0 ? (curr - prev) / prev : 0;

    // Heuristic proxy: price move aligned with volume converted to notional
    netBuy.push(Math.round(deltaPct * vol * Math.max(price, curr) * 0.02));
  }

  const positiveDays = netBuy.filter((n) => n > 0).length;
  const concentration = Math.min(0.85, Math.max(0.3, 0.35 + (positiveDays / netBuy.length) * 0.4));

  const topBrokers = concentration >= 0.65
    ? ['YP', 'CC', 'PD']
    : concentration >= 0.5
      ? ['CC', 'PD', 'NI']
      : ['NI', 'LG', 'RX'];

  return {
    netBuy,
    topBrokers,
    concentration: Number(concentration.toFixed(2)),
  };
}
