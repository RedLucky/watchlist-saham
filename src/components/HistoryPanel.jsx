'use client';

import { useState, useEffect } from 'react';

export default function HistoryPanel() {
 const [history, setHistory] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch('/api/history')
 .then(res => res.json())
 .then(data => {
 setHistory(data);
 setLoading(false);
 })
 .catch(() => setLoading(false));
 }, []);

 if (loading) return <div className="skeleton h-32 w-full rounded-2xl"/>;
 if (!history || history.recommendations?.length === 0) return null;

 return (
 <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
 <span>🕒</span> Riwayat & Win Rate
 </h2>
 <div className="flex gap-4">
 <div className="text-center">
 <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total</div>
 <div className="text-lg font-bold text-slate-900 dark:text-white">{history.stats.total}</div>
 </div>
 <div className="text-center">
 <div className="text-xs text-slate-500 dark:text-slate-400 uppercase text-emerald-400">Win Rate</div>
 <div className="text-xl font-black text-emerald-400">{history.stats.winRate}</div>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-white/5">
 <th className="pb-2 font-medium">Tanggal</th>
 <th className="pb-2 font-medium">Saham</th>
 <th className="pb-2 font-medium">Gaya</th>
 <th className="pb-2 font-medium text-right">Harga Buy</th>
 <th className="pb-2 font-medium text-right">Target</th>
 <th className="pb-2 font-medium text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
 {history.recommendations.map((rec) => (
 <tr key={rec.id} className="hover:bg-slate-50 dark:bg-white/[0.02] transition-colors">
 <td className="py-3 text-slate-400 dark:text-slate-500">
 {new Date(rec.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
 </td>
 <td className="py-3 font-bold text-slate-900 dark:text-white">{rec.ticker}</td>
 <td className="py-3">
 <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
 {rec.style}
 </span>
 </td>
 <td className="py-3 text-right text-slate-400 dark:text-slate-500">
 {rec.priceAtRecommend.toLocaleString('id-ID')}
 </td>
 <td className="py-3 text-right text-emerald-400 font-medium">
 {rec.targetPrice.toLocaleString('id-ID')}
 </td>
 <td className="py-3 text-center">
 <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
 rec.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' :
 rec.status === 'LOSS' ? 'bg-red-500/20 text-red-400' :
 'bg-blue-500/10 text-blue-400'
 }`}>
 {rec.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
