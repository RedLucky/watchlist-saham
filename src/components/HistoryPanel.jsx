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

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-slate-500 animate-pulse">
        Memuat riwayat rekomendasi sinyal & win rate...
      </div>
    );
  }

  const recommendations = history?.recommendations || [];
  const stats = history?.stats || { total: 0, wins: 0, losses: 0, winRate: '0%' };

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🕒</span> Rekam Jejak Sinyal & Win Rate Riil
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluasi akurasi historis rekomendasi trading yang pernah dicatat sistem
          </p>
        </div>
        <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <div className="text-center pr-3 border-r border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Sinyal</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Win Rate</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.winRate}</div>
          </div>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Saham</th>
                <th className="p-3">Gaya</th>
                <th className="p-3 text-right">Harga Buy</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {recommendations.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-3 text-slate-500">
                    {new Date(rec.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3 font-extrabold text-slate-900 dark:text-white">{rec.ticker}</td>
                  <td className="p-3">
                    <span className="capitalize px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {rec.style}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                    Rp {Number(rec.priceAtRecommend || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    Rp {Number(rec.targetPrice || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      rec.status === 'WIN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' :
                      rec.status === 'LOSS' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada riwayat sinyal yang dipantau.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Gunakan tombol <strong>&ldquo;Pantau Win Rate&rdquo;</strong> pada panel Analisis Saham untuk mulai mencatat dan menguji sinyal trading otomatis.
          </p>
        </div>
      )}
    </div>
  );
}
