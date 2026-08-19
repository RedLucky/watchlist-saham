// Mock data for Indonesian Stock Exchange (IDX)
// Realistic data based on typical IDX blue-chip and mid-cap stocks

function generatePrices(base, days = 60, trend = 'up') {
  const prices = [];
  let price = base * (1 - (days * 0.002));
  for (let i = 0; i < days; i++) {
    const trendFactor = trend === 'up' ? 0.003 : trend === 'down' ? -0.002 : 0.001;
    const noise = (Math.random() - 0.45) * base * 0.015;
    price = price + price * trendFactor + noise;
    prices.push(Math.round(price));
  }
  return prices;
}

function calculateMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return Math.round(slice.reduce((a, b) => a + b, 0) / period);
}

function calculateRSI(prices, period) {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i-1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return Math.round(100 - (100 / (1 + rs)));
}

function generateVolumes(base, days = 60, pattern = 'accumulation') {
  const volumes = [];
  for (let i = 0; i < days; i++) {
    let multiplier = 1;
    if (pattern === 'accumulation') {
      multiplier = 0.7 + (i / days) * 0.8 + Math.random() * 0.3;
    } else if (pattern === 'distribution') {
      multiplier = 1.5 - (i / days) * 0.6 + Math.random() * 0.3;
    } else {
      multiplier = 0.8 + Math.random() * 0.5;
    }
    volumes.push(Math.round(base * multiplier));
  }
  return volumes;
}

function generateNetBuy(days = 10, trend = 'buying') {
  const netBuy = [];
  for (let i = 0; i < days; i++) {
    if (trend === 'buying') {
      netBuy.push(Math.round((Math.random() * 5 + 1) * 1000000000));
    } else if (trend === 'selling') {
      netBuy.push(Math.round((Math.random() * -5 - 1) * 1000000000));
    } else {
      netBuy.push(Math.round((Math.random() - 0.5) * 3000000000));
    }
  }
  return netBuy;
}

function enrichStock(stock, trend = 'up', volPattern = 'accumulation') {
  const prices = generatePrices(stock.price, 60, trend);
  const volumes = generateVolumes(stock.transactionAvg / stock.price, 60, volPattern);
  
  stock.price = prices[prices.length - 1]; // Use the last generated price
  stock.technicals = {
    prices,
    volumes,
    ma9: calculateMA(prices, 9),
    ma20: calculateMA(prices, 20),
    ma50: calculateMA(prices, 50),
    rsi7: calculateRSI(prices, 7),
    rsi14: calculateRSI(prices, 14),
    resistance: stock.price * 1.05,
    support: stock.price * 0.94,
  };
  return stock;
}

export const SECTORS = [
  'Banking', 'Telco', 'Consumer', 'Mining', 'Property',
  'Infrastructure', 'Healthcare', 'Automotive', 'Technology', 'Energy'
];

const rawStocks = [
  // === BANKING ===
  {
    ticker: 'BBCA',
    name: 'Bank Central Asia',
    sector: 'Banking',
    price: 9875,
    fundamentals: { roe: 21.3, der: 0.85, netProfit: [35000, 38000, 41200], per: 25.2, pbv: 4.8, dividendYield: 1.2, payoutRatio: 30, revenueGrowth: 8.5 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'DB', 'MS'], concentration: 0.65 },
    transactionAvg: 850000000000,
    status: 'active',
    freqRank: 1,
  },
  {
    ticker: 'BBRI',
    name: 'Bank Rakyat Indonesia',
    sector: 'Banking',
    price: 5525,
    fundamentals: { roe: 19.8, der: 0.92, netProfit: [42000, 45000, 51000], per: 14.2, pbv: 2.8, dividendYield: 3.8, payoutRatio: 55, revenueGrowth: 7.2 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'JP', 'UB'], concentration: 0.58 },
    transactionAvg: 1200000000000,
    status: 'active',
    freqRank: 2,
  },
  {
    ticker: 'BMRI',
    name: 'Bank Mandiri',
    sector: 'Banking',
    price: 6750,
    fundamentals: { roe: 18.5, der: 0.88, netProfit: [28000, 32000, 36000], per: 11.8, pbv: 2.2, dividendYield: 4.2, payoutRatio: 50, revenueGrowth: 9.1 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['DB', 'GS', 'MS'], concentration: 0.52 },
    transactionAvg: 650000000000,
    status: 'active',
    freqRank: 4,
  },
  {
    ticker: 'BBNI',
    name: 'Bank Negara Indonesia',
    sector: 'Banking',
    price: 5100,
    fundamentals: { roe: 15.2, der: 0.95, netProfit: [15000, 16500, 18800], per: 8.5, pbv: 1.3, dividendYield: 5.1, payoutRatio: 40, revenueGrowth: 6.3 },
    brokerData: { netBuy: generateNetBuy(10, 'mixed'), topBrokers: ['CS', 'JP'], concentration: 0.42 },
    transactionAvg: 350000000000,
    status: 'active',
    freqRank: 7,
  },

  // === TELCO ===
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia',
    sector: 'Telco',
    price: 3850,
    fundamentals: { roe: 22.1, der: 0.72, netProfit: [21000, 22500, 24800], per: 15.3, pbv: 3.4, dividendYield: 4.5, payoutRatio: 70, revenueGrowth: 5.8 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['MS', 'DB', 'GS'], concentration: 0.55 },
    transactionAvg: 420000000000,
    status: 'active',
    freqRank: 5,
  },
  {
    ticker: 'EXCL',
    name: 'XL Axiata',
    sector: 'Telco',
    price: 2380,
    fundamentals: { roe: 11.5, der: 1.35, netProfit: [1200, 1800, 2500], per: 18.5, pbv: 2.1, dividendYield: 0.8, payoutRatio: 15, revenueGrowth: 12.3 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'UB'], concentration: 0.45 },
    transactionAvg: 120000000000,
    status: 'active',
    freqRank: 12,
  },

  // === HEALTHCARE ===
  {
    ticker: 'KLBF',
    name: 'Kalbe Farma',
    sector: 'Healthcare',
    price: 1450,
    fundamentals: { roe: 14.8, der: 0.25, netProfit: [2700, 2900, 3150], per: 20.5, pbv: 3.2, dividendYield: 2.5, payoutRatio: 48, revenueGrowth: 7.8 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'MS'], concentration: 0.50 },
    transactionAvg: 110000000000,
    status: 'active',
    freqRank: 13,
  },

  // === CONSUMER ===
  {
    ticker: 'UNVR',
    name: 'Unilever Indonesia',
    sector: 'Consumer',
    price: 4250,
    fundamentals: { roe: 28.5, der: 0.45, netProfit: [5800, 5200, 4800], per: 32.5, pbv: 9.3, dividendYield: 2.8, payoutRatio: 90, revenueGrowth: -2.1 },
    brokerData: { netBuy: generateNetBuy(10, 'mixed'), topBrokers: ['MS', 'GS'], concentration: 0.38 },
    transactionAvg: 95000000000,
    status: 'active',
    freqRank: 15,
  },
  {
    ticker: 'ICBP',
    name: 'Indofood CBP',
    sector: 'Consumer',
    price: 11200,
    fundamentals: { roe: 16.8, der: 0.55, netProfit: [6500, 7200, 7800], per: 18.2, pbv: 3.1, dividendYield: 2.2, payoutRatio: 40, revenueGrowth: 6.8 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['DB', 'CS'], concentration: 0.48 },
    transactionAvg: 180000000000,
    status: 'active',
    freqRank: 10,
  },
  {
    ticker: 'INDF',
    name: 'Indofood Sukses Makmur',
    sector: 'Consumer',
    price: 7325,
    fundamentals: { roe: 13.2, der: 0.68, netProfit: [5200, 5800, 6100], per: 12.5, pbv: 1.65, dividendYield: 3.5, payoutRatio: 45, revenueGrowth: 4.5 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['JP', 'MS'], concentration: 0.42 },
    transactionAvg: 85000000000,
    status: 'active',
    freqRank: 18,
  },
  {
    ticker: 'MYOR',
    name: 'Mayora Indah',
    sector: 'Consumer',
    price: 2640,
    fundamentals: { roe: 20.5, der: 0.82, netProfit: [2100, 2400, 2750], per: 22.1, pbv: 4.5, dividendYield: 1.5, payoutRatio: 33, revenueGrowth: 10.2 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'DB'], concentration: 0.51 },
    transactionAvg: 75000000000,
    status: 'active',
    freqRank: 16,
  },

  // === MINING ===
  {
    ticker: 'ADRO',
    name: 'Adaro Energy',
    sector: 'Mining',
    price: 2950,
    fundamentals: { roe: 25.8, der: 0.42, netProfit: [12000, 18000, 15500], per: 6.5, pbv: 1.7, dividendYield: 8.2, payoutRatio: 55, revenueGrowth: -5.2 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['MS', 'CS', 'JP'], concentration: 0.62 },
    transactionAvg: 520000000000,
    status: 'active',
    freqRank: 3,
  },
  {
    ticker: 'PTBA',
    name: 'Bukit Asam',
    sector: 'Mining',
    price: 2760,
    fundamentals: { roe: 22.1, der: 0.35, netProfit: [5500, 7200, 6800], per: 7.8, pbv: 1.7, dividendYield: 9.5, payoutRatio: 75, revenueGrowth: -3.8 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['DB', 'GS'], concentration: 0.48 },
    transactionAvg: 95000000000,
    status: 'active',
    freqRank: 14,
  },
  {
    ticker: 'ITMG',
    name: 'Indo Tambangraya Megah',
    sector: 'Mining',
    price: 27800,
    fundamentals: { roe: 28.5, der: 0.28, netProfit: [4800, 8200, 7100], per: 5.5, pbv: 1.55, dividendYield: 12.5, payoutRatio: 70, revenueGrowth: -8.2 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'MS'], concentration: 0.55 },
    transactionAvg: 120000000000,
    status: 'active',
    freqRank: 11,
  },
  {
    ticker: 'ANTM',
    name: 'Aneka Tambang',
    sector: 'Mining',
    price: 1685,
    fundamentals: { roe: 12.3, der: 0.42, netProfit: [2800, 3200, 2500], per: 12.5, pbv: 1.5, dividendYield: 3.2, payoutRatio: 40, revenueGrowth: 2.5 },
    brokerData: { netBuy: generateNetBuy(10, 'mixed'), topBrokers: ['JP', 'UB'], concentration: 0.35 },
    transactionAvg: 180000000000,
    status: 'active',
    freqRank: 9,
  },

  // === PROPERTY ===
  {
    ticker: 'BSDE',
    name: 'Bumi Serpong Damai',
    sector: 'Property',
    price: 1180,
    fundamentals: { roe: 10.5, der: 0.62, netProfit: [2200, 2500, 2800], per: 10.2, pbv: 1.1, dividendYield: 1.8, payoutRatio: 18, revenueGrowth: 8.5 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['CS', 'DB'], concentration: 0.45 },
    transactionAvg: 85000000000,
    status: 'active',
    freqRank: 17,
  },
  {
    ticker: 'CTRA',
    name: 'Ciputra Development',
    sector: 'Property',
    price: 1235,
    fundamentals: { roe: 11.8, der: 0.58, netProfit: [1800, 2100, 2400], per: 11.5, pbv: 1.35, dividendYield: 1.5, payoutRatio: 17, revenueGrowth: 9.2 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['MS', 'JP'], concentration: 0.42 },
    transactionAvg: 65000000000,
    status: 'active',
    freqRank: 20,
  },

  // === TECHNOLOGY ===
  {
    ticker: 'GOTO',
    name: 'GoTo Gojek Tokopedia',
    sector: 'Technology',
    price: 82,
    fundamentals: { roe: -15.2, der: 0.35, netProfit: [-12000, -8000, -3500], per: -25.0, pbv: 1.8, dividendYield: 0, payoutRatio: 0, revenueGrowth: 25.5 },
    brokerData: { netBuy: generateNetBuy(10, 'buying'), topBrokers: ['MS', 'CS'], concentration: 0.30 },
    transactionAvg: 350000000000,
    status: 'active',
    freqRank: 8,
  },
  
  // === NEGATIVE CASES (FAIL TRADING) ===
  {
    ticker: 'WIKA',
    name: 'Wijaya Karya',
    sector: 'Infrastructure',
    price: 450,
    fundamentals: { roe: -5.5, der: 3.5, netProfit: [500, -200, -800], per: -12.0, pbv: 0.8, dividendYield: 0, payoutRatio: 0, revenueGrowth: -15.2 },
    brokerData: { netBuy: generateNetBuy(10, 'selling'), topBrokers: ['LG', 'CC'], concentration: 0.25 },
    transactionAvg: 15000000000,
    status: 'suspended', 
    freqRank: 50,
  }
];

export const mockStocks = rawStocks.map((s, i) => {
  const trend = i % 3 === 0 ? 'up' : i % 3 === 1 ? 'sideways' : 'down';
  const pattern = i % 2 === 0 ? 'accumulation' : 'normal';
  return enrichStock(s, trend, pattern);
});

export const marketData = {
  index: { name: 'IHSG', value: 7250.45, change: 0.85, trend: 'up' },
  advanceDecline: { advance: 285, decline: 142, unchanged: 185 },
  volumeVsAvg: 1.25,
  sectorPerformance: {
    Banking: { return5d: 2.1, volumeGrowth: 1.2, winnersRatio: 0.75 },
    Telco: { return5d: 1.5, volumeGrowth: 1.1, winnersRatio: 0.65 },
    Consumer: { return5d: 0.5, volumeGrowth: 0.9, winnersRatio: 0.55 },
    Mining: { return5d: 3.2, volumeGrowth: 1.5, winnersRatio: 0.82 },
    Property: { return5d: 1.2, volumeGrowth: 1.1, winnersRatio: 0.60 },
    Infrastructure: { return5d: -0.5, volumeGrowth: 0.8, winnersRatio: 0.40 },
    Healthcare: { return5d: 0.8, volumeGrowth: 1.0, winnersRatio: 0.52 },
    Automotive: { return5d: 1.1, volumeGrowth: 1.2, winnersRatio: 0.58 },
    Technology: { return5d: 2.5, volumeGrowth: 1.8, winnersRatio: 0.70 },
    Energy: { return5d: 1.8, volumeGrowth: 1.3, winnersRatio: 0.68 },
  }
};
