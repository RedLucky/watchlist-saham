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
  'Healthcare': [
    'BMHS', 'CARE', 'DGNS', 'DVLA', 'HALO', 'HEAL', 'IKPM', 'INAF', 'IRRA', 'KAEF',
    'KLBF', 'LABS', 'MEDS', 'MERK', 'MIKA', 'MMIX', 'MTMH', 'OMED', 'PEHA', 'PEVE',
    'PRAY', 'PRDA', 'PRIM', 'PYFA', 'RSCH', 'RSGK', 'SAME', 'SCPI', 'SIDO', 'SILO',
    'SOHO', 'SRAJ', 'SURI', 'TSPC'
  ],

  'Financials': [
    'ABDA', 'ADMF', 'AGRO', 'AGRS', 'AHAP', 'AMAG', 'AMAR', 'AMOR', 'APIC', 'ARTO',
    'ASBI', 'ASDM', 'ASJT', 'ASMI', 'ASRM', 'BABP', 'BACA', 'BANK', 'BBCA', 'BBHI',
    'BBKP', 'BBLD', 'BBMD', 'BBNI', 'BBRI', 'BBSI', 'BBTN', 'BBYB', 'BCAP', 'BCIC',
    'BDMN', 'BEKS', 'BFIN', 'BGTG', 'BHAT', 'BINA', 'BJBR', 'BJTM', 'BKSW', 'BMAS',
    'BMRI', 'BNBA', 'BNGA', 'BNII', 'BNLI', 'BPFI', 'BPII', 'BRIS', 'BSIM', 'BSWD',
    'BTPN', 'BTPS', 'BVIC', 'CASA', 'CFIN', 'DEFI', 'DNAR', 'DNET', 'FUJI', 'GSMF',
    'HDFA', 'INPC', 'JMAS', 'LIFE', 'LPGI', 'LPPS', 'MASB', 'MAYA', 'MCOR', 'MEGA',
    'MFIN', 'MREI', 'MTWI', 'NICK', 'NISP', 'NOBU', 'OCAP', 'PADI', 'PALM', 'PANS',
    'PEGE', 'PLAS', 'PNBN', 'PNBS', 'PNIN', 'PNLF', 'POLA', 'POOL', 'RELI', 'SDRA',
    'SFAN', 'SMMA', 'SRTG', 'STAR', 'TIFA', 'TRIM', 'TRUS', 'TUGU', 'VICO', 'VINS',
    'VRNA', 'VTNY', 'WOMF', 'YULE'
  ],

  'Energy': [
    'ABMM', 'ADMR', 'ADRO', 'AIMS', 'AKRA', 'ALII', 'APEX', 'ARII', 'ARTI', 'ATLA',
    'BBRM', 'BESS', 'BIPI', 'BOSS', 'BSML', 'BSSR', 'BULL', 'BUMI', 'BYAN', 'CANI',
    'CBRE', 'CGAS', 'CNKO', 'COAL', 'CUAN', 'DEWA', 'DOID', 'DSSA', 'DWGL', 'ELSA',
    'ENRG', 'FIRE', 'GEMS', 'GTBO', 'GTSI', 'HILL', 'HITS', 'HRUM', 'HUMI', 'IATA',
    'INDY', 'INPS', 'ITMA', 'ITMG', 'JSKY', 'KKGI', 'KOPI', 'LEAD', 'MAHA', 'MBAP',
    'MBSS', 'MCOL', 'MEDC', 'MKAP', 'MTFN', 'MYOH', 'PGAS', 'PKPK', 'PSSI', 'PTBA',
    'PTIS', 'PTRO', 'RAJA', 'RGAS', 'RIGS', 'RMKE', 'RMKO', 'RUIS', 'SEMA', 'SGER',
    'SHIP', 'SICO', 'SMMT', 'SMRU', 'SOCI', 'SUGI', 'SUNI', 'SURE', 'TAMU', 'TCPI',
    'TEBE', 'TOBA', 'TPMA', 'TRAM', 'UNIQ', 'WINS', 'WOWS'
  ],

  'Basic Materials': [
    'ADMG', 'AGII', 'AKPI', 'ALDO', 'ALKA', 'ALMI', 'AMMN', 'ANTM', 'APLI', 'ARCI',
    'AVIA', 'AYLS', 'BAJA', 'BATR', 'BEBS', 'BLES', 'BMSR', 'BRMS', 'BRNA', 'BRPT',
    'BTON', 'CHEM', 'CITA', 'CLPI', 'CMNT', 'CTBN', 'DKFT', 'DPNS', 'EKAD', 'EPAC',
    'ESIP', 'ESSA', 'ETWA', 'FASW', 'FPNI', 'FWCT', 'GDST', 'GGRP', 'HKMU', 'IFII',
    'IFSH', 'IGAR', 'INAI', 'INCF', 'INCI', 'INCO', 'INKP', 'INRU', 'INTD', 'INTP',
    'IPOL', 'ISSP', 'JKSW', 'KAYU', 'KBRI', 'KDSI', 'KKES', 'KMTR', 'KRAS', 'LMSH',
    'LTLS', 'MBMA', 'MDKA', 'MDKI', 'MOLI', 'NCKL', 'NICE', 'NICL', 'NIKL', 'NPGF',
    'OBMD', 'OKAS', 'OPMS', 'PACK', 'PBID', 'PDPP', 'PICO', 'PPRI', 'PSAB', 'PURE',
    'SAMF', 'SBMA', 'SIMA', 'SMBR', 'SMCB', 'SMGA', 'SMGR', 'SMKL', 'SMLE', 'SOLA',
    'SPMA', 'SQMI', 'SRSN', 'SULI', 'SWAT', 'TALF', 'TBMS', 'TDPM', 'TINS', 'TIRT',
    'TKIM', 'TPIA', 'TRST', 'UNIC', 'WSBP', 'WTON', 'YPAS', 'ZINC'
  ],

  'Industrials': [
    'AMFG', 'AMIN', 'APII', 'ARKA', 'ARNA', 'ASGR', 'ASII', 'BHIT', 'BINO', 'BLUE',
    'BNBR', 'CAKK', 'CCSI', 'CRSN', 'CTTH', 'DYAN', 'FOLK', 'GPSO', 'HEXA', 'HOPE',
    'HYGN', 'IBFN', 'ICON', 'IKAI', 'IKBI', 'IMPC', 'INDX', 'INTA', 'JECC', 'JTPE',
    'KBLI', 'KBLM', 'KIAS', 'KING', 'KOBX', 'KOIN', 'KONI', 'KPAL', 'KRAH', 'KUAS',
    'LABA', 'LION', 'MARK', 'MDRN', 'MFMI', 'MHKI', 'MLIA', 'MUTU', 'NTBK', 'PADA',
    'PIPA', 'PTMP', 'SCCO', 'SINI', 'SKRN', 'SMIL', 'SOSS', 'SPTO', 'TIRA', 'TOTO',
    'TRIL', 'UNTR', 'VISI', 'VOKS', 'WIDI', 'ZBRA'
  ],

  'Consumer Non-Cyclicals': [
    'AALI', 'ADES', 'AGAR', 'AISA', 'ALTO', 'AMMS', 'AMRT', 'ANDI', 'ANJT', 'ASHA',
    'AYAM', 'BEEF', 'BEER', 'BISI', 'BOBA', 'BTEK', 'BUAH', 'BUDI', 'BWPT', 'CAMP',
    'CBUT', 'CEKA', 'CLEO', 'CMRY', 'COCO', 'CPIN', 'CPRO', 'CRAB', 'CSRA', 'DAYA',
    'DEWI', 'DLTA', 'DMND', 'DPUM', 'DSFI', 'DSNG', 'ENZO', 'EPMT', 'EURO', 'FAPA',
    'FISH', 'FLMC', 'FOOD', 'GGRM', 'GOLL', 'GOOD', 'GRPM', 'GULA', 'GUNA', 'GZCO',
    'HERO', 'HMSP', 'HOKI', 'IBOS', 'ICBP', 'IKAN', 'INDF', 'IPPE', 'ISEA', 'ITIC',
    'JARR', 'JAWA', 'JPFA', 'KEJU', 'KINO', 'KMDS', 'KPAS', 'LAPD', 'LSIP', 'MAGP',
    'MAIN', 'MAXI', 'MBTO', 'MGRO', 'MIDI', 'MKTR', 'MLBI', 'MLPL', 'MPPA', 'MRAT',
    'MSJA', 'MYOR', 'NANO', 'NASI', 'NAYZ', 'NSSS', 'OILS', 'PCAR', 'PGUN', 'PMMP',
    'PNGO', 'PSDN', 'PSGO', 'PTPS', 'RANC', 'ROTI', 'SDPC', 'SGRO', 'SIMP', 'SIPD',
    'SKBM', 'SKLT', 'SMAR', 'SOUL', 'SSMS', 'STAA', 'STRK', 'STTP', 'TAPG', 'TAYS',
    'TBLA', 'TCID', 'TGKA', 'TGUK', 'TLDN', 'TRGU', 'UCID', 'UDNG', 'ULTJ', 'UNSP',
    'UNVR', 'VICI', 'WAPO', 'WICO', 'WIIM', 'WINE', 'WMPP', 'WMUU'
  ],

  'Consumer Cyclicals': [
    'ABBA', 'ACES', 'ACRO', 'AEGS', 'AKKU', 'ARGO', 'ARTA', 'ASLC', 'AUTO', 'BABY',
    'BAIK', 'BATA', 'BAUT', 'BAYU', 'BELL', 'BIKE', 'BIMA', 'BLTZ', 'BMBL', 'BMTR',
    'BOGA', 'BOLA', 'BOLT', 'BRAM', 'BUVA', 'CARS', 'CBMF', 'CINT', 'CLAY', 'CNMA',
    'CNTX', 'CSAP', 'CSMI', 'DEPO', 'DFAM', 'DIGI', 'DOOH', 'DRMA', 'DUCK', 'EAST',
    'ECII', 'ENAK', 'ERAA', 'ERAL', 'ERTX', 'ESTA', 'ESTI', 'FAST', 'FILM', 'FITT',
    'FORU', 'FUTR', 'GDYR', 'GEMA', 'GJTL', 'GLOB', 'GOLF', 'GRPH', 'GWSA', 'HAJJ',
    'HDTX', 'HOME', 'HOTL', 'HRME', 'HRTA', 'IDEA', 'IIKP', 'IMAS', 'INDR', 'INDS',
    'INOV', 'IPTV', 'ISAP', 'JGLE', 'JIHD', 'JSPT', 'KDTN', 'KICI', 'KLIN', 'KOTA',
    'KPIG', 'LFLO', 'LIVE', 'LMAX', 'LMPI', 'LPIN', 'LPPF', 'LUCY', 'MABA', 'MAMI',
    'MAPA', 'MAPB', 'MAPI', 'MARI', 'MASA', 'MDIA', 'MEJA', 'MGLV', 'MGNA', 'MICE',
    'MINA', 'MKNT', 'MNCN', 'MPMX', 'MSIN', 'MSKY', 'MYTX', 'NATO', 'NETV', 'NIPS',
    'NUSA', 'OLIV', 'PANR', 'PART', 'PBRX', 'PDES', 'PGLI', 'PJAA', 'PLAN', 'PMJS',
    'PNSE', 'POLU', 'POLY', 'PRAS', 'PSKT', 'PTSP', 'PZZA', 'RAAM', 'RAFI', 'RALS',
    'RICY', 'SBAT', 'SCMA', 'SCNP', 'SHID', 'SLIS', 'SMSM', 'SNLK', 'SOFA', 'SONA',
    'SOTS', 'SPRE', 'SRIL', 'SSTM', 'SWID', 'TELE', 'TFCO', 'TMPO', 'TOOL', 'TOYS',
    'TRIO', 'TRIS', 'TYRE', 'UFOE', 'UNIT', 'UNTD', 'VIVA', 'VKTR', 'WOOD', 'YELO',
    'ZATA', 'ZONE'
  ],

  'Properties & Real Estate': [
    'ADCP', 'AMAN', 'APLN', 'ARMY', 'ASPI', 'ASRI', 'ATAP', 'BAPA', 'BAPI', 'BBSS',
    'BCIP', 'BEST', 'BIKA', 'BIPP', 'BKDP', 'BKSL', 'BSBK', 'BSDE', 'CBPE', 'CITY',
    'COWL', 'CPRI', 'CSIS', 'CTRA', 'DADA', 'DART', 'DILD', 'DMAS', 'DUTI', 'ELTY',
    'EMDE', 'FMII', 'FORZ', 'GAMA', 'GMTD', 'GPRA', 'GRIA', 'HBAT', 'HOMI', 'INDO',
    'INPP', 'IPAC', 'JRPT', 'KBAG', 'KIJA', 'KOCI', 'LAND', 'LCGP', 'LPCK', 'LPKR',
    'LPLI', 'MDLN', 'MKPI', 'MMLP', 'MPRO', 'MSIE', 'MTLA', 'MTSM', 'MYRX', 'NASA',
    'NIRO', 'NZIA', 'OMRE', 'PAMG', 'PANI', 'PLIN', 'POLI', 'POLL', 'POSA', 'PPRO',
    'PUDP', 'PURI', 'PWON', 'RBMS', 'RDTX', 'REAL', 'RELF', 'RIMO', 'RISE', 'ROCK',
    'RODA', 'SAGE', 'SATU', 'SMDM', 'SMRA', 'TARA', 'TRIN', 'TRUE', 'UANG', 'URBN',
    'VAST', 'WINR'
  ],

  'Technology': [
    'AREA', 'ATIC', 'AWAN', 'AXIO', 'BELI', 'BUKA', 'CASH', 'CHIP', 'CYBR', 'DCII',
    'DIVA', 'DMMX', 'EDGE', 'ELIT', 'EMTK', 'ENVY', 'GLVA', 'GOTO', 'HDIT', 'IOTF',
    'IRSX', 'JATI', 'KIOS', 'KREN', 'LMAS', 'LUCK', 'MCAS', 'MENN', 'MLPT', 'MPIX',
    'MSTI', 'MTDL', 'NFCX', 'NINE', 'PGJO', 'PTSN', 'RUNS', 'SKYB', 'TECH', 'TFAS',
    'TOSK', 'TRON', 'UVCR', 'WGSH', 'WIFI', 'WIRG', 'ZYRX'
  ],

  'Infrastructures': [
    'ACST', 'ADHI', 'ARKO', 'ASLI', 'BALI', 'BDKR', 'BREN', 'BTEL', 'BUKK', 'CASS',
    'CENT', 'CMNP', 'DATA', 'DGIK', 'EXCL', 'FIMP', 'FREN', 'GHON', 'GMFI', 'GOLD',
    'HADE', 'IBST', 'IDPR', 'INET', 'IPCC', 'IPCM', 'ISAT', 'JAST', 'JKON', 'JSMR',
    'KARW', 'KBLV', 'KEEN', 'KETR', 'KOKA', 'KRYA', 'LCKM', 'LINK', 'MANG', 'META',
    'MORA', 'MPOW', 'MTEL', 'MTPS', 'MTRA', 'NRCA', 'OASA', 'PBSA', 'PGEO', 'PORT',
    'POWR', 'PPRE', 'PTDU', 'PTPP', 'PTPW', 'RONY', 'SMKM', 'SSIA', 'SUPR', 'TAMA',
    'TBIG', 'TGRA', 'TLKM', 'TOPS', 'TOTL', 'TOWR', 'WEGE', 'WIKA', 'WSKT'
  ],

  'Transportation & Logistics': [
    'AKSI', 'ASSA', 'BIRD', 'BLTA', 'BPTR', 'CMPP', 'DEAL', 'ELPI', 'GIAA', 'GTRA',
    'HAIS', 'HATM', 'HELI', 'IMJS', 'JAYA', 'KJEN', 'KLAS', 'LAJU', 'LOPI', 'LRNA',
    'MIRA', 'MITI', 'MPXL', 'NELY', 'PPGL', 'PURA', 'RCCC', 'SAFE', 'SAPX', 'SDMU',
    'SMDR', 'TAXI', 'TMAS', 'TNCA', 'TRJA', 'TRUK', 'WEHA'
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
