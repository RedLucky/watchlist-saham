'use client';

import { useState, useEffect } from 'react';

export default function HistoryPanel() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState('ALL');
  const [filterTab, setFilterTab] = useState('ALL');
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetch('/api/history')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("HistoryPanel fetch error:", err);
        setFetchError(err.message || 'Gagal memuat riwayat');
        setLoading(false);
      });
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-slate-500 animate-pulse">
        Memuat riwayat rekomendasi sinyal & win rate...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/85 border border-rose-200 dark:border-rose-900/40 text-center space-y-2">
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">⚠️ {fetchError}</p>
        <button 
          onClick={() => {
            setLoading(true);
            setFetchError(null);
            fetch('/api/history')
              .then(r => r.json())
              .then(d => { setHistory(d); setLoading(false); })
              .catch(e => { setFetchError(e.message); setLoading(false); });
          }}
          className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const recommendations = history?.recommendations || [];
  const stats = history?.stats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };
  const systemStats = history?.systemStats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };
  const userStats = history?.userStats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };

  const filteredRecommendations = recommendations.filter((rec) => {
    // Filter Source
    if (sourceTab === 'SYSTEM' && rec.source !== 'SYSTEM') return false;
    if (sourceTab === 'USER' && rec.source === 'SYSTEM') return false;

    // Filter Status
    if (filterTab === 'WAITING') return rec.status === 'WAITING_BUY';
    if (filterTab === 'OPEN') return rec.status === 'OPEN';
    if (filterTab === 'CLOSED') return ['WIN', 'LOSS', 'CLOSED', 'EXPIRED'].includes(rec.status);
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_BUY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center justify-center gap-1">
            <span>⏳</span> Antri Beli
          </span>
        );
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 flex items-center justify-center gap-1">
            <span>🟢</span> Posisi Aktif
          </span>
        );
      case 'WIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center gap-1">
            <span>🏆</span> WIN (TP)
          </span>
        );
      case 'LOSS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center justify-center gap-1">
            <span>🛑</span> LOSS (SL)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1">
            <span>⚪</span> Batal / Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>🕒</span> Rekam Jejak Sinyal & Win Rate Riil
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          Perbandingan akurasi otomatis antara <strong>Rekomendasi Sistem (Bot Discord)</strong> dan <strong>Pantauan Manual Anda</strong>.
        </p>
      </div>

      {/* Dual Comparative Win Rate Cards: Sistem vs User */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Bot Discord / Sistem */}
        <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/70 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                  Rekomendasi Sistem (Discord)
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Otomatis dari kurasi harian bot
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {systemStats.winRate}
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Win Rate
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total</div>
              <div className="font-mono font-black text-slate-900 dark:text-white">{systemStats.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-600 font-bold uppercase">Antri</div>
              <div className="font-mono font-black text-amber-600">{systemStats.waiting}</div>
            </div>
            <div>
              <div className="text-[10px] text-emerald-600 font-bold uppercase">Win</div>
              <div className="font-mono font-black text-emerald-600">{systemStats.wins}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-600 font-bold uppercase">Loss</div>
              <div className="font-mono font-black text-rose-600">{systemStats.losses}</div>
            </div>
          </div>
        </div>

        {/* Card 2: User Manual */}
        <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <div>
                <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                  Pantauan Manual Anda
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Sinyal yang Anda simpan via tombol Pantau
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {userStats.winRate}
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Win Rate
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total</div>
              <div className="font-mono font-black text-slate-900 dark:text-white">{userStats.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-600 font-bold uppercase">Antri</div>
              <div className="font-mono font-black text-amber-600">{userStats.waiting}</div>
            </div>
            <div>
              <div className="text-[10px] text-emerald-600 font-bold uppercase">Win</div>
              <div className="font-mono font-black text-emerald-600">{userStats.wins}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-600 font-bold uppercase">Loss</div>
              <div className="font-mono font-black text-rose-600">{userStats.losses}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Sumber & Status) */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        {/* Source Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sumber:</span>
          {[
            { id: 'ALL', label: `🌐 Semua (${recommendations.length})` },
            { id: 'SYSTEM', label: `🤖 Sistem Discord (${systemStats.total || 0})` },
            { id: 'USER', label: `👤 Pantauan Saya (${userStats.total || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSourceTab(t.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                sourceTab === t.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {[
            { id: 'ALL', label: `Semua Status` },
            { id: 'WAITING', label: `⏳ Sedang Antri (${stats.waiting || 0})` },
            { id: 'OPEN', label: `🟢 Posisi Aktif (${stats.open || 0})` },
            { id: 'CLOSED', label: `🏁 Selesai (${stats.closed || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                filterTab === t.id
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-transparent shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRecommendations.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Sumber</th>
                <th className="p-3">Saham</th>
                <th className="p-3">Gaya</th>
                <th className="p-3 text-right">Harga Beli / Antre</th>
                <th className="p-3 text-right">Target (TP)</th>
                <th className="p-3 text-right">Cut Loss (SL)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {filteredRecommendations.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                    {formatDate(rec.date)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {rec.source === 'SYSTEM' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                        🤖 Sistem
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        👤 User
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-extrabold text-slate-900 dark:text-white">{rec.ticker}</td>
                  <td className="p-3">
                    <span className="capitalize px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {rec.style}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-800 dark:text-slate-200 font-bold font-mono">
                    Rp {Number(rec.priceAtRecommend || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    Rp {Number(rec.targetPrice || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold font-mono">
                    Rp {Number(rec.stopLoss || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {getStatusBadge(rec.status)}
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate" title={rec.notes || ''}>
                    {rec.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada riwayat pada kategori ini.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Gunakan tombol <strong>&ldquo;Pantau&rdquo;</strong> pada panel Analisis Saham atau tunggu sinyal bot Discord otomatis.
          </p>
        </div>
      )}
    </div>
  );
}
