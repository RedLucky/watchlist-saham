import { DataProvider } from './DataProvider';
import yf from 'yahoo-finance2';
import { getSectorByTicker } from '../sectorUniverse';

let yahooFinance = yf;
if (yf.default && typeof yf.default === 'object' && yf.default.quote) {
  yahooFinance = yf.default;
} else if (yf.default && typeof yf.default === 'function') {
  try { yahooFinance = new yf.default(); } catch(e) { yahooFinance = yf.default; }
} else if (typeof yf === 'function') {
  try { yahooFinance = new yf(); } catch(e) { yahooFinance = yf; }
}

try {
  yahooFinance.suppressNotices(['node-version', 'yahooFinance=v3', 'yahooSurvey', 'ripHistorical', 'quoteSummary-mutilated']);
} catch (e) {}

// Daftar gabungan dari indeks ISSI, Kompas100, LQ45, dan IDX80
const TARGET_TICKERS = [
  'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'BRIS.JK', 'BBTN.JK', 'ARTO.JK', 'PNBN.JK', 'NISP.JK', 'BDMN.JK',
  'TLKM.JK', 'ISAT.JK', 'EXCL.JK', 'TOWR.JK', 'TBIG.JK', 'MTEL.JK', 
  'ASII.JK', 'AUTO.JK', 'SMSM.JK', 'VKTR.JK',
  'UNVR.JK', 'ICBP.JK', 'INDF.JK', 'MYOR.JK', 'AMRT.JK', 'MIDI.JK', 'LPPF.JK', 'MAPA.JK', 'MAPI.JK', 'KLBF.JK', 'SIDO.JK', 'TAPG.JK', 'RALS.JK',
  'ADRO.JK', 'PTBA.JK', 'ITMG.JK', 'UNTR.JK', 'HRUM.JK', 'INCO.JK', 'ANTM.JK', 'MDKA.JK', 'PGEO.JK', 'PTRO.JK', 'MBMA.JK', 'AMMN.JK', 'BUMI.JK', 'ENRG.JK', 'MEDC.JK', 'AKRA.JK', 'CUAN.JK', 'BSSR.JK', 'NCKL.JK',
  'JSMR.JK', 'WIKA.JK', 'PTPP.JK', 'ADHI.JK', 'WSKT.JK', 'CMNP.JK',
  'BSDE.JK', 'CTRA.JK', 'SMRA.JK', 'PWON.JK', 'ASRI.JK', 'PANI.JK',
  'GOTO.JK', 'BUKA.JK', 'WIFI.JK', 'EMTK.JK', 'SCMA.JK', 'RANS.JK',
  'INKP.JK', 'TKIM.JK', 'SMGR.JK', 'INTP.JK', 'BREN.JK', 'BRPT.JK', 'TPIA.JK', 'CPIN.JK', 'JPFA.JK',
  'SMDR.JK', 'TMAS.JK'
];

// Helper Technical Calculation
function calculateMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(prices, period) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i-1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

export class YahooProvider extends DataProvider {
  // Cache to avoid hitting Yahoo too often in dev
  cache = {
    stocks: null,
    market: null,
    lastFetch: 0
  };
  CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  FLAT_THRESHOLD_PCT = 0.05;

  async getMarketData() {
    if (this.cache.market && (Date.now() - this.cache.lastFetch < this.CACHE_TTL)) {
      return this.cache.market;
    }

    try {
      const quote = await yahooFinance.quote('^JKSE');
      
      const stocks = this.cache.stocks || [];
      let advance = 250, decline = 200, unchanged = 150;
      
      if (stocks.length > 0) {
        advance = stocks.filter((s) => Number(s.changePercent || 0) > this.FLAT_THRESHOLD_PCT).length;
        decline = stocks.filter((s) => Number(s.changePercent || 0) < -this.FLAT_THRESHOLD_PCT).length;
        unchanged = stocks.length - advance - decline;
      }

      const indexChange = Number.isFinite(Number(quote.regularMarketChangePercent))
        ? Number(quote.regularMarketChangePercent)
        : 0;
      const indexTrend = indexChange > this.FLAT_THRESHOLD_PCT
        ? 'up'
        : indexChange < -this.FLAT_THRESHOLD_PCT
          ? 'down'
          : 'sideways';

      const marketData = {
        indexName: 'IHSG',
        indexValue: quote.regularMarketPrice || 7000,
        indexChange,
        indexTrend,
        volumeVsAvg: (quote.regularMarketVolume || 1) / (quote.averageDailyVolume10Day || 1),
        advanceDecline: { advance, decline, unchanged },
      };

      this.cache.market = marketData;
      return marketData;
    } catch (e) {
      console.error("YahooProvider Market Error:", e);
      return {
        indexName: 'IHSG',
        indexValue: 0,
        indexChange: 0,
        indexTrend: 'sideways',
        volumeVsAvg: 1,
        advanceDecline: { advance: 1, decline: 1, unchanged: 1 }
      };
    }
  }

  async getSectorPerformance() {
    const stocks = this.cache.stocks || [];
    if (stocks.length === 0) {
      return {};
    }

    const marketAvgVolume = stocks.reduce((sum, s) => {
      const vols = s.technicals?.volumes || [];
      const recent3 = vols.slice(-3);
      if (recent3.length === 0) return sum;
      return sum + (recent3.reduce((a, b) => a + b, 0) / recent3.length);
    }, 0) / Math.max(stocks.length, 1);

    const sectorMap = {};
    stocks.forEach(s => {
      const name = s.sector || 'General';
      if (!sectorMap[name]) {
        sectorMap[name] = { totalReturn5d: 0, totalVolumeRatio: 0, count: 0, winners: 0 };
      }

      let return5d = Number(s.changePercent || 0);
      const prices = s.technicals?.prices || [];
      if (prices.length >= 6) {
        const now = Number(prices[prices.length - 1]);
        const prev5 = Number(prices[prices.length - 6]);
        if (Number.isFinite(now) && Number.isFinite(prev5) && prev5 > 0) {
          return5d = ((now - prev5) / prev5) * 100;
        }
      }

      const vols = s.technicals?.volumes || [];
      const recent3 = vols.slice(-3);
      const stockAvgVol = recent3.length > 0
        ? recent3.reduce((a, b) => a + b, 0) / recent3.length
        : 0;
      const volumeRatio = marketAvgVolume > 0 ? stockAvgVol / marketAvgVolume : 1;

      sectorMap[name].totalReturn5d += return5d;
      sectorMap[name].totalVolumeRatio += volumeRatio;
      sectorMap[name].count += 1;
      if (return5d > 0) sectorMap[name].winners += 1;
    });

    const result = {};
    Object.keys(sectorMap).forEach(name => {
      const data = sectorMap[name];
      result[name] = {
        return5d: Number((data.totalReturn5d / data.count).toFixed(2)),
        volumeGrowth: Number((data.totalVolumeRatio / data.count).toFixed(2)),
        winnersRatio: data.winners / data.count,
        stockCount: data.count,
      };
    });

    return result;
  }

  async getStocks() {
    if (this.cache.stocks && (Date.now() - this.cache.lastFetch < this.CACHE_TTL)) {
      return this.cache.stocks;
    }

    try {
      // TAHAP 1: Filter Likuiditas Massal
      // Mengambil quote awal untuk mengecek averageDailyVolume3Month > 30M
      const validQuoteMap = {};
      
      // Bagi ke dalam chunk kecil agar tidak di-timeout
      const chunkSize = 20;
      for (let i = 0; i < TARGET_TICKERS.length; i += chunkSize) {
        const chunk = TARGET_TICKERS.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (ticker) => {
          try {
            const q = await yahooFinance.quote(ticker);
            // Syarat: Volume rata-rata 3 bulan >= 30,000,000
            if (q && q.averageDailyVolume3Month && q.averageDailyVolume3Month >= 30000000) {
              validQuoteMap[ticker] = q;
            }
          } catch (e) {
            // Abaikan saham yang tidak ditemukan / disuspensi
          }
        }));
      }

      const validTickers = Object.keys(validQuoteMap);
      console.log(`[Liquidity Filter] Dari ${TARGET_TICKERS.length} saham, ${validTickers.length} memiliki rata-rata volume > 30M lot-lembar.`);

      // TAHAP 2: Analisis Mendalam hanya untuk saham yang Lolos Filter
      const stocks = [];
      const period2 = new Date();
      const period1 = new Date();
      period1.setDate(period1.getDate() - 90); // 90 days back for MAs
      
      const strPeriod1 = period1.toISOString().split('T')[0];
      const strPeriod2 = period2.toISOString().split('T')[0];

      for (const ticker of validTickers) {
        try {
          const quote = validQuoteMap[ticker];
          const historical = await yahooFinance.historical(ticker, { 
            period1: strPeriod1, 
            period2: strPeriod2, 
            interval: '1d' 
          });

          if (historical.length === 0) continue;

          const prices = historical.map(h => h.close);
          const volumes = historical.map(h => h.volume);
          const currentPrice = quote.regularMarketPrice;

          const baseTicker = ticker.replace('.JK', '');
          
          stocks.push({
            ticker: baseTicker,
            name: quote.shortName || baseTicker,
            sector: getSectorByTicker(baseTicker),
            price: currentPrice,
            changePercent: Number.isFinite(Number(quote.regularMarketChangePercent))
              ? Number(quote.regularMarketChangePercent)
              : (prices.length > 1 && Number(prices[prices.length - 2]) > 0
                ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
                : 0),
            fundamentals: {
              roe: quote.returnOnEquity !== undefined ? quote.returnOnEquity * 100 : 22,
              der: quote.debtToEquity !== undefined ? quote.debtToEquity / 100 : 0.6,
              netProfit: [1000, 1150, 1400], // Synthesized 15-20% growth
              per: quote.trailingPE || 12,
              pbv: quote.priceToBook || 1.5,
              dividendYield: quote.trailingAnnualDividendYield !== undefined ? quote.trailingAnnualDividendYield * 100 : 4.5,
              payoutRatio: quote.payoutRatio !== undefined ? quote.payoutRatio * 100 : 40,
              revenueGrowth: 12.0, // Synthetic
            },
            technicals: {
              prices,
              volumes,
              ma9: calculateMA(prices, 9),
              ma20: calculateMA(prices, 20),
              ma50: calculateMA(prices, 50),
              rsi7: calculateRSI(prices, 7),
              rsi14: calculateRSI(prices, 14),
              resistance: quote.fiftyTwoWeekHigh || currentPrice * 1.05,
              support: quote.fiftyTwoWeekLow || currentPrice * 0.95,
            },
            brokerData: {
              netBuy: [1e9, 2e9, -5e8, 3e9], // Synthetic, no broker data on Yahoo
              topBrokers: ['YP', 'CC', 'PD'],
              concentration: 0.5,
            },
            transactionAvg: quote.averageDailyVolume10Day * currentPrice || 100000000000,
            status: 'active',
            freqRank: Math.floor(Math.random() * 20) + 1
          });
        } catch (tickerErr) {
          console.error(`Failed fetching historicals for ${ticker}:`, tickerErr);
        }
      }

      this.cache.stocks = stocks;
      this.cache.lastFetch = Date.now();
      return stocks;

    } catch (e) {
      console.error("YahooProvider Stocks Error:", e);
      return [];
    }
  }
}
