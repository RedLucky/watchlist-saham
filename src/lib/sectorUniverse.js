/**
 * Sector Universe — IDX Industrial Classification (IDX-IC)
 *
 * Official BEI sector classification since 25 January 2021.
 * 11 sectors (excluding "Listed Investment Products" which is not relevant for equity analysis).
 *
 * Source: idx.co.id, sectors.app — verified May 2025.
 */

export const STANDARD_SECTORS = [
  'Financials',
  'Energy',
  'Basic Materials',
  'Industrials',
  'Consumer Non-Cyclicals',
  'Consumer Cyclicals',
  'Healthcare',
  'Properties & Real Estate',
  'Technology',
  'Infrastructures',
  'Transportation & Logistics',
];

/** Maps old/informal sector names to official IDX-IC names */
const SECTOR_ALIASES = {
  // Old JASICA / custom names
  Banking: 'Financials',
  Financials: 'Financials',
  'Financial Services': 'Financials',
  Keuangan: 'Financials',

  Energy: 'Energy',
  Energi: 'Energy',
  Mining: 'Energy', // Coal miners were "Mining" in old system
  Coal: 'Energy',

  'Basic Materials': 'Basic Materials',
  'Basic Industry': 'Basic Materials',
  'Barang Baku': 'Basic Materials',
  Metals: 'Basic Materials',
  Chemicals: 'Basic Materials',

  Industrials: 'Industrials',
  Perindustrian: 'Industrials',
  Automotive: 'Industrials',

  'Consumer Non-Cyclicals': 'Consumer Non-Cyclicals',
  Consumer: 'Consumer Non-Cyclicals',
  'Consumer Staples': 'Consumer Non-Cyclicals',
  'Konsumen Primer': 'Consumer Non-Cyclicals',
  Agriculture: 'Consumer Non-Cyclicals',

  'Consumer Cyclicals': 'Consumer Cyclicals',
  'Konsumen Non-Primer': 'Consumer Cyclicals',
  Retail: 'Consumer Cyclicals',
  Media: 'Consumer Cyclicals',

  Healthcare: 'Healthcare',
  Kesehatan: 'Healthcare',

  'Properties & Real Estate': 'Properties & Real Estate',
  Property: 'Properties & Real Estate',
  'Property & Real Estate': 'Properties & Real Estate',
  Properti: 'Properties & Real Estate',

  Technology: 'Technology',
  Tech: 'Technology',
  Teknologi: 'Technology',

  Infrastructures: 'Infrastructures',
  Infrastructure: 'Infrastructures',
  Infrastruktur: 'Infrastructures',
  Telco: 'Infrastructures',
  Telecom: 'Infrastructures',
  Telecommunications: 'Infrastructures',

  'Transportation & Logistics': 'Transportation & Logistics',
  Logistics: 'Transportation & Logistics',
  Transportation: 'Transportation & Logistics',
  'Transportasi & Logistik': 'Transportation & Logistics',
};

/**
 * Ticker → Sector mapping based on IDX-IC.
 * Covers LQ45, IDX80, Kompas100, and other liquid emitens.
 */
export const SECTOR_TICKERS = {
  Financials: [
    'BBCA', 'BBRI', 'BMRI', 'BBNI',  // Big 4
    'BRIS', 'BBTN', 'ARTO', 'PNBN', 'NISP', 'BDMN', // Major banks
    'BNGA', 'BNLI', 'BTPN', 'BJBR', 'BJTM',          // Regional & others
    'ADMF', 'BBKP', 'MEGA', 'BBYB',                   // Finance & small banks
  ],

  Energy: [
    'ADRO', 'PTBA', 'ITMG', 'HRUM', 'BUMI',  // Coal majors
    'CUAN', 'MEDC', 'ENRG', 'PGEO', 'BREN',  // Oil, gas, geothermal, renewables
    'PTRO', 'DSSA', 'ADMR', 'ELSA', 'ESSA',   // Energy services & diversified
    'RAJA', 'DOID',                             // Gas distribution & coal
  ],

  'Basic Materials': [
    'ANTM', 'INCO', 'MDKA', 'MBMA', 'AMMN',  // Mining metals
    'TPIA', 'BRPT', 'INKP', 'TKIM',           // Chemicals & pulp/paper
    'SMGR', 'INTP',                             // Cement / building materials
    'TINS', 'BRMS', 'PSAB', 'NICL',            // Other mining
  ],

  Industrials: [
    'ASII', 'AUTO', 'SMSM', 'UNTR',           // Automotive & heavy equipment
    'IMAS', 'INDS',                             // Automotive components
  ],

  'Consumer Non-Cyclicals': [
    'UNVR', 'ICBP', 'INDF', 'MYOR', 'AMRT',  // FMCG & retail staples
    'MIDI', 'GGRM', 'HMSP',                    // Tobacco
    'CPIN', 'JPFA',                             // Poultry feed
    'AALI', 'LSIP',                             // Plantation (palm oil)
    'SIDO', 'KLBF',                             // Note: SIDO & KLBF sometimes classified here; KLBF officially Healthcare
    'GOOD', 'CLEO', 'TBLA',                    // F&B and plantation
  ],

  'Consumer Cyclicals': [
    'LPPF', 'MAPA', 'MAPI', 'ACES', 'ERAA',  // Retail & fashion
    'EMTK', 'SCMA',                             // Media
    'BELI',                                     // E-commerce (Blibli)
    'PGJO',                                     // Apparel
  ],

  Healthcare: [
    'KLBF', 'HEAL', 'MIKA',                    // Pharma & hospitals
    'SILO', 'PRDA',                             // Hospitals & diagnostics
  ],

  'Properties & Real Estate': [
    'BSDE', 'CTRA', 'SMRA', 'PWON', 'ASRI',  // Major developers
    'PANI', 'DILD', 'LPKR', 'APLN',            // Mid-tier developers
  ],

  Technology: [
    'GOTO', 'BUKA',                             // Tech platforms
    'DCII', 'MTDL',                             // Data center & IT distribution
  ],

  Infrastructures: [
    'TLKM', 'ISAT', 'EXCL',                    // Telco operators
    'TOWR', 'TBIG', 'MTEL',                    // Tower companies
    'JSMR', 'WIKA', 'PTPP', 'ADHI', 'WSKT',   // Construction & toll roads
    'CMNP', 'WIFI',                             // Infrastructure services
  ],

  'Transportation & Logistics': [
    'SMDR', 'TMAS', 'BIRD', 'ASSA',            // Shipping, taxi, fleet
    'AKRA',                                     // Distribution & logistics
    'GIAA', 'SAPX',                             // Airlines & courier
  ],
};

const HEALTHCARE_FIRST_ORDER = [
  'Healthcare',
  'Financials',
  'Energy',
  'Basic Materials',
  'Industrials',
  'Consumer Non-Cyclicals',
  'Consumer Cyclicals',
  'Properties & Real Estate',
  'Technology',
  'Infrastructures',
  'Transportation & Logistics',
];

const BASE_TICKER_TO_SECTOR = {};
for (const sector of HEALTHCARE_FIRST_ORDER) {
  const tickers = SECTOR_TICKERS[sector] || [];
  for (const ticker of tickers) {
    if (!BASE_TICKER_TO_SECTOR[ticker]) {
      BASE_TICKER_TO_SECTOR[ticker] = sector;
    }
  }
}

export function normalizeTicker(ticker = '') {
  if (!ticker) return '';
  return ticker.replace('.JK', '').replace('^', '').trim().toUpperCase();
}

export function normalizeSectorName(sector = '') {
  if (!sector) return 'General';
  const clean = String(sector).trim();
  return SECTOR_ALIASES[clean] || (STANDARD_SECTORS.includes(clean) ? clean : 'General');
}

export function getSectorByTicker(ticker) {
  const base = normalizeTicker(ticker);
  if (base === 'JKSE') return 'INDEX'; // IHSG index
  return BASE_TICKER_TO_SECTOR[base] || 'General';
}

/** Indonesian sector labels for UI display */
const SECTOR_LABELS_ID = {
  Financials: 'Keuangan',
  Energy: 'Energi',
  'Basic Materials': 'Barang Baku',
  Industrials: 'Perindustrian',
  'Consumer Non-Cyclicals': 'Konsumen Primer',
  'Consumer Cyclicals': 'Konsumen Non-Primer',
  Healthcare: 'Kesehatan',
  'Properties & Real Estate': 'Properti & Real Estat',
  Technology: 'Teknologi',
  Infrastructures: 'Infrastruktur',
  'Transportation & Logistics': 'Transportasi & Logistik',
  INDEX: 'Indeks',
  General: 'Lainnya',
};

export function getSectorLabelID(sector) {
  return SECTOR_LABELS_ID[sector] || sector;
}

/** Check if stock is Sharia compliant (Daftar Efek Syariah / ISSI) */
export function isSyariahStock(ticker, sector = '') {
  const normTicker = normalizeTicker(ticker);
  const normSector = normalizeSectorName(sector);

  // Conventional banking & finance is Non-Syariah
  if (normSector === 'Financials') {
    // Islamic bank exceptions in BEI (BRIS = Bank Syariah Indonesia, BTPS = BTPN Syariah)
    if (['BRIS', 'BTPS'].includes(normTicker)) return true;
    return false;
  }

  // Known Non-syariah tickers (tobacco/conventional finance/liquor)
  const nonSyariahList = ['GGRM', 'HMSP', 'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BBTN', 'BDMN', 'PNBN', 'NISP', 'ADMF', 'MEGA', 'BBYB'];
  if (nonSyariahList.includes(normTicker)) return false;

  // Real sector emitens in BEI (ISSI index)
  return true;
}

/**
 * Returns all tickers from SECTOR_TICKERS as a flat array with .JK suffix,
 * suitable for Yahoo Finance queries. Includes ^JKSE for IHSG index.
 */
export function getAllTickersForYahoo() {
  const tickers = ['^JKSE'];
  const seen = new Set(['^JKSE']);
  for (const sectorTickers of Object.values(SECTOR_TICKERS)) {
    for (const t of sectorTickers) {
      const yahoo = `${t}.JK`;
      if (!seen.has(yahoo)) {
        seen.add(yahoo);
        tickers.push(yahoo);
      }
    }
  }
  return tickers;
}
