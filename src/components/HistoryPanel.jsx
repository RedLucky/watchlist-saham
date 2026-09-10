'use client';

import { useState, useEffect } from 'react';

function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function HistoryPanel() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [sourceTab, setSourceTab] = useState('ALL');
  const [filterTab, setFilterTab] = useState('ALL');
  const [fetchError, setFetchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let ignore = false;
    if (!history) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
    });
    if (sourceTab !== 'ALL') params.set('source', sourceTab);
    if (filterTab !== 'ALL') params.set('status', filterTab);

    fetch(`/api/history?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!ignore) {
          setHistory(data);
          setLoading(false);
          setTableLoading(false);
        }
      })
      .catch(err => {
        if (!ignore) {
          console.error("HistoryPanel fetch error:", err);
          setFetchError(err.message || 'Gagal memuat riwayat');
          setLoading(false);
          setTableLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentPage, sourceTab, filterTab, refreshTrigger]);

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
            setFetchError(null);
            setRefreshTrigger(prev => prev + 1);
          }}
          className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const recommendations = history?.recommendations || [];
  const pagination = history?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 };
  const stats = history?.stats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };
  const systemStats = history?.systemStats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };
  const userStats = history?.userStats || { total: 0, waiting: 0, open: 0, wins: 0, losses: 0, winRate: '0%' };

  const totalItems = pagination.total;
  const totalPages = Math.max(1, pagination.totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pagination.limit;
  const endIndex = Math.min(startIndex + recommendations.length, totalItems);
  const activeStats = sourceTab === 'SYSTEM' ? systemStats : sourceTab === 'USER' ? userStats : stats;

  const getStatusBadge = (status, notes = '') => {
    const isTimeStop = Boolean(notes && notes.includes('Time Stop'));
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
            <span>🏆</span> {isTimeStop ? 'WIN (Time)' : 'WIN (TP)'}
          </span>
        );
      case 'LOSS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center justify-center gap-1">
            <span>🛑</span> {isTimeStop ? 'LOSS (Time)' : 'LOSS (SL)'}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1">
            <span>⚪</span> Ditutup
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
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {systemStats.winRate}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Win Rate
                </div>
              </div>
              <div className="text-right pl-3 border-l border-indigo-200/80 dark:border-indigo-900/50">
                <div className={`text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1 ${
                  (systemStats.cumulativePnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span>{(systemStats.cumulativePnl ?? 0) >= 0 ? '📈' : '📉'}</span>
                  <span>{systemStats.cumulativePnlStr || '+0.00%'}</span>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${
                  (systemStats.cumulativePnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(systemStats.cumulativePnl ?? 0) >= 0 ? 'Net Untung' : 'Net Defisit'}
                </div>
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
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed border-indigo-200/60 dark:border-indigo-900/40 text-center text-xs bg-indigo-100/30 dark:bg-indigo-950/30 rounded-xl p-2">
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Win</div>
              <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-[11px]">{systemStats.avgWinStr || '+0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Loss</div>
              <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-[11px]">{systemStats.avgLossStr || '0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Payoff</div>
              <div className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-[11px]">{systemStats.payoffRatio || 0}x</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Ekspektansi</div>
              <div className={`font-mono font-black text-[11px] ${
                (systemStats.expectancy ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {systemStats.expectancyStr || '+0.00%'}
              </div>
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
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {userStats.winRate}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Win Rate
                </div>
              </div>
              <div className="text-right pl-3 border-l border-emerald-200/80 dark:border-emerald-900/50">
                <div className={`text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1 ${
                  (userStats.cumulativePnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span>{(userStats.cumulativePnl ?? 0) >= 0 ? '📈' : '📉'}</span>
                  <span>{userStats.cumulativePnlStr || '+0.00%'}</span>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${
                  (userStats.cumulativePnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(userStats.cumulativePnl ?? 0) >= 0 ? 'Net Untung' : 'Net Defisit'}
                </div>
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
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed border-emerald-200/60 dark:border-emerald-900/40 text-center text-xs bg-emerald-100/30 dark:bg-emerald-950/30 rounded-xl p-2">
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Win</div>
              <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-[11px]">{userStats.avgWinStr || '+0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Loss</div>
              <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-[11px]">{userStats.avgLossStr || '0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Payoff</div>
              <div className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-[11px]">{userStats.payoffRatio || 0}x</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Ekspektansi</div>
              <div className={`font-mono font-black text-[11px] ${
                (userStats.expectancy ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {userStats.expectancyStr || '+0.00%'}
              </div>
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
            { id: 'ALL', label: `🌐 Semua (${stats.total || 0})` },
            { id: 'SYSTEM', label: `🤖 Sistem Discord (${systemStats.total || 0})` },
            { id: 'USER', label: `👤 Pantauan Saya (${userStats.total || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSourceTab(t.id);
                setCurrentPage(1);
              }}
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
            { id: 'WAITING', label: `⏳ Sedang Antri (${activeStats.waiting || 0})` },
            { id: 'OPEN', label: `🟢 Posisi Aktif (${activeStats.open || 0})` },
            { id: 'CLOSED', label: `🏁 Selesai (${activeStats.closed || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setFilterTab(t.id);
                setCurrentPage(1);
              }}
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

      {recommendations.length > 0 ? (
        <div className="space-y-3">
          <div className={`overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 transition-opacity duration-150 ${tableLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Sumber</th>
                  <th className="p-3">Saham</th>
                  <th className="p-3">Gaya</th>
                  <th className="p-3 text-right">Harga Beli / Antre</th>
                  <th className="p-3 text-right">Harga Saat Ini</th>
                  <th className="p-3 text-right">Target (TP)</th>
                  <th className="p-3 text-right">Cut Loss (SL)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {recommendations.map((rec) => (
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
                    <td className="p-3 text-right text-slate-800 dark:text-slate-200 font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.priceAtRecommend || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap">
                      {rec.currentPrice != null ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            Rp {Number(rec.currentPrice).toLocaleString('id-ID')}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {rec.floatingGainPercent != null && (
                              <span className={`text-[10px] font-bold ${
                                rec.floatingGainPercent > 0 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : rec.floatingGainPercent < 0 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-slate-400'
                              }`}>
                                {rec.floatingGainPercent > 0 ? '+' : ''}{rec.floatingGainPercent.toFixed(1)}%
                              </span>
                            )}
                            {rec.exitPrice != null && (rec.status === 'WIN' || rec.status === 'LOSS' || rec.status === 'CLOSED') && (
                              <span className="text-[9px] text-slate-400 font-semibold" title={`Exit di Rp ${Number(rec.exitPrice).toLocaleString('id-ID')}`}>
                                (Exit: {Number(rec.exitPrice).toLocaleString('id-ID')})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.targetPrice || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.stopLoss || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap space-y-1">
                      {getStatusBadge(rec.status, rec.notes)}
                      {rec.realizedPnlPercent != null && (rec.status === 'WIN' || rec.status === 'LOSS' || rec.status === 'CLOSED') && (
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                            rec.realizedPnlPercent >= 0 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {rec.realizedPnlPercent >= 0 ? '+' : ''}{rec.realizedPnlPercent.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate" title={rec.notes || ''}>
                      {rec.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{startIndex + 1}</span>–<span className="font-bold text-slate-800 dark:text-slate-200">{endIndex}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> riwayat ({pageSize} per halaman)
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    ← Sebelumnya
                  </button>

                  {/* Page Number Buttons */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) => (
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer border text-xs flex items-center justify-center ${
                            safeCurrentPage === p
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs font-black'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    Berikutnya →
                  </button>
                </div>
              )}
            </div>
          )}
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
