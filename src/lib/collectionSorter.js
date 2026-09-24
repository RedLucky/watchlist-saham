/**
 * Collection Sorter Engine
 * 
 * Provides automated sorting strategies for stock collections / watchlists.
 * Features 7 institutional sorting algorithms:
 * 1. SMART_COMBINATION: Multi-factor synergy (Composite Score + MACD + Proximity to Buy)
 * 2. HIGHEST_SCORE: Pure composite quality score
 * 3. MACD_CROSS: Technical momentum & buy trigger (Fresh Golden Cross -> Bullish -> Rebound)
 * 4. PROXIMITY_TARGET_BUY: Proximity to user's target buy price / technical support
 * 5. SMART_MONEY: Bandarmologi inflow & smart money score
 * 6. TOP_PERFORMER: Daily gainers %
 * 7. ALPHABETICAL: Clean A-Z sorting by ticker
 */

// ==========================================
// NAMED CONSTANTS & FINANCIAL WEIGHTS
// ==========================================
export const SMART_SCORE_WEIGHT = 0.40;       // 40% Kualitas fundamental & teknikal
export const SMART_MACD_WEIGHT = 0.35;        // 35% Momentum sinyal beli MACD
export const SMART_PROXIMITY_WEIGHT = 0.25;   // 25% Kedekatan harga pasar ke target beli

// MACD Signal Points (0-100)
export const MACD_POINTS_GOLDEN_CROSS = 100;  // Fresh Golden Cross
export const MACD_POINTS_BULLISH = 75;        // Histogram positif mengembang
export const MACD_POINTS_REBOUND = 55;        // Histogram negatif menipis ke 0 (reversal)
export const MACD_POINTS_BEARISH = 20;        // Histogram negatif melemah
export const MACD_POINTS_NEUTRAL = 50;        // Fallback jika tidak ada data

// Proximity to Buy Target Points (0-100)
export const PROXIMITY_POINTS_IN_ZONE = 100;  // Harga <= target beli (sudah masuk zona beli)
export const PROXIMITY_POINTS_NEAR_2PCT = 90; // <= 2% dari target beli (siap eksekusi)
export const PROXIMITY_POINTS_NEAR_5PCT = 70; // <= 5% dari target beli
export const PROXIMITY_POINTS_NEAR_10PCT = 50;// <= 10% dari target beli
export const PROXIMITY_POINTS_FAR = 20;       // > 10% di atas target beli

export const DEFAULT_BUY_DISCOUNT_RATIO = 0.95;// Fallback diskon 5% jika belum pasang target manual

// ==========================================
// 7 STRATEGY METADATA FOR UI & MODAL
// ==========================================
export const SORT_OPTIONS = [
  {
    id: 'SMART_COMBINATION',
    label: 'Kombinasi Cerdas',
    shortDesc: 'Sinergi Skor (40%), MACD Beli (35%), & Target Beli (25%)',
    badge: 'Rekomendasi',
    badgeColor: 'emerald',
    icon: '⭐',
    description: 'Menyaring saham terbaik yang memiliki fundamental prima sekaligus berada di momen waktu beli (MACD Golden Cross / dekat Target Beli) yang paling optimal.',
    formula: 'Rank = (Skor Komposit × 40%) + (Poin Sinyal MACD × 35%) + (Poin Kedekatan Target Beli × 25%)',
    scenario: 'Sangat cocok digunakan setiap pagi saat pembukaan bursa untuk memilih saham yang paling prioritas dieksekusi hari ini.'
  },
  {
    id: 'HIGHEST_SCORE',
    label: 'Skor Tertinggi',
    shortDesc: 'Fundamental kuat, valuasi wajar, & tren teknikal sehat',
    badge: 'Kualitas',
    badgeColor: 'blue',
    icon: '🏆',
    description: 'Mengurutkan saham murni dari skor komposit tertinggi (0–100) yang menggabungkan Fundamental (45%), Teknikal (35%), Trending (10%), dan Smart Money (10%).',
    formula: 'Urutan = Composite Score Descending (A-Grade 80+ ➔ B-Grade 65+ ➔ C-Grade 50+ ➔ D-Grade)',
    scenario: 'Cocok untuk investor dan swing trader yang ingin memprioritaskan kualitas emiten terbaik tanpa terpengaruh fluktuasi jangka pendek.'
  },
  {
    id: 'MACD_CROSS',
    label: 'Sinyal Beli MACD',
    shortDesc: 'Prioritas Fresh Golden Cross & Momentum Rebound',
    badge: 'Teknikal',
    badgeColor: 'indigo',
    icon: '📈',
    description: 'Memprioritaskan saham yang baru saja mengonfirmasi sinyal pembalikan arah naik (Golden Cross) atau histogram MACD yang mulai berbalik positif.',
    formula: 'Prioritas: 1. Fresh Golden Cross ➔ 2. Bullish Histogram (> 0) ➔ 3. Histogram Melengkung Naik ➔ 4. Bearish',
    scenario: 'Sangat efektif bagi swing trader untuk mencari titik masuk (entry point) dengan rasio risk-to-reward terbaik.'
  },
  {
    id: 'PROXIMITY_TARGET_BUY',
    label: 'Paling Dekat Target Beli',
    shortDesc: 'Saham yang menyentuh atau mendekati area beli (≤ 2%)',
    badge: 'Eksekusi',
    badgeColor: 'amber',
    icon: '🎯',
    description: 'Mendeteksi saham yang harganya paling dekat dengan Target Beli manual yang Anda tentukan, atau mendekati area Support Teknikal terdekat.',
    formula: 'Jarak = |Harga Pasar - Target Beli| / Harga Pasar × 100%. Saham di zona beli (≤ 0–2%) berada di urutan teratas.',
    scenario: 'Gunakan saat pasar sedang terkoreksi untuk langsung mengetahui order beli mana yang sudah siap antre atau tereksekusi.'
  },
  {
    id: 'SMART_MONEY',
    label: 'Akumulasi Smart Money',
    shortDesc: 'Aliran dana bandar & kepemilikan KSEI paling agresif',
    badge: 'Bandarmologi',
    badgeColor: 'purple',
    icon: '🐋',
    description: 'Mengurutkan saham berdasarkan inflow akumulasi dana institusi, data kepemilikan KSEI bulanan, serta konsentrasi broker pembeli.',
    formula: 'Urutan = Smart Money Score Descending + Volume Spike terhadap rata-rata 20 hari',
    scenario: 'Cocok untuk mendeteksi saham koleksi yang sedang dikumpulkan secara diam-diam oleh pemain besar.'
  },
  {
    id: 'TOP_PERFORMER',
    label: 'Performa Hari Ini',
    shortDesc: 'Top Gainers harian (+%) untuk melacak saham momentum',
    badge: 'Momentum',
    badgeColor: 'rose',
    icon: '🚀',
    description: 'Menampilkan saham koleksi yang mengalami persentase kenaikan harga harian tertinggi hari ini.',
    formula: 'Urutan = Change Percent Harian Descending (+25% ➔ +5% ➔ 0% ➔ -10%)',
    scenario: 'Cocok saat jam bursa aktif untuk memantau saham mana yang sedang memimpin reli pasar hari ini.'
  },
  {
    id: 'ALPHABETICAL',
    label: 'Nama Emiten (A – Z)',
    shortDesc: 'Menyusun urutan ticker secara alfabetis rapi',
    badge: 'Kerapian',
    badgeColor: 'slate',
    icon: '🔤',
    description: 'Menata ulang seluruh daftar saham di dalam koleksi berdasarkan urutan abjad kode ticker saham BEI dari A sampai Z.',
    formula: 'Urutan = Ticker A ➔ Z',
    scenario: 'Gunakan saat koleksi Anda memiliki banyak saham dan Anda ingin mencarinya dengan cepat berdasarkan abjad.'
  }
];

// ==========================================
// SCORING COMPUTATION HELPERS
// ==========================================

/**
 * Menghitung poin sinyal beli MACD (0-100)
 */
export function computeMacdScore(item) {
  const stock = item?.stock || {};
  const t = stock.technicals || {};
  const macd = t.macd;

  if (!macd) {
    // Fallback: gunakan skor teknikal jika modul MACD belum terhitung
    return Number(stock.scores?.technical ?? 50);
  }

  // 1. Fresh Golden Cross
  if (macd.isGoldenCross) {
    return MACD_POINTS_GOLDEN_CROSS;
  }

  const hist = Number(macd.histogram || 0);
  const prevHist = Number(macd.prevHistogram ?? hist);

  // 2. Bullish zone (histogram positif)
  if (hist > 0) {
    return MACD_POINTS_BULLISH;
  }

  // 3. Rebound momentum (histogram negatif tapi melengkung naik mendekati 0)
  if (hist > prevHist) {
    return MACD_POINTS_REBOUND;
  }

  // 4. Bearish zone
  return MACD_POINTS_BEARISH;
}

/**
 * Menghitung kedekatan harga pasar terhadap Target Beli (0-100)
 */
export function computeProximityScore(item) {
  const stock = item?.stock || {};
  const price = Number(stock.price || 0);
  if (price <= 0) return 0;

  // Resolusi target beli: utamakan target manual item, lalu support teknikal, fallback diskon 5%
  let targetBuy = null;
  if (item?.targetBuy && Number(item.targetBuy) > 0) {
    targetBuy = Number(item.targetBuy);
  } else if (stock.technicals?.support && Number(stock.technicals.support) > 0) {
    targetBuy = Number(stock.technicals.support);
  } else {
    targetBuy = price * DEFAULT_BUY_DISCOUNT_RATIO;
  }

  // Jika harga saat ini sudah di bawah atau tepat di target beli
  if (price <= targetBuy) {
    return PROXIMITY_POINTS_IN_ZONE;
  }

  // Persentase jarak harga di atas target beli
  const distancePct = ((price - targetBuy) / price) * 100;

  if (distancePct <= 2.0) {
    return PROXIMITY_POINTS_NEAR_2PCT;
  }
  if (distancePct <= 5.0) {
    return PROXIMITY_POINTS_NEAR_5PCT;
  }
  if (distancePct <= 10.0) {
    return PROXIMITY_POINTS_NEAR_10PCT;
  }
  return PROXIMITY_POINTS_FAR;
}

/**
 * Menghitung skor gabungan cerdas (Smart Combination Rank)
 */
export function computeSmartScore(item) {
  const stock = item?.stock || {};
  const compScore = Number(stock.score ?? stock.scores?.composite ?? 50);
  const macdScore = computeMacdScore(item);
  const proximityScore = computeProximityScore(item);

  const smartRank = (compScore * SMART_SCORE_WEIGHT) +
                    (macdScore * SMART_MACD_WEIGHT) +
                    (proximityScore * SMART_PROXIMITY_WEIGHT);

  return Number(smartRank.toFixed(2));
}

// ==========================================
// MAIN SORTING FUNCTION (PURE FUNCTION)
// ==========================================

/**
 * Mengurutkan array item koleksi berdasarkan strategi yang dipilih.
 * Mengembalikan array baru tanpa memutasi array asli.
 * 
 * @param {Array} items - Daftar collection items dengan properti stock
 * @param {string} strategyId - Salah satu ID dari SORT_OPTIONS
 * @returns {Array} Array collection items yang sudah terurut rapi
 */
export function sortCollectionItems(items, strategyId = 'SMART_COMBINATION') {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? [...items] : [];
  }

  const copy = [...items];

  switch (strategyId) {
    case 'SMART_COMBINATION':
      return copy.sort((a, b) => {
        const scoreB = computeSmartScore(b);
        const scoreA = computeSmartScore(a);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.stock?.price || 0) - (a.stock?.price || 0);
      });

    case 'HIGHEST_SCORE':
      return copy.sort((a, b) => {
        const scoreB = Number(b.stock?.score ?? b.stock?.scores?.composite ?? 0);
        const scoreA = Number(a.stock?.score ?? a.stock?.scores?.composite ?? 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const fundB = Number(b.stock?.scores?.fundamental ?? 0);
        const fundA = Number(a.stock?.scores?.fundamental ?? 0);
        return fundB - fundA;
      });

    case 'MACD_CROSS':
      return copy.sort((a, b) => {
        const macdScoreB = computeMacdScore(b);
        const macdScoreA = computeMacdScore(a);
        if (macdScoreB !== macdScoreA) return macdScoreB - macdScoreA;
        // Secondary: composite score
        return (b.stock?.score || 0) - (a.stock?.score || 0);
      });

    case 'PROXIMITY_TARGET_BUY':
      return copy.sort((a, b) => {
        const proxB = computeProximityScore(b);
        const proxA = computeProximityScore(a);
        if (proxB !== proxA) return proxB - proxA;
        return (b.stock?.score || 0) - (a.stock?.score || 0);
      });

    case 'SMART_MONEY':
      return copy.sort((a, b) => {
        const smB = Number(b.stock?.scores?.smartMoney ?? 0);
        const smA = Number(a.stock?.scores?.smartMoney ?? 0);
        if (smB !== smA) return smB - smA;
        const trendB = Number(b.stock?.scores?.trending ?? 0);
        const trendA = Number(a.stock?.scores?.trending ?? 0);
        return trendB - trendA;
      });

    case 'TOP_PERFORMER':
      return copy.sort((a, b) => {
        const changeB = Number(b.stock?.changePercent ?? -999);
        const changeA = Number(a.stock?.changePercent ?? -999);
        return changeB - changeA;
      });

    case 'ALPHABETICAL':
      return copy.sort((a, b) => {
        const tickerA = (a.ticker || '').toUpperCase();
        const tickerB = (b.ticker || '').toUpperCase();
        return tickerA.localeCompare(tickerB);
      });

    default:
      return copy;
  }
}
