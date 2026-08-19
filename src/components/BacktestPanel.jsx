'use client';

import { useState } from 'react';

export default function BacktestPanel() {
 const [ticker, setTicker] = useState('BBCA');
 const [style, setStyle] = useState('swing');
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState(null);
 const [error, setError] = useState(null);

 const runBacktest = async () => {
 if (!ticker) return;
 try {
 setLoading(true);
 setError(null);
 const res = await fetch(`/api/backtest?ticker=${ticker.toUpperCase()}&style=${style}`);
 if (!res.ok) {
 const errorData = await res.json();
 throw new Error(errorData.error || 'Gagal menjalankan backtest');
 }
 const data = await res.json();
 setResult(data);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const formatCurrency = (val) => {
 const n = Number(val);
 if (!Number.isFinite(n)) return '-';
 return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
 };

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5">
 <h3 className="font-bold text-slate-900 dark:text-white mb-4">Mesin Waktu Backtesting (1 Tahun Terakhir)</h3>
 
 <div className="flex flex-wrap gap-4 items-end">
 <div className="space-y-1.5">
 <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Simbol Saham</label>
 <input 
 type="text"
 value={ticker}
 onChange={(e) => setTicker(e.target.value.toUpperCase())}
 placeholder="Misal: BBCA"
 className="bg-slate-50 dark:bg-[#0a0f1a] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white w-40 focus:outline-none focus:border-blue-500 transition-colors uppercase"
 />
 </div>
 
 <div className="space-y-1.5">
 <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gaya Trading</label>
 <select 
 value={style} 
 onChange={(e) => setStyle(e.target.value)}
 className="bg-slate-50 dark:bg-[#0a0f1a] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
 >
 <option value="scalping">Scalping (⚡)</option>
 <option value="daily">Daily (📊)</option>
 <option value="swing">Swing (📈)</option>
 </select>
 </div>

 <button 
 onClick={runBacktest}
 disabled={loading || !ticker}
 className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors h-10 shadow-lg shadow-blue-500/20"
 >
 {loading ? 'Mensimulasikan...' : 'Mulai Backtest'}
 </button>
 </div>
 
 {error && <p className="text-red-400 text-sm mt-4">⚠️ {error}</p>}
 </div>

 {result && (
 <div className="space-y-6 animate-slide-down">
 {/* Summary */}
 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Win Rate</span>
 <div className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">{result.summary.winRate.toFixed(1)}%</div>
 <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Dari {result.summary.totalTrades} Trade</div>
 </div>
 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Rasio Menang : Kalah</span>
 <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
 <span className="text-emerald-400">{result.summary.wins}</span> 
 <span className="text-slate-500 dark:text-slate-400 text-lg mx-2">/</span> 
 <span className="text-red-400">{result.summary.losses}</span>
 </div>
 </div>
 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Return Pertumbuhan Modal</span>
 <div className={`text-2xl font-bold mt-1 ${result.summary.netReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
 {result.summary.netReturn >= 0 ? '+' : ''}{result.summary.netReturn.toFixed(2)}%
 </div>
 </div>
 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Total Modal (Dari 10Jt)</span>
 <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
 {formatCurrency(result.summary.finalCapital)}
 </div>
 </div>
 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Rata-rata Hold</span>
 <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
 {Number(result.summary.avgHoldDays || 0).toFixed(1)} hari
 </div>
 </div>
 </div>

 <div className="p-4 rounded-xl glass-light border border-slate-200 dark:border-white/5">
 <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mb-1">Konfigurasi Backtest</div>
 <div className="text-sm text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
 <span>MA: {result.config?.maShort}/{result.config?.maLong}</span>
 <span>RSI: {result.config?.rsiPeriod}</span>
 <span>TP/SL: {result.config?.tpPercent}% / {result.config?.slPercent}%</span>
 <span>Biaya per sisi: {Number(result.config?.feePerSidePercent || 0).toFixed(2)}%</span>
 </div>
 </div>

 {/* Trade History */}
 <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
 <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center">
 <h3 className="font-bold text-slate-900 dark:text-white">Riwayat Transaksi Simulasi</h3>
 <span className="text-xs text-slate-500 dark:text-slate-400">Gaya: {result.style}</span>
 </div>
 <div className="max-h-96 overflow-y-auto overflow-x-auto">
 {result.trades.length > 0 ? (
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-slate-50 dark:bg-[#0a0f1a]/95 backdrop-blur-md">
 <tr className="border-b border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 <th className="p-4 font-medium">Masuk (Beli)</th>
 <th className="p-4 font-medium">Keluar (Jual)</th>
 <th className="p-4 font-medium text-right">Harga Beli</th>
 <th className="p-4 font-medium text-right">Harga Jual</th>
 <th className="p-4 font-medium">Exit</th>
 <th className="p-4 font-medium text-right">PnL</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/[0.02]">
 {result.trades.map((trade, idx) => (
 <tr key={idx} className="hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
 <td className="p-4 text-sm text-slate-400 dark:text-slate-500">{trade.entryDate}</td>
 <td className="p-4 text-sm text-slate-400 dark:text-slate-500">{trade.exitDate}</td>
 <td className="p-4 text-sm text-right font-medium">Rp {trade.entryPrice.toLocaleString('id-ID')}</td>
 <td className="p-4 text-sm text-right font-medium">Rp {trade.exitPrice.toLocaleString('id-ID')}</td>
 <td className="p-4 text-xs text-slate-400 dark:text-slate-500">{trade.reason || '-'}</td>
 <td className="p-4 text-right">
 <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
 trade.type === 'WIN' 
 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
 : trade.type === 'LOSS'
 ? 'bg-red-500/10 text-red-400 border border-red-500/20'
 : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
 }`}>
 {trade.type === 'WIN' ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <div className="p-10 text-center text-slate-500 dark:text-slate-400">
 Sistem tidak menemukan Setup Entry yang valid untuk saham dan gaya trading ini sepanjang tahun terakhir.
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
