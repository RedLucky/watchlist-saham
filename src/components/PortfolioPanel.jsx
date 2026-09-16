'use client';

import { useState, useEffect } from 'react';

export default function PortfolioPanel() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500 dark:text-slate-400">Memuat Portfolio...</div>;
  if (error) return <div className="text-red-400 p-5">Terdapat error: {error}</div>;

  const summary = portfolioData?.summary || {};
  const positions = portfolioData?.positions || [];
  const riskAnalytics = portfolioData?.riskAnalytics;

  return (
  <div className="space-y-6 animate-fade-in">
  {/* Summary Cards */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
  <div className="text-xs text-slate-500 dark:text-slate-400">Total Investasi (Modal)</div>
  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(summary.totalInvested)}</div>
  </div>
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
  <div className="text-xs text-slate-500 dark:text-slate-400">Nilai Portofolio Saat Ini</div>
  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(summary.totalCurrentValue)}</div>
  </div>
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
  <div className="text-xs text-slate-500 dark:text-slate-400">Floating PnL (Floating Profit)</div>
  <div className={`text-xl font-bold mt-1 ${summary.totalFloatingPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  {formatCurrency(summary.totalFloatingPnL)}
  </div>
  </div>
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
  <div className="text-xs text-slate-500 dark:text-slate-400">Total Return (%)</div>
  <div className={`text-xl font-bold mt-1 ${(summary.totalReturnPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  {(summary.totalReturnPercent ?? 0).toFixed(2)}%
  </div>
  </div>
  </div>

  {/* Realized PnL Summary */}
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] flex items-center justify-between">
  <div>
  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Keuntungan Realisasi (Closed PnL): </span>
  <span className={`text-base font-bold ml-2 ${summary.realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  {formatCurrency(summary.realizedPnL)}
  </span>
  </div>
  <div className="text-xs text-slate-500 dark:text-slate-400">
  Jumlah Saham Aktif: <strong className="text-slate-800 dark:text-slate-200">{positions.length}</strong>
  </div>
  </div>

  {/* ── BLOOMBERG PORT & MARS: PORTFOLIO RISK & STRESS TESTING COCKPIT ── */}
  {riskAnalytics && (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Portfolio Risk, Beta & Macro Stress Testing (PORT/MARS)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Bloomberg PORT
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Kalkulasi sensitivitas pasar (Weighted Beta), Value at Risk (VaR 95%), serta simulasi skenario makroekonomi.
          </p>
        </div>

        <span className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
          riskAnalytics.badgeColor === 'emerald'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : riskAnalytics.badgeColor === 'amber'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
        }`}>
          {riskAnalytics.riskProfile}
        </span>
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Weighted Beta (Sensitivitas IHSG)
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            {riskAnalytics.weightedBeta}x
          </span>
          <span className="text-[10px] text-slate-500">
            {riskAnalytics.weightedBeta > 1 ? 'Lebih fluktuatif dari IHSG' : 'Lebih stabil dari indeks umum'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Value at Risk (VaR 95% 1-Day)
          </span>
          <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
            -{formatCurrency(riskAnalytics.var95.nominal)} ({riskAnalytics.var95.pct}%)
          </span>
          <span className="text-[10px] text-slate-500">
            Estimasi potensi risiko harian normal
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Konsentrasi Portofolio Terbesar
          </span>
          <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            {riskAnalytics.topHolding} ({riskAnalytics.topConcentrationPct}%)
          </span>
          <span className="text-[10px] text-slate-500">
            Porsi aset terbesar saat ini
          </span>
        </div>
      </div>

      {/* Warnings if any */}
      {riskAnalytics.warnings?.length > 0 && (
        <div className="space-y-1.5">
          {riskAnalytics.warnings.map((w, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bloomberg MARS: Macro Stress Testing Scenarios */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>⚡</span> Simulasi Skenario Guncangan Makro (Stress Testing):
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Bloomberg MARS Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riskAnalytics.stressScenarios?.map(s => (
            <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">{s.icon}</span>
                  <span className={`text-xs font-mono font-black ${
                    s.impactPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {s.impactPct >= 0 ? `+${s.impactPct}%` : `${s.impactPct}%`}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white mt-1.5">
                  {s.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {s.description}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-sans">Estimasi Dampak:</span>
                <span className={`font-bold font-mono ${
                  s.nominalImpact >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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

  {/* Positions Table */}
  <div className="rounded-xl border border-slate-200 dark:border-white/[0.04] overflow-hidden bg-slate-50 dark:bg-white/[0.02]">
  <div className="p-4 border-b border-slate-200 dark:border-white/[0.04] font-semibold text-slate-900 dark:text-white">
  Daftar Saham yang Dimiliki
  </div>
  <div className="overflow-x-auto">
  {positions.length > 0 ? (
  <table className="w-full text-left border-collapse">
  <thead>
  <tr className="border-b border-slate-200 dark:border-white/[0.04] text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
  <th className="p-4">Saham</th>
  <th className="p-4 text-right">Jumlah Lembar</th>
  <th className="p-4 text-right">Harga Rata-Rata</th>
  <th className="p-4 text-right">Harga Saat Ini</th>
  <th className="p-4 text-right">Total Nilai</th>
  <th className="p-4 text-right">Floating PnL</th>
  <th className="p-4 text-center">Aksi</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
  {positions.map((pos) => (
  <tr key={pos.ticker} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
  <td className="p-4">
  <div className="font-bold text-slate-900 dark:text-white">{pos.ticker}</div>
  <div className="text-xs text-slate-500">{pos.name}</div>
  </td>
  <td className="p-4 text-right text-sm text-slate-700 dark:text-slate-300">{pos.totalShares.toLocaleString('id-ID')}</td>
  <td className="p-4 text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(pos.avgPrice)}</td>
  <td className="p-4 text-right text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(pos.currentPrice)}</td>
  <td className="p-4 text-right text-sm text-slate-600 dark:text-slate-400">{formatCurrency(pos.currentValue)}</td>
  <td className={`p-4 text-right text-sm font-bold ${pos.floatingPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  <div>{formatCurrency(pos.floatingPnL)}</div>
  <div className="text-xs font-normal opacity-80">{pos.floatingPnLPercent.toFixed(2)}%</div>
  </td>
  <td className="p-4 text-center">
  <button 
  onClick={() => handleSellStock(pos)}
  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all"
  >
  Jual
  </button>
  </td>
  </tr>
  ))}
  </tbody>
  </table>
  ) : (
  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
  Anda belum memiliki portofolio. Cari saham yang bagus dari hasil Analisis dan tambahkan ke Portofolio Anda.
  </div>
  )}
  </div>
  </div>

  {/* ── MODAL: CUSTOM CONFIRMATION DIALOG ──────────────────────────── */}
  {confirmDialog && confirmDialog.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
            🗑️
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {confirmDialog.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={confirmDialog.onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            {confirmDialog.confirmLabel || 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  )}
  </div>
  );
}
