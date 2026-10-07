'use client';

/**
 * Formats a number in Indonesian locale.
 * @param {unknown} value
 * @param {number} [digits=2] - Maximum fraction digits.
 * @returns {string} Formatted number or "-".
 */
function formatNumber(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/**
 * Formats a percentage with sign, e.g. "+1.25%".
 * @param {unknown} value
 * @returns {string}
 */
function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/**
 * Four market summary cards: IHSG, market breadth, liquidity and the auto-detected strategy.
 * Two columns on phones, four from lg.
 *
 * @param {object} props
 * @param {object|null} props.market - Result of GET /api/market.
 */
export default function MarketBadge({ market }) {
  if (!market) return null;

  const isUp = market.index?.trend === 'up' || (market.index?.change || 0) > 0;
  const isDown = market.index?.trend === 'down' || (market.index?.change || 0) < 0;
  const trendTone = isUp ? 'text-up' : isDown ? 'text-down' : 'text-warn';
  const trendBadge = isUp ? 'badge-up' : isDown ? 'badge-down' : 'badge-warn';
  const trendLabel = isUp ? 'Bullish Uptrend' : isDown ? 'Bearish Correction' : 'Konsolidasi';

  const advance = Number(market.advanceDecline?.advance) || 0;
  const decline = Number(market.advanceDecline?.decline) || 0;
  const unchanged = Number(market.advanceDecline?.unchanged) || 0;
  const totalStocks = advance + decline + unchanged || 1;
  const advanceRatio = Math.round((advance / totalStocks) * 100);
  const declineRatio = Math.round((decline / totalStocks) * 100);
  const isBullishDominant = advance >= decline;

  const volRatio = Number(market.volume?.vsAverage || 1);
  const volPercentDiff = (volRatio - 1) * 100;

  let volActivityLabel = 'Partisipasi moderat';
  let volActivityTone = 'text-ink';
  if (volRatio >= 1.2) {
    volActivityLabel = 'Partisipasi tinggi';
    volActivityTone = 'text-up';
  } else if (volRatio < 0.8) {
    volActivityLabel = 'Partisipasi rendah';
    volActivityTone = 'text-down';
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {/* Card 1: IHSG */}
      <section className="card p-3 sm:p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="label-mono">Indeks BEI</h3>
          <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-up' : isDown ? 'bg-down' : 'bg-warn'} animate-pulse`} aria-hidden="true" />
        </div>
        <p className="mt-1.5 font-mono text-xl sm:text-2xl font-semibold text-ink tabular-nums leading-tight">
          {formatNumber(market.index?.value)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`badge ${trendBadge}`}>
            <span aria-hidden="true">{isUp ? '▲' : isDown ? '▼' : '■'}</span>
            {formatPercent(market.index?.change)}
          </span>
          <span className="text-[11px] text-muted truncate">{market.index?.name || 'IHSG Composite'}</span>
        </div>
        <p className={`mt-auto pt-2 text-[11px] font-medium ${trendTone}`}>{trendLabel}</p>
      </section>

      {/* Card 2: Market breadth */}
      <section className="card p-3 sm:p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="label-mono">Kedalaman Pasar</h3>
          <span className={`badge ${isBullishDominant ? 'badge-up' : 'badge-down'}`}>
            {isBullishDominant ? 'Dominan beli' : 'Tekanan jual'}
          </span>
        </div>
        <div
          className="mt-3 w-full h-1.5 rounded-sm bg-sunken overflow-hidden flex"
          role="img"
          aria-label={`${advanceRatio}% emiten menguat, ${declineRatio}% melemah`}
        >
          <div style={{ width: `${advanceRatio}%` }} className="bg-up transition-[width] duration-500" />
          <div style={{ width: `${declineRatio}%` }} className="bg-down transition-[width] duration-500" />
        </div>
        <dl className="mt-auto pt-2.5 grid grid-cols-3 text-center">
          <div>
            <dd className="font-mono text-sm font-semibold text-up tabular-nums">{advance}</dd>
            <dt className="text-[10px] text-muted">Naik</dt>
          </div>
          <div className="border-x border-line">
            <dd className="font-mono text-sm font-semibold text-down tabular-nums">{decline}</dd>
            <dt className="text-[10px] text-muted">Turun</dt>
          </div>
          <div>
            <dd className="font-mono text-sm font-semibold text-ink tabular-nums">{unchanged}</dd>
            <dt className="text-[10px] text-muted">Tetap</dt>
          </div>
        </dl>
      </section>

      {/* Card 3: Liquidity */}
      <section className="card p-3 sm:p-4 flex flex-col">
        <h3 className="label-mono">Likuiditas Pasar</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <span className="font-mono text-xl sm:text-2xl font-semibold text-ink tabular-nums leading-tight">
            {volRatio.toFixed(2)}x
          </span>
          <span className={`badge ${volPercentDiff >= 0 ? 'badge-up' : 'badge-down'}`}>
            {volPercentDiff >= 0 ? '+' : ''}{volPercentDiff.toFixed(1)}%
          </span>
        </div>
        <p className="text-[11px] text-muted mt-1">Volume vs rata-rata 3 bulan</p>
        <p className={`mt-auto pt-2 text-[11px] font-medium ${volActivityTone}`}>{volActivityLabel}</p>
      </section>

      {/* Card 4: Auto-detected strategy regime */}
      <section className="card p-3 sm:p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="label-mono">Rezim Strategi AI</h3>
          <span className="badge badge-outline">Aktif</span>
        </div>
        <p className="mt-1.5 font-serif text-base font-semibold text-ink leading-tight">
          {market.autoMode?.label || 'Strategi Seimbang'}
        </p>
        <p className="text-[11px] text-muted mt-1 line-clamp-2">
          {market.autoMode?.description || 'Optimalkan rasio valuasi dan momentum'}
        </p>
        <p className="mt-auto pt-2 text-[11px] font-medium text-ink">Fokus swing emiten teratas</p>
      </section>
    </div>
  );
}
