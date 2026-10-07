'use client';

import { useState } from 'react';
import StockOwnershipModal from './StockOwnershipModal';
import { PageShell, PageHeader } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { IndexBadgeList } from './IndexBadges';

// ── Formatting Helpers ────────────────────────────────────────────────────────

const formatPrice = (price) => {
 const value = Number(price);
 if (!Number.isFinite(value)) return '-';
 return new Intl.NumberFormat('id-ID').format(value);
};

/** Format volume (lembar saham) seperti RTI: 459,9jt / 12,3jt / 800rb */
const formatVolume = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v) || v <= 0) return '-';
 if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
 if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}jt`;
 if (v >= 1_000) return `${(v / 1_000).toFixed(1)}rb`;
 return v.toLocaleString('id-ID');
};

/** Format turnover (nilai IDR) — T / M / jt */
const formatTurnover = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v) || v <= 0) return '-';
 if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}T`;
 if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
 if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
 return v.toLocaleString('id-ID');
};

const formatPercent = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v)) return '-';
 const sign = v > 0 ? '+' : '';
 return `${sign}${v.toFixed(2)}%`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Format absolute price change: +125 / -50 */
const formatPriceChange = (price, prevClose) => {
 const diff = Number(price) - Number(prevClose);
 if (!Number.isFinite(diff) || diff === 0) return null;
 const sign = diff > 0 ? '+' : '';
 return `${sign}${formatPrice(diff)}`;
};

/** Column template shared by the header, the skeleton and every row so they stay aligned.
 *  #  rank | saham | sektor | volume | nilai transaksi | harga + perubahan  */
const MOVER_GRID = 'grid items-center gap-3 grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)]';

/** Format a rupiah turnover compactly, e.g. 12,3 M / 850 jt. */
const formatTurnoverShort = (val) => {
  const v = Number(val);
  if (!Number.isFinite(v) || v <= 0) return '-';
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(2)} T`;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} jt`;
  return v.toLocaleString('id-ID');
};

/**
 * One row of a movers list: rank, ticker, sector, volume, turnover and price with its
 * daily change. Clicking a row opens the stock.
 */
function MoverRow({ item, type, index, onSelectStock }) {
  const isTrending = type === 'trending';
  const isGainer = type === 'gainers';
  const isUnusual = type === 'unusual';

  const pct = Number(item.changePercent);
  const changeColor = pct > 0 ? 'text-up' : pct < 0 ? 'text-down' : 'text-muted';
  const pctBg = pct > 0 ? 'bg-up-soft border-up' : pct < 0 ? 'bg-down-soft border-down' : 'bg-sunken border-line';

  const avatarStyle = isTrending ? 'text-warn' : isGainer ? 'text-up' : isUnusual ? 'text-ink' : 'text-down';

  const priceChange = formatPriceChange(item.price, item.prevClose);

  return (
    <div
      onClick={() => onSelectStock && onSelectStock(item)}
      className={`${MOVER_GRID} py-2.5 px-3 rounded-sm hover:bg-sunken transition-colors duration-150 group cursor-pointer animate-fade-in stagger-${Math.min(index + 1, 10)}`}
      style={{ opacity: 0 }}
    >
      {/* Rank */}
      <div className="text-xs text-muted font-mono text-right tabular-nums">{index + 1}</div>

      {/* Ticker + name + market cap */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-9 h-9 rounded-sm ${avatarStyle} border border-line flex items-center justify-center text-xs font-semibold shrink-0`}>
          {item.ticker.substring(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink leading-tight truncate">{item.ticker}</div>
          <div className="text-xs text-muted leading-tight truncate">{item.name}</div>
          <IndexBadgeList tickers={[item.ticker]} max={1} />
        </div>
      </div>

      {/* Sector */}
      <div className="text-xs text-muted truncate">{item.sector || '-'}</div>

      {/* Volume (lembar) */}
      <div className="text-right">
        <div className="text-sm font-mono text-ink tabular-nums">{formatVolume(item.volume)}</div>
        {isUnusual && item.volumeRatio && (
          <div className="text-xs font-mono text-warn tabular-nums">{item.volumeRatio}x avg</div>
        )}
      </div>

      {/* Transaction value */}
      <div className="text-right">
        <div className="text-sm font-mono text-ink tabular-nums">{formatTurnoverShort(item.turnover)}</div>
        {item.marketCap != null && (
          <div className="text-xs font-mono text-muted tabular-nums">
            MCap {(item.marketCap / 1_000_000_000_000).toFixed(1)}T
          </div>
        )}
      </div>

      {/* Price + absolute and percentage change */}
      <div className="text-right">
        <div className="text-base font-semibold text-ink leading-tight tabular-nums">{formatPrice(item.price)}</div>
        <div className="flex items-center justify-end gap-1.5 mt-0.5">
          {priceChange && <span className={`text-xs font-mono ${changeColor} tabular-nums`}>{priceChange}</span>}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-sm border ${pctBg} ${changeColor} inline-block`}>
            {formatPercent(item.changePercent)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Card for one movers list (trending / gainers / losers / unusual).
 */
function MoverCard({ title, subtitle, icon, items, type, loading, onSelectStock }) {
  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 shrink-0 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none" aria-hidden="true">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-ink leading-tight">{title}</h3>
            <p className="text-xs text-muted leading-tight">{subtitle}</p>
          </div>
          {!loading && <span className="ml-auto badge shrink-0">Top {items.length}</span>}
        </div>
      </div>

      {/* Column labels */}
      {!loading && items.length > 0 && (
        <div className={`${MOVER_GRID} px-3 py-2 bg-sunken border-b border-line label-mono`}>
          <span className="text-right">#</span>
          <span>Saham</span>
          <span>Sektor</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Nilai</span>
          <span className="text-right">Harga / ± / %</span>
        </div>
      )}

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-2 py-1" style={{ maxHeight: '520px' }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${MOVER_GRID} py-2.5 px-3`}>
              <div className="skeleton h-3.5 w-5 ml-auto rounded-sm" />
              <div className="flex items-center gap-2.5">
                <div className="skeleton w-9 h-9 rounded-sm shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton h-3.5 w-14 rounded" />
                  <div className="skeleton h-2.5 w-24 rounded" />
                </div>
              </div>
              <div className="skeleton h-3 w-16 rounded" />
              <div className="flex flex-col gap-1 items-end">
                <div className="skeleton h-3.5 w-16 rounded" />
                <div className="skeleton h-2.5 w-12 rounded" />
              </div>
              <div className="flex flex-col gap-1 items-end">
                <div className="skeleton h-3.5 w-16 rounded" />
                <div className="skeleton h-2.5 w-12 rounded" />
              </div>
              <div className="flex flex-col gap-1 items-end">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-3 w-14 rounded" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted">Tidak ada data</div>
        ) : (
          items.map((item, index) => (
            <MoverRow key={item.ticker} item={item} type={type} index={index} onSelectStock={onSelectStock} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function MarketMovers({ data, loading }) {
 const [selectedOwnershipStock, setSelectedOwnershipStock] = useState(null);

 return (
 <PageShell>
      <PageHeader
        title="Market Movers"
        subtitle="Saham yang paling aktif, naik, turun, dan volumenya di luar kebiasaalan hari ini"
        badge={<span className="badge badge-outline">real-time BEI</span>}
      />

      {/* Cards grow to fill the width instead of stopping at two columns */}
      <AutoGrid minWidth="520px" className="items-start">
        <MoverCard
          title="Top Trending"
          subtitle="Paling aktif diperdagangkan (volume lembar)"
          icon="↑"
          type="trending"
          items={data?.trending ?? []}
          loading={loading}
          onSelectStock={setSelectedOwnershipStock}
        />
        <MoverCard
          title="Top Gainer"
          subtitle="Kenaikan harga tertinggi hari ini"
          icon="↑"
          type="gainers"
          items={data?.gainers ?? []}
          loading={loading}
          onSelectStock={setSelectedOwnershipStock}
        />
        <MoverCard
          title="Top Loser"
          subtitle="Penurunan terdalam hari ini"
          icon="↘"
          type="losers"
          items={data?.losers ?? []}
          loading={loading}
          onSelectStock={setSelectedOwnershipStock}
        />
        <MoverCard
          title="Unusual Volume"
          subtitle="Volume jauh di atas rata-rata 3 bulan"
          icon="»"
          type="unusual"
          items={data?.unusualVolume ?? []}
          loading={loading}
          onSelectStock={setSelectedOwnershipStock}
        />
      </AutoGrid>

      <StockOwnershipModal
   stock={selectedOwnershipStock}
   isOpen={Boolean(selectedOwnershipStock)}
   onClose={() => setSelectedOwnershipStock(null)}
 />
 </PageShell>
  );
}
