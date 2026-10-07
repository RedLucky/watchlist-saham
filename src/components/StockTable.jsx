'use client';

import { useState } from 'react';
import ScoreBadge from './ScoreBadge';
import DetailPanel from './DetailPanel';
import Tooltip from './Tooltip';
import StockOwnershipModal from './StockOwnershipModal';
import { getSignalBadgeClass, getRiskTone, getChangeTone } from '@/lib/uiTones';
import { PageToolbar } from './ui/PageShell';

/** Desktop column template shared by the header and every row so they stay aligned.
 *  #  saham | harga | % chg | skor | ST+DEMA | area beli | target | cut loss | risiko | sektor  */
const RANKING_GRID =
  'md:grid-cols-[minmax(0,2.3fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]';

/**
 * Small triangle showing the sort state of a column header.
 * @param {{ active: boolean, asc: boolean }} props
 */
function SortIcon({ active, asc }) {
  return (
    <span className={`ml-1 font-mono text-[9px] ${active ? 'text-ink' : 'text-muted opacity-60'}`} aria-hidden="true">
      {active && asc ? '▲' : '▼'}
    </span>
  );
}

/**
 * Formats a price in Indonesian locale, or "-" when missing.
 * @param {unknown} price
 * @returns {string}
 */
function formatPrice(price) {
  const value = Number(price);
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Percentage distance from `basePrice` to `nextPrice`, e.g. "+8.5%".
 * @param {unknown} basePrice
 * @param {unknown} nextPrice
 * @param {boolean} [withPlus=false] - Prefix positive values with "+".
 * @returns {string}
 */
function formatPercentFromPrice(basePrice, nextPrice, withPlus = false) {
  const base = Number(basePrice);
  const next = Number(nextPrice);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(next)) return '-';
  const value = (((next - base) / base) * 100).toFixed(1);
  return withPlus ? `+${value}%` : `${value}%`;
}

/** Whether a stock has a Supertrend + DEMA buy signal. */
function isBuySignal(stock) {
  const sig = stock.supertrendDema?.signal;
  return sig === 'BUY' || sig === 'STRONG_BUY';
}

/**
 * Ranked stock list for the Analisis Saham page: search, quick filters, sortable columns
 * and an expandable detail panel per stock. Desktop shows a table-like grid; phones show
 * one card per stock with the key trade levels.
 *
 * @param {object} props
 * @param {Array<object>} props.stocks - Scored stocks from /api/stocks.
 * @param {boolean} props.loading - Data is loading.
 * @param {string} [props.mode] - Strategy mode (passed to DetailPanel).
 * @param {string} [props.style] - Trading style (passed to DetailPanel).
 */
export default function StockTable({ stocks, loading, mode, style }) {
  const [expandedTicker, setExpandedTicker] = useState(null);
  const [selectedOwnershipStock, setSelectedOwnershipStock] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const sortedStocks = [...(stocks || [])].sort((a, b) => {
    let aVal;
    let bVal;
    switch (sortBy) {
      case 'score': aVal = a.score; bVal = b.score; break;
      case 'ticker': aVal = a.ticker; bVal = b.ticker; break;
      case 'riskReward': aVal = a.riskReward; bVal = b.riskReward; break;
      case 'sector': aVal = a.sector; bVal = b.sector; break;
      default: aVal = a.score; bVal = b.score;
    }
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const filteredStocks = sortedStocks.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTicker = s.ticker?.toLowerCase().includes(q);
      const matchName = s.name?.toLowerCase().includes(q);
      const matchSector = s.sector?.toLowerCase().includes(q);
      if (!matchTicker && !matchName && !matchSector) return false;
    }
    if (filterTab === 'TOP_SCORE') return s.score >= 80;
    if (filterTab === 'BUY_SIGNAL') return isBuySignal(s);
    if (filterTab === 'HIGH_RR') return (s.riskReward || 0) >= 2.0;
    return true;
  });

  if (loading) {
    return (
      <div className="card p-4 space-y-2" aria-busy="true" aria-label="Memuat daftar saham">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h3 className="section-title mb-1">Tidak ada saham yang sesuai kriteria</h3>
        <p className="section-subtitle">
          Coba ganti ke mode yang lebih longgar (misal: Pertumbuhan atau Seimbang) untuk melihat hasil.
        </p>
      </div>
    );
  }

  const filters = [
    { id: 'ALL', label: 'Semua', count: stocks.length },
    { id: 'TOP_SCORE', label: 'Skor ≥ 80', count: stocks.filter((s) => s.score >= 80).length },
    { id: 'BUY_SIGNAL', label: 'Sinyal BUY', count: stocks.filter(isBuySignal).length },
    { id: 'HIGH_RR', label: 'R:R ≥ 2.0', count: stocks.filter((s) => (s.riskReward || 0) >= 2.0).length },
  ];

  return (
    <>
      {/* Sticky controls: search and filters stay reachable while scrolling the ranking */}
      <PageToolbar
        meta={(
          <span className="badge" aria-live="polite">
            {filteredStocks.length} / {stocks.length} saham
          </span>
        )}
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <label htmlFor="stock-table-search" className="sr-only">Cari saham</label>
          <input
            id="stock-table-search"
            type="search"
            placeholder="Cari ticker, nama emiten, atau sektor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted hover:text-ink focus-ring rounded-sm"
            >
              <span className="font-mono" aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <div className="tabs" role="group" aria-label="Filter cepat">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterTab(f.id)}
              aria-pressed={filterTab === f.id}
              className="tab"
            >
              {f.label}
              <span className="font-mono text-[10px] text-muted">{f.count}</span>
            </button>
          ))}
        </div>
      </PageToolbar>

      <section className="card overflow-hidden">
        <div className="px-3 sm:px-5 py-3 border-b border-line">
          <h2 className="section-title">Pilihan Saham Teratas</h2>
          <p className="section-subtitle mt-0.5">
            Algoritma multi-faktor, proyeksi Benjamin Graham & sinyal tren IDX
          </p>
        </div>

      {/* Desktop column headers */}
      <div className={`hidden md:grid ${RANKING_GRID} gap-3 px-5 py-2 bg-sunken border-b border-line-strong label-mono`}>
        <button type="button" className="text-left hover:text-ink focus-ring" onClick={() => handleSort('ticker')} aria-label="Urutkan berdasarkan ticker">
          Saham <SortIcon active={sortBy === 'ticker'} asc={sortAsc} />
        </button>
        <div className="text-right">Harga</div>
        <div className="text-right">% Chg</div>
        <div className="flex justify-center items-center gap-0.5">
          <Tooltip term="score">
            <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('score')} aria-label="Urutkan berdasarkan skor">
              Skor <SortIcon active={sortBy === 'score'} asc={sortAsc} />
            </button>
          </Tooltip>
        </div>
        <div className="flex justify-center"><Tooltip term="supertrendDema">ST+DEMA</Tooltip></div>
        <div className="text-right"><Tooltip term="entry">Area Beli</Tooltip></div>
        <div className="text-right"><Tooltip term="target">Target</Tooltip></div>
        <div className="text-right"><Tooltip term="stopLoss">Cut Loss</Tooltip></div>
        <div className="text-right flex items-center justify-end gap-0.5">
          <Tooltip term="riskLevel">
            <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('riskReward')} aria-label="Urutkan berdasarkan risk reward">
              Risiko <SortIcon active={sortBy === 'riskReward'} asc={sortAsc} />
            </button>
          </Tooltip>
        </div>
        <button type="button" className="text-left hover:text-ink focus-ring" onClick={() => handleSort('sector')} aria-label="Urutkan berdasarkan sektor">
          Sektor <SortIcon active={sortBy === 'sector'} asc={sortAsc} />
        </button>
      </div>

      {/* Empty search result */}
      {filteredStocks.length === 0 && (
        <div className="p-8 text-center space-y-2">
          <p className="text-sm font-medium text-ink">Tidak ada saham yang sesuai pencarian atau filter</p>
          <button type="button" onClick={() => { setSearchQuery(''); setFilterTab('ALL'); }} className="btn-secondary">
            Reset pencarian & filter
          </button>
        </div>
      )}

      {/* Rows */}
      <ul className="divide-y divide-line">
        {filteredStocks.map((stock, index) => {
          const isExpanded = expandedTicker === stock.ticker;
          const risk = getRiskTone(stock.riskLevel?.level);
          const signalBadge = getSignalBadgeClass(stock.supertrendDema?.signal);
          const changePct = Number(stock.changePercent || 0);
          const changeTone = getChangeTone(changePct);
          const toggle = () => setExpandedTicker(isExpanded ? null : stock.ticker);

          return (
            <li
              key={stock.ticker}
              className={`animate-fade-in stagger-${Math.min(index + 1, 10)}`}
              style={{ opacity: 0 }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${stock.ticker} — ${isExpanded ? 'tutup' : 'buka'} detail`}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className={`stock-row grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-3 sm:px-5 py-3 items-center focus-ring ${RANKING_GRID} ${
                  isExpanded ? 'bg-sunken' : ''
                }`}
              >
                {/* Stock identity */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-semibold text-ink text-sm">{stock.ticker}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOwnershipStock(stock);
                      }}
                      className="badge badge-outline hover:bg-sunken focus-ring"
                      title="Lihat struktur & riwayat kepemilikan KSEI"
                    >
                      Kepemilikan
                    </button>
                  </div>
                  <p className="text-xs text-muted truncate max-w-[220px]">{stock.name}</p>
                  {/* Phone-only meta */}
                  <div className="md:hidden flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-ink tabular-nums">{formatPrice(stock.price)}</span>
                    {stock.supertrendDema && <span className={`badge ${signalBadge}`}>{stock.supertrendDema.badge}</span>}
                    <span className="text-[11px] text-muted truncate">{stock.sector}</span>
                  </div>
                </div>

                {/* Price (desktop) */}
                <div className="hidden md:block text-right font-mono text-sm font-semibold text-ink tabular-nums">
                  {formatPrice(stock.price)}
                </div>

                {/* Daily change (desktop) */}
                <div className="hidden md:block text-right">
                  <span className={`badge ${changeTone === 'text-up' ? 'badge-up' : changeTone === 'text-down' ? 'badge-down' : ''}`}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                  </span>
                </div>

                {/* Score */}
                <div className="flex justify-end md:justify-center items-center gap-2">
                  <ScoreBadge score={stock.score} size="sm" />
                  <span className={`md:hidden font-mono text-xs text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
                </div>

                {/* Phone: key trade levels */}
                <dl className="md:hidden col-span-2 grid grid-cols-3 border border-line rounded-sm divide-x divide-line text-center">
                  <div className="py-1.5">
                    <dt className="label-mono text-[9px]">Area Beli</dt>
                    <dd className="font-mono text-[11px] text-ink tabular-nums">{formatPrice(stock.entry?.low)}–{formatPrice(stock.entry?.high)}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="label-mono text-[9px]">Target</dt>
                    <dd className="font-mono text-[11px] font-semibold text-up tabular-nums">{formatPrice(stock.target)}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="label-mono text-[9px]">Cut Loss · {stock.riskReward}:1</dt>
                    <dd className="font-mono text-[11px] font-semibold text-down tabular-nums">{formatPrice(stock.stopLoss)}</dd>
                  </div>
                </dl>

                {/* Signal (desktop) */}
                <div className="hidden md:flex flex-col items-center text-center">
                  {stock.supertrendDema ? (
                    <>
                      <span className={`badge ${signalBadge}`}>{stock.supertrendDema.badge}</span>
                      <span className="text-[10px] text-muted mt-0.5 truncate max-w-[120px]">{stock.supertrendDema.label}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                </div>

                {/* Entry (desktop) */}
                <div className="hidden md:block text-right">
                  <div className="font-mono text-sm text-ink tabular-nums">
                    {formatPrice(stock.entry?.low)} – {formatPrice(stock.entry?.high)}
                  </div>
                  <div className="text-[10px] text-muted capitalize">{stock.setup}</div>
                </div>

                {/* Target (desktop) */}
                <div className="hidden md:block text-right">
                  <div className="font-mono text-sm font-semibold text-up tabular-nums">{formatPrice(stock.target)}</div>
                  <div className="font-mono text-[10px] text-up">{formatPercentFromPrice(stock.price, stock.target, true)}</div>
                </div>

                {/* Stop loss (desktop) */}
                <div className="hidden md:block text-right">
                  <div className="font-mono text-sm font-semibold text-down tabular-nums">{formatPrice(stock.stopLoss)}</div>
                  <div className="font-mono text-[10px] text-down">{formatPercentFromPrice(stock.price, stock.stopLoss)}</div>
                </div>

                {/* Sector (desktop) */}
                <div className="hidden md:flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-muted truncate">{stock.sector || '-'}</span>
                  {stock.isSyariah && <span className="badge badge-outline shrink-0" title="Saham comply syariat">☾</span>}
                  {stock.isDividendTrap && (
                    <span className="badge badge-warn shrink-0" title="Terindikasi jebakan dividen">◈</span>
                  )}
                </div>

                {/* Risk (desktop) */}
                <div className="hidden md:flex items-center justify-end gap-2">
                  <span className={`font-mono text-sm font-semibold ${risk.text}`}>{stock.riskReward}:1</span>
                  <span className={`badge ${risk.badge}`}>{stock.riskLevel?.level}</span>
                  <span className={`font-mono text-xs text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
                </div>
              </div>

              {isExpanded && (
                <div className="relative z-10 border-t border-line bg-canvas">
                  <DetailPanel stock={stock} mode={mode} styleName={style} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <StockOwnershipModal
        stock={selectedOwnershipStock}
        isOpen={Boolean(selectedOwnershipStock)}
        onClose={() => setSelectedOwnershipStock(null)}
      />
      </section>
    </>
  );
}
