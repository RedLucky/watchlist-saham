/**
 * @fileoverview Pure formatting and presentation helpers for TransactionFlowPanel.
 * Uses Bursa 1985 semantic colour tokens only (no palette colours, no colour emoji).
 */

export const PERIOD_ORDER = Object.freeze(['1d', '1w', '1m', '1y']);

const DOMINANT_FLOW_META = Object.freeze({
  FOREIGN_ACCUMULATION: {
    label: '▲ AKUMULASI ASING',
    badgeClass: 'bg-up-soft text-up border-up',
  },
  DOMESTIC_ACCUMULATION: {
    label: '▲ AKUMULASI DOMESTIK',
    badgeClass: 'bg-up-soft text-up border-up',
  },
  FOREIGN_DISTRIBUTION: {
    label: '▼ DISTRIBUSI ASING',
    badgeClass: 'bg-down-soft text-down border-down',
  },
  DOMESTIC_DISTRIBUTION: {
    label: '▼ DISTRIBUSI DOMESTIK',
    badgeClass: 'bg-down-soft text-down border-down',
  },
  BALANCED: {
    label: '− ARUS SEIMBANG',
    badgeClass: 'bg-sunken text-muted border-line',
  },
});

const SOURCE_META = Object.freeze({
  idx: {
    label: 'DATA RESMI BEI',
    badgeClass: 'bg-up-soft text-up border-up',
  },
  hybrid: {
    label: 'HIBRIDA BEI + KSEI',
    badgeClass: 'bg-warn-soft text-warn border-warn',
  },
  estimated: {
    label: 'ESTIMASI OHLCV + KSEI',
    badgeClass: 'bg-sunken text-muted border-line',
  },
  empty: {
    label: 'BELUM ADA DATA',
    badgeClass: 'bg-sunken text-muted border-line',
  },
});

/**
 * Formats a Rupiah value into compact Indonesian notation (T, M, Jt, Rb).
 *
 * @param {number} amountRp - Amount in Rupiah.
 * @param {boolean} [withSign=false] - Whether to prefix positive values with '+'.
 * @returns {string} Formatted Rupiah string (e.g. "Rp 140,0 M" or "+Rp 1,25 T").
 */
export function formatFlowRupiah(amountRp, withSign = false) {
  const num = Number(amountRp);
  if (!Number.isFinite(num) || num === 0) {
    return 'Rp 0';
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : (withSign && num > 0 ? '+' : '');

  if (abs >= 1_000_000_000_000) {
    const val = (abs / 1_000_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}Rp ${val} T`;
  }
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${sign}Rp ${val} M`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${sign}Rp ${val} Jt`;
  }
  if (abs >= 1_000) {
    const val = Math.round(abs / 1_000).toLocaleString('id-ID');
    return `${sign}Rp ${val} Rb`;
  }

  return `${sign}Rp ${Math.round(abs).toLocaleString('id-ID')}`;
}

/**
 * Formats a lot count in Indonesian locale with optional sign.
 *
 * @param {number} lots - Number of BEI lots (1 lot = 100 shares).
 * @param {boolean} [withSign=false] - Prefix positive numbers with '+'.
 * @returns {string} Formatted lot string (e.g. "+4.000 Lot").
 */
export function formatFlowLots(lots, withSign = false) {
  const num = Math.round(Number(lots) || 0);
  if (num === 0) return '0 Lot';
  const sign = num < 0 ? '-' : (withSign && num > 0 ? '+' : '');
  return `${sign}${Math.abs(num).toLocaleString('id-ID')} Lot`;
}

/**
 * Returns semantic Bursa 1985 text and container classes for a signed netflow value.
 *
 * @param {number} netflowRp - Netflow in Rupiah.
 * @returns {{ textClass: string, boxClass: string, prefixIcon: string }}
 */
export function getNetflowTone(netflowRp) {
  const num = Number(netflowRp) || 0;
  if (num > 0) {
    return {
      textClass: 'text-up',
      boxClass: 'bg-up-soft border-up text-up',
      prefixIcon: '▲',
    };
  }
  if (num < 0) {
    return {
      textClass: 'text-down',
      boxClass: 'bg-down-soft border-down text-down',
      prefixIcon: '▼',
    };
  }
  return {
    textClass: 'text-muted',
    boxClass: 'bg-sunken border-line text-muted',
    prefixIcon: '−',
  };
}

/**
 * Returns label and semantic badge class for the dominant flow classification.
 *
 * @param {string} dominantPlayer - Dominant flow key from transactionFlowEngine.
 * @returns {{ label: string, badgeClass: string }}
 */
export function getDominantFlowBadge(dominantPlayer) {
  return DOMINANT_FLOW_META[dominantPlayer] || DOMINANT_FLOW_META.BALANCED;
}

/**
 * Returns label and semantic badge class for the window data source ('idx' | 'hybrid' | 'estimated').
 *
 * @param {string} source - Window source identifier.
 * @returns {{ label: string, badgeClass: string }}
 */
export function getFlowSourceBadge(source) {
  return SOURCE_META[source] || SOURCE_META.estimated;
}

/**
 * Computes the buy vs sell bar percentages (summing to 100%) for a participant's gross flows.
 *
 * @param {number} inflowRp - Gross buy in Rupiah.
 * @param {number} outflowRp - Gross sell in Rupiah.
 * @returns {{ buyPct: number, sellPct: number }}
 */
export function computeGrossSplitPct(inflowRp, outflowRp) {
  const buy = Math.max(0, Number(inflowRp) || 0);
  const sell = Math.max(0, Number(outflowRp) || 0);
  const total = buy + sell;
  if (total <= 0) {
    return { buyPct: 50, sellPct: 50 };
  }
  const buyPct = Math.min(100, Math.max(0, Math.round((buy / total) * 100)));
  return { buyPct, sellPct: 100 - buyPct };
}

