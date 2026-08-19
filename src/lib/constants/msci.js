// MSCI Indonesia Index Constituents (Global Standard Index)
// Note: This list is updated semi-annually (May and November)
// Last Update: May 2024 / Nov 2023 approximate proxy

export const MSCI_INDONESIA_TICKERS = [
  'BBCA', // Bank Central Asia Tbk
  'BBRI', // Bank Rakyat Indonesia (Persero) Tbk
  'BMRI', // Bank Mandiri (Persero) Tbk
  'TLKM', // Telkom Indonesia (Persero) Tbk
  'ASII', // Astra International Tbk
  'AMMN', // Amman Mineral Internasional Tbk
  'BREN', // Barito Renewables Energy Tbk
  'TPIA', // Chandra Asri Pacific Tbk
  'GOTO', // GoTo Gojek Tokopedia Tbk
  'MDKA', // Merdeka Copper Gold Tbk
  'KLBF', // Kalbe Farma Tbk
  'INCO', // Vale Indonesia Tbk
  'CPIN', // Charoen Pokphand Indonesia Tbk
  'UNVR', // Unilever Indonesia Tbk
  'SMGR', // Semen Indonesia (Persero) Tbk
  'INTP', // Indocement Tunggal Prakarsa Tbk
  'ICBP', // Indofood CBP Sukses Makmur Tbk
  'INDF', // Indofood Sukses Makmur Tbk
  'ADRO', // Adaro Energy Indonesia Tbk
  'BRPT', // Barito Pacific Tbk
  'PGAS', // Perusahaan Gas Negara Tbk
  'AKRA', // AKR Corporindo Tbk
  'ANTM', // Aneka Tambang Tbk
  'PTBA', // Bukit Asam Tbk
];

export const isMSCI = (ticker) => MSCI_INDONESIA_TICKERS.includes(ticker?.toUpperCase());
