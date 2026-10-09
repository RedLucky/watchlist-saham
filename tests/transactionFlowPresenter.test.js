/**
 * @fileoverview Unit tests for transactionFlowPresenter and TransactionFlowPanel mounting (TASK-7915).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PERIOD_ORDER,
  formatFlowRupiah,
  formatFlowLots,
  getNetflowTone,
  getDominantFlowBadge,
  getFlowSourceBadge,
  computeGrossSplitPct,
} from '../src/lib/transactionFlowPresenter.js';

describe('transactionFlowPresenter — formatting & tone helpers', () => {
  it('formatFlowRupiah formats Triliun, Miliar, Juta, Ribu, and small values with optional sign', () => {
    assert.equal(formatFlowRupiah(0), 'Rp 0');
    assert.equal(formatFlowRupiah(NaN), 'Rp 0');
    assert.equal(formatFlowRupiah(1_250_000_000_000, true), '+Rp 1,25 T');
    assert.equal(formatFlowRupiah(-140_000_000_000, true), '-Rp 140,0 M');
    assert.equal(formatFlowRupiah(5_500_000, false), 'Rp 5,5 Jt');
    assert.equal(formatFlowRupiah(25_000, true), '+Rp 25 Rb');
    assert.equal(formatFlowRupiah(500, false), 'Rp 500');
  });

  it('formatFlowLots formats positive, negative, and zero lots with optional sign', () => {
    assert.equal(formatFlowLots(0, true), '0 Lot');
    assert.equal(formatFlowLots(4000, true), '+4.000 Lot');
    assert.equal(formatFlowLots(-2500, true), '-2.500 Lot');
    assert.equal(formatFlowLots(1200, false), '1.200 Lot');
  });

  it('getNetflowTone returns Bursa 1985 semantic classes for positive, negative, and zero netflow', () => {
    const pos = getNetflowTone(1_000_000);
    assert.equal(pos.textClass, 'text-up');
    assert.equal(pos.prefixIcon, '▲');

    const neg = getNetflowTone(-1_000_000);
    assert.equal(neg.textClass, 'text-down');
    assert.equal(neg.prefixIcon, '▼');

    const zero = getNetflowTone(0);
    assert.equal(zero.textClass, 'text-muted');
    assert.equal(zero.prefixIcon, '−');
  });

  it('getDominantFlowBadge and getFlowSourceBadge map all classifications and fallback safely', () => {
    assert.equal(getDominantFlowBadge('FOREIGN_ACCUMULATION').label, '▲ AKUMULASI ASING');
    assert.equal(getDominantFlowBadge('DOMESTIC_ACCUMULATION').label, '▲ AKUMULASI DOMESTIK');
    assert.equal(getDominantFlowBadge('FOREIGN_DISTRIBUTION').label, '▼ DISTRIBUSI ASING');
    assert.equal(getDominantFlowBadge('DOMESTIC_DISTRIBUTION').label, '▼ DISTRIBUSI DOMESTIK');
    assert.equal(getDominantFlowBadge('UNKNOWN').label, '− ARUS SEIMBANG');

    assert.equal(getFlowSourceBadge('idx').label, 'DATA RESMI BEI');
    assert.equal(getFlowSourceBadge('hybrid').label, 'HIBRIDA BEI + KSEI');
    assert.equal(getFlowSourceBadge('estimated').label, 'ESTIMASI OHLCV + KSEI');
    assert.equal(getFlowSourceBadge('empty').label, 'BELUM ADA DATA');
    assert.equal(getFlowSourceBadge('unknown').label, 'ESTIMASI OHLCV + KSEI');
  });

  it('computeGrossSplitPct returns balanced 50/50 on zero turnover and accurate buy/sell split otherwise', () => {
    assert.deepEqual(computeGrossSplitPct(0, 0), { buyPct: 50, sellPct: 50 });
    assert.deepEqual(computeGrossSplitPct(300, 100), { buyPct: 75, sellPct: 25 });
    assert.deepEqual(PERIOD_ORDER, ['1d', '1w', '1m', '1y']);
  });
});

describe('TransactionFlowPanel — UI mounting in DetailPanel and StockExplorer', () => {
  it('mounts TransactionFlowPanel in DetailPanel.jsx and StockExplorer.jsx', () => {
    const detailPanelSrc = readFileSync('src/components/DetailPanel.jsx', 'utf8');
    const stockExplorerSrc = readFileSync('src/components/StockExplorer.jsx', 'utf8');
    const panelSrc = readFileSync('src/components/TransactionFlowPanel.jsx', 'utf8');

    assert.match(detailPanelSrc, /import TransactionFlowPanel from '\.\/TransactionFlowPanel'/);
    assert.match(detailPanelSrc, /<TransactionFlowPanel/);
    assert.match(stockExplorerSrc, /import TransactionFlowPanel from '\.\/TransactionFlowPanel'/);
    assert.match(stockExplorerSrc, /<TransactionFlowPanel/);
    assert.match(panelSrc, /Investor Asing \(Foreign\)/);
    assert.match(panelSrc, /Investor Domestik \(Lokal\)/);
  });
});

