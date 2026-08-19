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

 return (
 <div className="space-y-6 animate-fade-in">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-gradient-to-br from-blue-900/10 to-transparent">
 <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Modal</h3>
 <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalInvested)}</p>
 </div>
 
 <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-gradient-to-br from-emerald-900/10 to-transparent">
 <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Nilai Saat Ini</h3>
 <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalCurrentValue)}</p>
 </div>

 <div className={`glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-gradient-to-br ${
 summary.totalPnL >= 0 ? 'from-emerald-900/20' : 'from-red-900/20'
 }`}>
 <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Keuntungan</h3>
 <p className={`text-2xl font-bold ${summary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
 {summary.totalPnL > 0 ? '+' : ''}{formatCurrency(summary.totalPnL)}
 </p>
 <div className="mt-1 flex items-center">
 <span className={`text-xs px-2 py-0.5 rounded-full ${
 summary.totalPnL >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
 }`}>
 {summary.totalPnLPercent.toFixed(2)}%
 </span>
 </div>
 </div>
 </div>

 {/* Positions Table */}
 <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
 <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
 <h3 className="font-bold text-slate-900 dark:text-white">Aset Anda</h3>
 </div>
 <div className="overflow-x-auto">
 {positions.length > 0 ? (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 <th className="p-4 font-medium">Saham</th>
 <th className="p-4 font-medium text-right">Lembar (Lot)</th>
 <th className="p-4 font-medium text-right">Harga Beli</th>
 <th className="p-4 font-medium text-right">Harga Saat Ini</th>
 <th className="p-4 font-medium text-right">Total Nilai</th>
 <th className="p-4 font-medium text-right">Return (PnL)</th>
 <th className="p-4 font-medium text-center">Aksi</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/[0.02]">
 {positions.map((pos) => (
 <tr key={pos.ticker} className="hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
 <td className="p-4">
 <div className="font-bold text-slate-900 dark:text-white text-sm">{pos.ticker}</div>
 <div className="text-xs text-slate-500 dark:text-slate-400">{pos.name}</div>
 </td>
 <td className="p-4 text-right">
 <div className="text-sm text-slate-600 dark:text-slate-400">{pos.totalShares}</div>
 <div className="text-xs text-slate-500 dark:text-slate-400">{(pos.totalShares / 100).toFixed(0)} lot</div>
 </td>
 <td className="p-4 text-right text-sm text-slate-600 dark:text-slate-400">{formatCurrency(pos.averagePrice)}</td>
 <td className="p-4 text-right text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(pos.currentPrice)}</td>
 <td className="p-4 text-right text-sm text-slate-600 dark:text-slate-400">{formatCurrency(pos.currentValue)}</td>
 <td className={`p-4 text-right text-sm font-bold ${pos.floatingPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
 <div>{formatCurrency(pos.floatingPnL)}</div>
 <div className="text-xs font-normal opacity-80">{pos.floatingPnLPercent.toFixed(2)}%</div>
 </td>
 <td className="p-4 text-center">
 <button 
 onClick={() => {
 if(confirm(`Yakin ingin JUAL SEMUA ${pos.ticker}?`)) {
 fetch('/api/portfolio/sell', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ticker: pos.ticker, price: pos.currentPrice, shares: pos.totalShares })
 }).then(() => fetchPortfolio());
 }
 }}
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
 </div>
 );
}
