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
      <div className="p-8 rounded-md bg-surface border border-line text-center text-muted animate-pulse">
        Memuat riwayat rekomendasi sinyal & win rate...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 rounded-md bg-surface border border-down text-center space-y-2">
        <p className="text-sm font-bold text-down ">▲ {fetchError}</p>
        <button 
          onClick={() => {
            setFetchError(null);
            setRefreshTrigger(prev => prev + 1);
          }}
          className="px-4 py-1.5 rounded-sm bg-sunken text-xs font-bold hover:bg-sunken text-ink transition-all cursor-pointer"
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-warn-soft text-warn border border-warn flex items-center justify-center gap-1">
            <span>…</span> Antri Beli
          </span>
        );
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sunken text-ink border border-line flex items-center justify-center gap-1">
            <span>●</span> Posisi Aktif
          </span>
        );
      case 'WIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-up-soft text-up border border-up flex items-center justify-center gap-1">
            <span>★</span> {isTimeStop ? 'WIN (Time)' : 'WIN (TP)'}
          </span>
        );
      case 'LOSS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-down-soft text-down border border-down flex items-center justify-center gap-1">
            <span>■</span> {isTimeStop ? 'LOSS (Time)' : 'LOSS (SL)'}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sunken text-muted border border-line flex items-center justify-center gap-1">
            <span>○</span> Ditutup
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sunken text-muted border border-line flex items-center justify-center gap-1">
            <span>○</span> Batal / Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sunken text-ink border border-line flex items-center justify-center gap-1">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-md p-5 sm:p-6 bg-surface border border-line shadow-xs space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
          <span>◷</span> Rekam Jejak Sinyal & Win Rate Riil
        </h2>
        <p className="text-xs text-muted font-medium mt-0.5">
          Perbandingan akurasi otomatis antara <strong>Rekomendasi Sistem (Bot Discord)</strong> dan <strong>Pantauan Manual Anda</strong>.
        </p>
      </div>

      {/* Dual Comparative Win Rate Cards: Sistem vs User */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Bot Discord / Sistem */}
        <div className="p-4 rounded-md border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">◈</span>
              <div>
                <h3 className="text-xs font-black text-ink uppercase tracking-wider">
                  Rekomendasi Sistem (Discord)
                </h3>
                <p className="text-[10px] text-muted font-semibold">
                  Otomatis dari kurasi harian bot
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-ink font-mono">
                  {systemStats.winRate}
                </div>
                <div className="text-[10px] font-bold text-muted ">
                  Win Rate
                </div>
              </div>
              <div className="text-right pl-3 border-l border-line ">
                <div className={`text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1 ${
 (systemStats.cumulativePnl ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                  <span>{(systemStats.cumulativePnl ?? 0) >= 0 ? '↗' : '↘'}</span>
                  <span>{systemStats.cumulativePnlStr || '+0.00%'}</span>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${
 (systemStats.cumulativePnl ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                  {(systemStats.cumulativePnl ?? 0) >= 0 ? 'Net Untung' : 'Net Defisit'}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-line text-center text-xs">
            <div>
              <div className="text-[10px] text-muted font-bold uppercase">Total</div>
              <div className="font-mono font-black text-ink ">{systemStats.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-warn font-bold uppercase">Antri</div>
              <div className="font-mono font-black text-warn">{systemStats.waiting}</div>
            </div>
            <div>
              <div className="text-[10px] text-up font-bold uppercase">Win</div>
              <div className="font-mono font-black text-up">{systemStats.wins}</div>
            </div>
            <div>
              <div className="text-[10px] text-down font-bold uppercase">Loss</div>
              <div className="font-mono font-black text-down">{systemStats.losses}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed border-line text-center text-xs bg-sunken rounded-sm p-2">
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Avg Win</div>
              <div className="font-mono font-black text-up text-[11px]">{systemStats.avgWinStr || '+0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Avg Loss</div>
              <div className="font-mono font-black text-down text-[11px]">{systemStats.avgLossStr || '0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Payoff</div>
              <div className="font-mono font-black text-ink text-[11px]">{systemStats.payoffRatio || 0}x</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Ekspektansi</div>
              <div className={`font-mono font-black text-[11px] ${
 (systemStats.expectancy ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                {systemStats.expectancyStr || '+0.00%'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: User Manual */}
        <div className="p-4 rounded-md border border-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">◯</span>
              <div>
                <h3 className="text-xs font-black text-up uppercase tracking-wider">
                  Pantauan Manual Anda
                </h3>
                <p className="text-[10px] text-muted font-semibold">
                  Sinyal yang Anda simpan via tombol Pantau
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-up font-mono">
                  {userStats.winRate}
                </div>
                <div className="text-[10px] font-bold text-muted ">
                  Win Rate
                </div>
              </div>
              <div className="text-right pl-3 border-l border-up ">
                <div className={`text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1 ${
 (userStats.cumulativePnl ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                  <span>{(userStats.cumulativePnl ?? 0) >= 0 ? '↗' : '↘'}</span>
                  <span>{userStats.cumulativePnlStr || '+0.00%'}</span>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${
 (userStats.cumulativePnl ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                  {(userStats.cumulativePnl ?? 0) >= 0 ? 'Net Untung' : 'Net Defisit'}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-up text-center text-xs">
            <div>
              <div className="text-[10px] text-muted font-bold uppercase">Total</div>
              <div className="font-mono font-black text-ink ">{userStats.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-warn font-bold uppercase">Antri</div>
              <div className="font-mono font-black text-warn">{userStats.waiting}</div>
            </div>
            <div>
              <div className="text-[10px] text-up font-bold uppercase">Win</div>
              <div className="font-mono font-black text-up">{userStats.wins}</div>
            </div>
            <div>
              <div className="text-[10px] text-down font-bold uppercase">Loss</div>
              <div className="font-mono font-black text-down">{userStats.losses}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed border-up text-center text-xs bg-up-soft rounded-sm p-2">
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Avg Win</div>
              <div className="font-mono font-black text-up text-[11px]">{userStats.avgWinStr || '+0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Avg Loss</div>
              <div className="font-mono font-black text-down text-[11px]">{userStats.avgLossStr || '0.00%'}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Payoff</div>
              <div className="font-mono font-black text-up text-[11px]">{userStats.payoffRatio || 0}x</div>
            </div>
            <div>
              <div className="text-[9px] text-muted font-bold uppercase">Ekspektansi</div>
              <div className={`font-mono font-black text-[11px] ${
 (userStats.expectancy ?? 0) >= 0 ? 'text-up ' : 'text-down '
 }`}>
                {userStats.expectancyStr || '+0.00%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Sumber & Status) */}
      <div className="space-y-2.5 pt-2 border-t border-line ">
        {/* Source Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="label-mono">Sumber</span>
          <div className="tabs" role="group" aria-label="Filter sumber">
          {[
            { id: 'ALL', label: `◎ Semua (${stats.total || 0})` },
            { id: 'SYSTEM', label: `◈ Sistem Discord (${systemStats.total || 0})` },
            { id: 'USER', label: `◯ Pantauan Saya (${userStats.total || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSourceTab(t.id);
                setCurrentPage(1);
              }}
              aria-pressed={sourceTab === t.id}
              className="tab"
            >
              {t.label}
            </button>
          ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="label-mono">Status</span>
          <div className="tabs" role="group" aria-label="Filter status">
          {[
            { id: 'ALL', label: `Semua Status` },
            { id: 'WAITING', label: `… Sedang Antri (${activeStats.waiting || 0})` },
            { id: 'OPEN', label: `● Posisi Aktif (${activeStats.open || 0})` },
            { id: 'CLOSED', label: `■ Selesai (${activeStats.closed || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setFilterTab(t.id);
                setCurrentPage(1);
              }}
              aria-pressed={filterTab === t.id}
              className="tab"
            >
              {t.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-3">
          <div className={`overflow-x-auto rounded-md border border-line transition-opacity duration-150 ${tableLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <table className="w-full text-left text-xs">
              <thead className="bg-sunken text-muted uppercase font-bold text-[10px] border-b border-line ">
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
              <tbody className="divide-y divide-line font-medium">
                {recommendations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-sunken transition-colors">
                    <td className="p-3 text-muted font-mono whitespace-nowrap">
                      {formatDate(rec.date)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {rec.source === 'SYSTEM' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sunken text-ink border border-line ">
                          ◈ Sistem
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-up-soft text-up border border-up ">
                          ◯ User
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-extrabold text-ink ">{rec.ticker}</td>
                    <td className="p-3">
                      <span className="capitalize px-2.5 py-1 rounded-md text-[10px] font-bold bg-sunken text-ink border border-line ">
                        {rec.style}
                      </span>
                    </td>
                    <td className="p-3 text-right text-ink font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.priceAtRecommend || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap">
                      {rec.currentPrice != null ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-extrabold text-ink ">
                            Rp {Number(rec.currentPrice).toLocaleString('id-ID')}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {rec.floatingGainPercent != null && (
                              <span className={`text-[10px] font-bold ${
 rec.floatingGainPercent > 0 
 ? 'text-up ' 
 : rec.floatingGainPercent < 0 
 ? 'text-down ' 
 : 'text-muted'
 }`}>
                                {rec.floatingGainPercent > 0 ? '+' : ''}{rec.floatingGainPercent.toFixed(1)}%
                              </span>
                            )}
                            {rec.exitPrice != null && (rec.status === 'WIN' || rec.status === 'LOSS' || rec.status === 'CLOSED') && (
                              <span className="text-[9px] text-muted font-semibold" title={`Exit di Rp ${Number(rec.exitPrice).toLocaleString('id-ID')}`}>
                                (Exit: {Number(rec.exitPrice).toLocaleString('id-ID')})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-up font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.targetPrice || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-down font-bold font-mono whitespace-nowrap">
                      Rp {Number(rec.stopLoss || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap space-y-1">
                      {getStatusBadge(rec.status, rec.notes)}
                      {rec.realizedPnlPercent != null && (rec.status === 'WIN' || rec.status === 'LOSS' || rec.status === 'CLOSED') && (
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
 rec.realizedPnlPercent >= 0 
 ? 'bg-up-soft text-up border border-up ' 
 : 'bg-down-soft text-down border border-down '
 }`}>
                            {rec.realizedPnlPercent >= 0 ? '+' : ''}{rec.realizedPnlPercent.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-muted text-[11px] max-w-xs truncate" title={rec.notes || ''}>
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
              <div className="text-muted font-medium">
                Menampilkan <span className="font-bold text-ink ">{startIndex + 1}</span>–<span className="font-bold text-ink ">{endIndex}</span> dari <span className="font-bold text-ink ">{totalItems}</span> riwayat ({pageSize} per halaman)
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1.5 rounded-sm border border-line bg-surface text-ink font-bold hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    ← Sebelumnya
                  </button>

                  {/* Page Number Buttons */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) => (
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-muted">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-sm font-bold transition-all cursor-pointer border text-xs flex items-center justify-center ${
 safeCurrentPage === p
 ? 'bg-ink text-on-accent border-transparent shadow-xs font-black'
 : 'bg-surface text-ink border-line hover:bg-sunken '
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
                    className="px-3 py-1.5 rounded-sm border border-line bg-surface text-ink font-bold hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    Berikutnya →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center rounded-md bg-sunken border border-dashed border-line text-muted space-y-1">
          <p className="text-xs font-bold text-ink ">Tidak ada riwayat pada kategori ini.</p>
          <p className="text-[11px] text-muted ">
            Gunakan tombol <strong>&ldquo;Pantau&rdquo;</strong> pada panel Analisis Saham atau tunggu sinyal bot Discord otomatis.
          </p>
        </div>
      )}
    </div>
  );
}
