/**
 * Database Provider — Reads pre-synced stock data from the local MySQL DB.
 *
 * This is the primary data provider (DATA_PROVIDER=database).
 * Data is populated and maintained by the syncService + worker.
 */
import { DataProvider } from './DataProvider.js';
import { prisma } from '../prisma.js';
import { getSectorByTicker, normalizeSectorName, isSyariahStock } from '../sectorUniverse.js';
import { calculateVolumeMA } from '../indicators.js';
import { calculateRawDividendYield } from '../scoring/dividend.js';
import { getExchangeRateSync } from '../currencyService.js';
import { getBandarmologiVerdict } from '../scoring/smartMoney.js';

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
          isDelisted: false,
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
          isDelisted: false,
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
      const dbStocks = await prisma.stockData.findMany({
        where: { isDelisted: false }
      });
      console.log(`[DatabaseProvider] Found ${dbStocks.length} total active rows in DB.`);

      const MIN_TURNOVER = 1_000_000_000; // 1 Miliar Rupiah (Batas aman likuiditas minimum)
      
      const filtered = dbStocks.filter(s => {
        if (s.ticker === '^JKSE') return false; // Exclude index
        const turnover = Number(s.avgVolume3mo || 0) * Number(s.price || 0);
        const meetsLiquidity = turnover >= MIN_TURNOVER || (Number(s.volume || 0) * Number(s.price || 0)) >= MIN_TURNOVER;
        const hasPrice = s.price > 0;
        return meetsLiquidity && hasPrice;
      });

      console.log(`[DatabaseProvider] After liquidity filter (Turnover > 1M): ${filtered.length}`);

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
        let shareholders = [];
        let ownership = null;
        let insiderTrades = null;
        let dividendHistory = null;
        let kseiLatest = null;
        let kseiHistory = [];
        try {
          fundamentals = s.fundamentals ? JSON.parse(s.fundamentals) : {};
          technicals = s.technicals ? JSON.parse(s.technicals) : {};
          shareholders = s.shareholders ? JSON.parse(s.shareholders) : [];
          ownership = s.ownership ? JSON.parse(s.ownership) : null;
          insiderTrades = s.insiderTrades ? JSON.parse(s.insiderTrades) : null;
          dividendHistory = s.dividendHistory ? JSON.parse(s.dividendHistory) : null;
          kseiLatest = s.kseiLatest ? JSON.parse(s.kseiLatest) : null;
          kseiHistory = s.kseiHistory ? JSON.parse(s.kseiHistory) : [];
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
        
        // Accurate market cap calculation from KSEI Listed Shares
        const sharesOutstanding = s.sharesOutstanding ? Number(s.sharesOutstanding) : (kseiLatest?.secNum ?? fundamentals.sharesOutstanding ?? null);
        const resolvedMarketCap = (Number(s.price || 0) > 0 && sharesOutstanding > 0)
          ? (Number(s.price) * sharesOutstanding)
          : (fundamentals.marketCap ?? null);

        // avgDailyTurnover = avgVolume3mo * current price
        const avgDailyTurnover = Number(s.avgVolume3mo || 0) * Number(s.price || 0);
        const dailyTurnover = Number(s.volume || 0) * Number(s.price || 0);

        // Smart Money Quantitative Calculation
        let turnoverSpikeRatio = 1;
        if (avgDailyTurnover > 0) {
          turnoverSpikeRatio = dailyTurnover / avgDailyTurnover;
        }
        
        const priceChange = s.changePercent ?? 0;
        
        // --- Integrasi Data KSEI & Insider ---
        let retailChangePct = 0;
        if (kseiLatest && Number.isFinite(kseiLatest.deltaRetailPct)) {
          retailChangePct = kseiLatest.deltaRetailPct;
        } else if (shareholders && shareholders.length > 0) {
          retailChangePct = shareholders[0].changePct || 0;
        }
        
        const hasRecentInsider = insiderTrades && insiderTrades.length > 0;

        // Check for Dividend Trap first
        let isDividendTrap = false;
        if (Array.isArray(dividendHistory) && dividendHistory.length > 0) {
          const now = new Date();
          for (const div of dividendHistory) {
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

        // Unified Bandarmologi Verdict
        const verdictObj = getBandarmologiVerdict({
          bfi: kseiLatest?.bfi ?? 0,
          deltaSmartMoney: kseiLatest?.deltaSmartMoney ?? 0,
          deltaRetail: kseiLatest?.deltaRetail ?? 0,
          deltaForeign: kseiLatest?.deltaForeign ?? 0,
          priceChange,
          turnoverSpikeRatio,
          isDividendTrap,
          retailPercent: kseiLatest?.retailPercent ?? 0
        });

        const bandarmologiStatus = verdictObj.status;
        const bandarmologiBadge = verdictObj.badge;

        const smartMoney = {
          turnoverSpikeRatio: Number(turnoverSpikeRatio.toFixed(2)),
          status: bandarmologiStatus,
          badge: bandarmologiBadge,
          bfi: kseiLatest?.bfi ?? 0,
          deltaRetail: kseiLatest?.deltaRetail ?? 0,
          deltaSmartMoney: kseiLatest?.deltaSmartMoney ?? 0,
          deltaForeign: kseiLatest?.deltaForeign ?? 0,
          verdict: verdictObj
        };

        let hasStrongController = false;
        let retailOwnership = kseiLatest?.retailPercent ?? 0;
        let isHighRetail = retailOwnership > 50;

        if (kseiLatest?.controllerPercent != null) {
          hasStrongController = kseiLatest.controllerPercent > 50;
        } else if (ownership && Array.isArray(ownership.shareholders)) {
          let legacyRetail = 0;
          ownership.shareholders.forEach(p => {
            const isMasyarakat = p.Nama?.toLowerCase().includes('masyarakat') || p.Kategori?.toLowerCase().includes('masyarakat');
            if (isMasyarakat) {
              let rawStr = String(p.Persentase || '0').replace('%', '').trim();
              legacyRetail += Number(rawStr);
            } else {
              let rawStr = String(p.Persentase || '0').replace('%', '').trim();
              if (Number(rawStr) > 50) {
                hasStrongController = true;
              }
            }
          });
          if (retailOwnership === 0) retailOwnership = legacyRetail;
          isHighRetail = retailOwnership > 50;
        }

        const resolvedSector = normalizeSectorName(s.sector || '') || getSectorByTicker(s.ticker);
        const isSyariah = isSyariahStock(s.ticker, resolvedSector);

        return {
          ticker: s.ticker,
          name: s.name,
          sector: resolvedSector === 'INDEX' ? 'General' : resolvedSector,
          subSector: s.subSector || null,
          price: s.price,
          isSyariah,
          hasStrongController,
          isHighRetail,
          retailOwnership,
          changePercent: priceChange,
          isDividendTrap: bandarmologiStatus === "⚠️ Awas Dividend Trap!",
          kseiLatest,
          kseiHistory,
          sharesOutstanding,
          marketCap: resolvedMarketCap,
          fundamentals: {
            marketCap: resolvedMarketCap,
            sharesOutstanding,
            roe: fundamentals.roe ?? null,
            der: fundamentals.der ?? null,
            netProfit: fundamentals.netProfit ?? null,
            per: fundamentals.per ?? null,
            pbv: (fundamentals.pbv && fundamentals.pbv > 500) ? Number((fundamentals.pbv / getExchangeRateSync('USD')).toFixed(2)) : (fundamentals.pbv ?? null),
            dividendYield: calculateRawDividendYield({
              price: Number(s.price || 0),
              dividendHistory,
              fundamentals: {
                ...fundamentals,
                marketCap: resolvedMarketCap,
              }
            }),
            payoutRatio: fundamentals.payoutRatio ?? 0,
            dividendStreakYears: fundamentals.dividendStreakYears ?? 0,
            yahooDividendHistory: fundamentals.yahooDividendHistory ?? null,
            revenueGrowth: fundamentals.revenueGrowth ?? null,
            cash: fundamentals.cash ?? 0,
            currentRatio: fundamentals.currentRatio ?? null,
            freeCashflow: fundamentals.freeCashflow ?? null
          },
          technicals: normalizedTechnicals,
          brokerData,
          shareholders,
          ownership,
          insiderTrades,
          dividendHistory,
          smartMoney,
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
