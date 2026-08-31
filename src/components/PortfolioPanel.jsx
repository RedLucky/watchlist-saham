'use client';

import { useState, useEffect } from 'react';

export default function PortfolioPanel() {
 const [portfolioData, setPortfolioData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

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

 const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

 if (loading) return <div className="p-10 text-center animate-pulse text-slate-500 dark:text-slate-400">Memuat Portfolio...</div>;
 if (error) return <div className="text-red-400 p-5">Terdapat error: {error}</div>;

 const { summary, positions } = portfolioData;

  const [confirmDialog, setConfirmDialog] = useState(null);

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
  <div className={`text-xl font-bold mt-1 ${summary.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  {summary.totalReturnPercent.toFixed(2)}%
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
