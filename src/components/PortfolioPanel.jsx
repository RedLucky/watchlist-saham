'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageShell, PageHeader, SectionTitle } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { StatCard } from './ui/StatCard';
import { TechnicalSummary } from './ui/TechnicalSummary';
import { IndexBadgeList } from './IndexBadges';

export default function PortfolioPanel() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [sortBy, setSortBy] = useState('value');
  const [sortAsc, setSortAsc] = useState(false);

  /** Toggles sort direction when the same column is clicked twice. */
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio');
      if (!res.ok) throw new Error('Failed to fetch portfolio data');
      const data = await res.json();
      setPortfolioData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPortfolio();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);

  const summary = portfolioData?.summary || {};
  const positions = useMemo(() => portfolioData?.positions || [], [portfolioData]);
  const riskAnalytics = portfolioData?.riskAnalytics;

  // Each position gets its share of the portfolio so concentration is visible at a glance.
  const positionsWithWeight = useMemo(() => {
    const totalValue = summary.totalCurrentValue || 0;
    return positions.map((pos) => ({
      ...pos,
      weight: totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0,
    }));
  }, [positions, summary.totalCurrentValue]);

  const sortedPositions = useMemo(() => {
    const sorted = [...positionsWithWeight];
    const byNumber = (a, b) => Number(a[sortBy] || 0) - Number(b[sortBy] || 0);
    sorted.sort((a, b) => {
      if (sortBy === 'ticker') return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      return byNumber(a, b);
    });
    return sortAsc ? sorted.reverse() : sorted;
  }, [positionsWithWeight, sortBy, sortAsc]);

  const handleSellStock = (pos) => {
    setConfirmDialog({
      isOpen: true,
      title: `Jual Semua ${pos.ticker}?`,
      message: `Apakah Anda yakin ingin menjual seluruh ${pos.totalShares.toLocaleString('id-ID')} lembar saham ${pos.ticker} pada harga ${formatCurrency(pos.currentPrice)}?`,
      confirmLabel: 'Ya, Jual Semua',
      onConfirm: () => {
        fetch('/api/portfolio/sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: pos.ticker, price: pos.currentPrice, shares: pos.totalShares })
        }).then(() => {
          setConfirmDialog(null);
          fetchPortfolio();
        });
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-muted ">Memuat Portfolio...</div>;
  if (error) return <div className="text-down p-5">Terdapat error: {error}</div>;

  return (
  <PageShell className="animate-fade-in">
    <PageHeader
      title="Portofolio Saya"
      subtitle="Posisi saham, unrealised & realised PnL, dan simulasi risiko"
      badge={<span className="badge badge-outline">{positions.length} posisi aktif</span>}
    />

    {/* ── RINGKASAN ── */}
    <AutoGrid minWidth="220px">
      <StatCard label="Total Investasi" value={formatCurrency(summary.totalInvested)} hint="Modal outlay" />
      <StatCard label="Nilai Portofolio" value={formatCurrency(summary.totalCurrentValue)} hint="Berdasarkan harga terkini" />
      <StatCard
        label="Floating PnL"
        value={formatCurrency(summary.totalFloatingPnL)}
        hint="Belum direalisasi"
        tone={summary.totalFloatingPnL >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="Total Return"
        value={`${(summary.totalReturnPercent ?? 0).toFixed(2)}%`}
        hint="Terhadap modal"
        tone={(summary.totalReturnPercent ?? 0) >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="Realised PnL"
        value={formatCurrency(summary.realizedPnL)}
        hint="Dari posisi yang sudah dijual"
        tone={summary.realizedPnL >= 0 ? 'up' : 'down'}
      />
    </AutoGrid>

    {/* ── RISIKO PORTFOLIO (RINGKASAN TEKNIS) ── */}
    <TechnicalSummary title="Ringkasan Teknis" badge={<span className="badge badge-outline">PORT / MARS</span>}>
  {/* ── BLOOMBERG PORT & MARS: PORTFOLIO RISK & STRESS TESTING COCKPIT ── */}
  {riskAnalytics && (
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">◇</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Portfolio Risk, Beta & Macro Stress Testing (PORT/MARS)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
                Bloomberg PORT
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Kalkulasi sensitivitas pasar (Weighted Beta), Value at Risk (VaR 95%), serta simulasi skenario makroekonomi.
          </p>
        </div>

        <span className={`px-3 py-1 rounded-sm text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
 riskAnalytics.badgeColor === 'emerald'
 ? 'bg-up-soft text-up border-up '
 : riskAnalytics.badgeColor === 'amber'
 ? 'bg-warn-soft text-warn border-warn '
 : 'bg-sunken text-ink border-line '
 }`}>
          {riskAnalytics.riskProfile}
        </span>
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Weighted Beta (Sensitivitas IHSG)
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {riskAnalytics.weightedBeta}x
          </span>
          <span className="text-[10px] text-muted">
            {riskAnalytics.weightedBeta > 1 ? 'Lebih fluktuatif dari IHSG' : 'Lebih stabil dari indeks umum'}
          </span>
        </div>

        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Value at Risk (VaR 95% 1-Day)
          </span>
          <span className="text-lg font-black font-mono text-down mt-0.5 block">
            -{formatCurrency(riskAnalytics.var95.nominal)} ({riskAnalytics.var95.pct}%)
          </span>
          <span className="text-[10px] text-muted">
            Estimasi potensi risiko harian normal
          </span>
        </div>

        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Konsentrasi Portofolio Terbesar
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {riskAnalytics.topHolding} ({riskAnalytics.topConcentrationPct}%)
          </span>
          <span className="text-[10px] text-muted">
            Porsi aset terbesar saat ini
          </span>
        </div>
      </div>

      {/* Warnings if any */}
      {riskAnalytics.warnings?.length > 0 && (
        <div className="space-y-1.5">
          {riskAnalytics.warnings.map((w, idx) => (
            <div key={idx} className="p-2.5 rounded-sm bg-warn-soft border border-warn text-xs text-warn flex items-center gap-2">
              <span>▲</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bloomberg MARS: Macro Stress Testing Scenarios */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink flex items-center gap-1.5">
            <span>»</span> Simulasi Skenario Guncangan Makro (Stress Testing):
          </span>
          <span className="text-[11px] text-muted font-mono">
            Bloomberg MARS Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riskAnalytics.stressScenarios?.map(s => (
            <div key={s.id} className="p-3 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">{s.icon}</span>
                  <span className={`text-xs font-mono font-black ${
 s.impactPct >= 0 ? 'text-up ' : 'text-down '
 }`}>
                    {s.impactPct >= 0 ? `+${s.impactPct}%` : `${s.impactPct}%`}
                  </span>
                </div>
                <div className="font-bold text-xs text-ink mt-1.5">
                  {s.name}
                </div>
                <div className="text-[10px] text-muted mt-0.5 leading-relaxed">
                  {s.description}
                </div>
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between text-[11px]">
                <span className="text-muted font-sans">Estimasi Dampak:</span>
                <span className={`font-bold font-mono ${
 s.nominalImpact >= 0 ? 'text-up ' : 'text-down '
 }`}>
                  {s.nominalImpact >= 0 ? `+${formatCurrency(s.nominalImpact)}` : formatCurrency(s.nominalImpact)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}
    </TechnicalSummary>

    {/* ── DAFTAR SAHAM ── */}
    <section>
      <SectionTitle note={`${positions.length} posisi`}>Daftar Saham yang Dimiliki</SectionTitle>
      <div className="card overflow-hidden">
  <div className="scroll-area">
  {positions.length > 0 ? (
  <div className="scroll-area">
  <table className="table-base">
  <thead>
  <tr>
  <th>
  <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('ticker')}>Saham</button>
  </th>
  <th className="num">
  <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('shares')}>Lembar</button>
  </th>
  <th className="num">Harga Rata-Rata</th>
  <th className="num">Harga Sekarang</th>
  <th className="num">
  <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('value')}>Nilai</button>
  </th>
  <th className="num">
  <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('weight')}>Alokasi</button>
  </th>
  <th className="num">
  <button type="button" className="hover:text-ink focus-ring" onClick={() => handleSort('pnl')}>Floating PnL</button>
  </th>
  <th>Indeks</th>
  <th className="text-right">Aksi</th>
  </tr>
  </thead>
  <tbody>
  {sortedPositions.map((pos) => (
  <tr key={pos.ticker}>
  <td>
  <div className="font-semibold text-ink">{pos.ticker}</div>
  <div className="text-xs text-muted truncate max-w-[220px]">{pos.name}</div>
  </td>
  <td className="num">{pos.totalShares.toLocaleString('id-ID')}</td>
  <td className="num">{formatCurrency(pos.avgPrice)}</td>
  <td className="num font-semibold">{formatCurrency(pos.currentPrice)}</td>
  <td className="num">{formatCurrency(pos.currentValue)}</td>
  <td className="num">
  <div>{pos.weight.toFixed(1)}%</div>
  <div className="mt-1 h-1 w-full max-w-[70px] ml-auto rounded-sm bg-sunken overflow-hidden">
  <div
  className={`h-full ${pos.weight > 25 ? 'bg-warn' : 'bg-ink'}`}
  style={{ width: `${Math.min(100, pos.weight * 2.5)}%` }}
  role="img"
  aria-label={`Alokasi ${pos.weight.toFixed(1)} persen`}
  />
  </div>
  </td>
  <td className={`num font-semibold ${pos.floatingPnL >= 0 ? 'text-up' : 'text-down'}`}>
  <div>{formatCurrency(pos.floatingPnL)}</div>
  <div className="text-xs">{pos.floatingPnLPercent.toFixed(2)}%</div>
  </td>
  <td>
  <IndexBadgeList tickers={[pos.ticker]} />
  </td>
  <td className="text-right">
  <button
  type="button"
  onClick={() => handleSellStock(pos)}
  aria-label={`Jual ${pos.ticker}`}
  className="btn-secondary !min-h-8 !px-2.5 text-down"
  >
  Jual
  </button>
  </td>
  </tr>
  ))}
  </tbody>
  </table>
  </div>
  ) : (
  <div className="p-10 text-center">
  <h3 className="section-title">Portofolio masih kosong</h3>
  <p className="section-subtitle mt-1">
  Cari saham di halaman Analisis, lalu simpan ke portofolio untuk melacak alokasi dan profit.
  </p>
  </div>
  )}
  </div>
      </div>
    </section>

    {/* ── MODAL: CUSTOM CONFIRMATION DIALOG ──────────────────────────── */}
  {confirmDialog && confirmDialog.isOpen && (
    <div className="modal-backdrop animate-in fade-in">
      <div className="modal-panel p-4 sm:p-5 space-y-4" role="dialog" aria-modal="true" aria-labelledby="portfolio-sell-title">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-sm bg-down-soft text-down flex items-center justify-center text-xl shrink-0">
            ⌫
          </div>
          <div>
            <h3 id="portfolio-sell-title" className="text-base font-black text-ink ">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-muted mt-1">
              {confirmDialog.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line ">
          <button
            type="button"
            onClick={confirmDialog.onCancel}
            className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className="px-5 py-2 bg-down hover:bg-down text-on-accent text-xs font-bold rounded-sm shadow-md transition-all"
          >
            {confirmDialog.confirmLabel || 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  )}
  </PageShell>
  );
}
