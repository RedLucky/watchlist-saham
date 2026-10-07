'use client';

import { useState } from 'react';
import { readThemeTokens } from '@/lib/chartTheme';
import {
  INITIAL_CAPITAL,
  buildEquityCurve,
  getEquityRange,
  toSvgCoords,
  toPathData,
  closeAreaPath,
} from '@/lib/backtestEquity';
import { PageShell, PageHeader, PageToolbar, SectionTitle } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { StatCard } from './ui/StatCard';
import { TechnicalSummary } from './ui/TechnicalSummary';

const STYLES = [
  { value: 'scalping', label: 'Scalping' },
  { value: 'daily', label: 'Daily' },
  { value: 'swing', label: 'Swing' },
];

/**
 * Formats an amount in rupiah.
 * @param {unknown} value
 * @returns {string}
 */
function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

/**
 * Equity curve chart: capital after every trade, with the starting capital as a baseline.
 *
 * @param {object} props
 * @param {Array<object>} props.points - Curve points from `buildEquityCurve`.
 * @param {boolean} props.profitable - Whether the run ended above the starting capital.
 * @param {number} props.maxDrawdown - Deepest drawdown in percent.
 */
function EquityCurveChart({ points, profitable, maxDrawdown }) {
  const tokens = readThemeTokens(true);
  const width = 900;
  const height = 220;
  const padding = 24;

  const coords = toSvgCoords(points, { width, height, padding, metric: 'capital' });
  const range = getEquityRange(points.map((p) => p.capital));
  const line = toPathData(coords);
  const baselineY = height - padding - ((INITIAL_CAPITAL - range.min) / range.range) * (height - padding * 2);
  const area = closeAreaPath(line, coords, height - padding);
  const stroke = profitable ? tokens.up : tokens.down;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="section-title">Kurva Pertumbuhan Ekuitas</h3>
          <p className="section-subtitle mt-0.5">Modal awal {formatCurrency(INITIAL_CAPITAL)} across {points.length - 1} transaksi</p>
        </div>
        <span className={`badge ${profitable ? 'badge-up' : 'badge-down'}`}>Max drawdown -{maxDrawdown.toFixed(1)}%</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" role="img" aria-label="Kurva pertumbuhan ekuitas">
        <line x1={padding} y1={baselineY} x2={width - padding} y2={baselineY} stroke={tokens.muted} strokeDasharray="4 4" opacity="0.45" />
        <text x={padding + 4} y={baselineY - 6} fill={tokens.muted} fontSize="11">Modal awal</text>
        <path d={area} fill={stroke} opacity="0.12" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === 0 || i === coords.length - 1 ? 4 : 2.5} fill={stroke}>
            <title>{`${points[i].date}: ${formatCurrency(points[i].capital)} (drawdown -${points[i].drawdown}%)`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

/**
 * Underwater drawdown chart: how far below the running peak the equity was at each trade.
 *
 * @param {object} props
 * @param {Array<object>} props.points - Curve points from `buildEquityCurve`.
 * @param {number} props.maxDrawdown - Deepest drawdown in percent.
 */
function DrawdownChart({ points, maxDrawdown }) {
  const tokens = readThemeTokens(true);
  const width = 900;
  const height = 90;
  const padding = 18;

  const scale = Math.max(10, Math.ceil(maxDrawdown * 1.15));
  const coords = toSvgCoords(points, { width, height, padding, metric: 'drawdown', drawdownScale: scale });
  const line = toPathData(coords);
  const area = closeAreaPath(line, coords, padding);

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="section-title">Profil Drawdown</h3>
        <span className="badge badge-down">Palung -{maxDrawdown.toFixed(1)}%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" role="img" aria-label="Profil drawdown">
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={tokens.muted} opacity="0.35" />
        <text x={padding + 4} y={padding - 5} fill={tokens.muted} fontSize="10">Puncak ekuitas</text>
        <path d={area} fill={tokens.down} opacity="0.15" />
        <path d={line} fill="none" stroke={tokens.down} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          points[i].drawdown > 0 && (
            <circle key={i} cx={c.x} cy={c.y} r={2} fill={tokens.down}>
              <title>{`${points[i].date}: -${points[i].drawdown}%`}</title>
            </circle>
          )
        ))}
      </svg>
    </div>
  );
}

/**
 * Backtest report for one ticker and trading style: equity curve, drawdown profile,
 * trade list and the configuration used.
 */
export default function BacktestPanel() {
  const [ticker, setTicker] = useState('BBCA');
  const [style, setStyle] = useState('swing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runBacktest = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backtest?ticker=${ticker.toUpperCase()}&style=${style}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menjalankan backtest');
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const curve = result ? buildEquityCurve(result.trades) : null;
  const summary = result?.summary;

  return (
    <PageShell className="animate-fade-in">
      <PageHeader
        title="Backtest"
        subtitle="Uji strategi satu saham dengan data satu tahun terakhir: kurva ekuitas, drawdown, dan daftar transaksinya"
        badge={result ? <span className="badge badge-outline">{result.style}</span> : null}
      />

      {/* Controls stay reachable while reading a long trade list */}
      <PageToolbar
        meta={result ? <span className="badge">{result.ticker || ticker}</span> : null}
      >
        <div className="w-32">
          <label htmlFor="backtest-ticker" className="sr-only">Simbol Saham</label>
          <input
            id="backtest-ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="BBCA"
            className="input font-mono uppercase min-h-9 py-1.5"
          />
        </div>

        <div className="tabs" role="group" aria-label="Gaya trading">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              aria-pressed={style === s.value}
              className="tab"
            >
              {s.label}
            </button>
          ))}
        </div>

        <button onClick={runBacktest} disabled={loading || !ticker} className="btn-primary min-h-9">
          {loading ? 'Mensimulasikan...' : 'Jalankan Backtest'}
        </button>
      </PageToolbar>

      {error && (
        <div role="alert" className="alert alert-down">
          <span aria-hidden="true">▲</span>
          <span>{error}</span>
        </div>
      )}

      {!result && !loading && (
        <div className="card p-10 text-center">
          <h3 className="section-title">Belum ada hasil</h3>
          <p className="section-subtitle mt-1">
            Pilih simbol saham dan gaya trading, lalu jalankan backtest untuk melihat kurva ekuitas dan daftar transaksinya.
          </p>
        </div>
      )}

      {result && (
        <>
          {/* ── RINGKASAN HASIL ── */}
          <section>
            <SectionTitle note={`${summary.totalTrades} transaksi`}>Ringkasan</SectionTitle>
            <AutoGrid minWidth="200px">
              <StatCard
                label="Win Rate"
                value={`${summary.winRate.toFixed(1)}%`}
                hint={`${summary.wins} menang · ${summary.losses} kalah`}
                tone={summary.winRate >= 50 ? 'up' : 'down'}
              />
              <StatCard
                label="Return Bersih"
                value={`${summary.netReturn >= 0 ? '+' : ''}${summary.netReturn.toFixed(2)}%`}
                hint="Pertumbuhan modal"
                tone={summary.netReturn >= 0 ? 'up' : 'down'}
              />
              <StatCard label="Modal Akhir" value={formatCurrency(summary.finalCapital)} hint={`Mulai ${formatCurrency(INITIAL_CAPITAL)}`} />
              <StatCard
                label="Rata-rata Hold"
                value={`${Number(summary.avgHoldDays || 0).toFixed(1)} hari`}
                hint="Per posisi"
              />
              <StatCard
                label="Max Drawdown"
                value={`-${curve.maxDrawdown.toFixed(1)}%`}
                hint="Penurunan terdalam"
                tone="down"
              />
            </AutoGrid>
          </section>

          {/* ── GRAFIK ── */}
          {result.trades.length > 0 ? (
            <section className="grid gap-3 xl:grid-cols-2">
              <EquityCurveChart points={curve.points} profitable={curve.netReturn >= 0} maxDrawdown={curve.maxDrawdown} />
              <DrawdownChart points={curve.points} maxDrawdown={curve.maxDrawdown} />
            </section>
          ) : (
            <div className="card p-6 text-center text-muted text-xs">
              Tidak ada setup entry yang valid untuk saham dan gaya trading ini sepanjang periode backtest.
            </div>
          )}

          {/* ── KONFIGURASI (TEKNIS) ── */}
          <TechnicalSummary title="Konfigurasi Backtest" badge={<span className="badge badge-outline">{result.ticker || ticker}</span>}>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Moving Average', value: `${result.config?.maShort} / ${result.config?.maLong}` },
                { label: 'Periode RSI', value: result.config?.rsiPeriod },
                { label: 'TP / SL', value: `${result.config?.tpPercent}% / ${result.config?.slPercent}%` },
                { label: 'Biaya per sisi', value: `${Number(result.config?.feePerSidePercent || 0).toFixed(2)}%` },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="label-mono">{item.label}</dt>
                  <dd className="font-mono text-sm text-ink mt-0.5">{item.value}</dd>
                </div>
              ))}
            </dl>
          </TechnicalSummary>

          {/* ── DAFTAR TRANSAKSI ── */}
          <section>
            <SectionTitle note={`gaya ${result.style}`}>Riwayat Transaksi</SectionTitle>
            <div className="card overflow-hidden">
              <div className="scroll-area" style={{ maxHeight: '420px' }}>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Masuk</th>
                      <th>Keluar</th>
                      <th className="num">Harga Beli</th>
                      <th className="num">Harga Jual</th>
                      <th>Alasan Exit</th>
                      <th className="num">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade, index) => (
                      <tr key={index}>
                        <td className="font-mono text-xs">{trade.entryDate}</td>
                        <td className="font-mono text-xs">{trade.exitDate}</td>
                        <td className="num">{formatCurrency(trade.entryPrice)}</td>
                        <td className="num">{formatCurrency(trade.exitPrice)}</td>
                        <td className="text-xs text-muted">{trade.reason || '-'}</td>
                        <td className="num">
                          <span className={`badge ${Number(trade.pnlPercent) >= 0 ? 'badge-up' : 'badge-down'}`}>
                            {Number(trade.pnlPercent) >= 0 ? '+' : ''}{Number(trade.pnlPercent).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}