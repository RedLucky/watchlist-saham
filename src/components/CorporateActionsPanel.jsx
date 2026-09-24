'use client';

import React, { useState } from 'react';

/**
 * Bloomberg CA: Live Corporate Actions & Dividend Calendar Panel
 * 
 * Displays:
 * 1. Jadwal Dividen Terkini (Official IDX 4 sacred dates: Cum, Ex, Recording/DPS, Payment)
 * 2. Multi-Year Historical Dividend Track Record (IDX + Yahoo Finance)
 * 3. Corporate Catalysts & Event Windows (AGM / RUPST, Financial Reports Seasons)
 */
export default function CorporateActionsPanel({
  corporateActions = [],
  dividendSchedule = null,
  historicalDividends = [],
  dividendSummary = null,
  ticker = '',
  price = 0
}) {
  const [activeTab, setActiveTab] = useState('jadwal'); // 'jadwal' | 'riwayat' | 'katalis'

  // Resolve schedule: prioritize explicit prop, fallback to attached property on corporateActions array
  const schedule = dividendSchedule || corporateActions?.dividendSchedule || null;
  const historyList = (historicalDividends?.length > 0)
    ? historicalDividends
    : (corporateActions?.historicalDividends || []);
  const summary = dividendSummary || corporateActions?.dividendSummary || {};

  const currentPrice = Number(price || 0);

  // If no corporate actions and no dividend data at all, return null
  if (!corporateActions?.length && !schedule && !historyList.length) {
    return null;
  }

  // Format IDR helper
  const formatRupiah = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  // Format Large Nominal IDR (Miliar / Triliun)
  const formatTotalDana = (val) => {
    if (!val || isNaN(val) || val <= 0) return '-';
    const triliun = val / 1e12;
    if (triliun >= 1) return `Rp ${triliun.toFixed(2)} Triliun`;
    const miliar = val / 1e9;
    if (miliar >= 1) return `Rp ${miliar.toFixed(2)} Miliar`;
    return formatRupiah(val);
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      {/* ── 1. HEADER SECTION ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xl">📅</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base md:text-lg">
              Kalender Aksi Korporasi & Jadwal Dividen BEI
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              KSEI / BEI Official
            </span>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Bloomberg CA
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Jadwal resmi Cum Date, Ex Date, Recording DPS, tanggal pencairan dividen kas, dan agenda RUPST emiten{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{ticker}</span>.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'jadwal'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>💰</span>
            <span>Jadwal Terkini</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'riwayat'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📜</span>
            <span>Riwayat Dividen</span>
            {historyList.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {historyList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('katalis')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'katalis'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🏛️</span>
            <span>Agenda & RUPS</span>
          </button>
        </div>
      </div>

      {/* ── 2. TAB CONTENT: JADWAL DIVIDEN TERKINI ─────────────────────────── */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          {schedule ? (
            <>
              {/* Status Alert Banner */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  schedule.stage === 'CUM_ACTIVE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : schedule.stage === 'WAITING_PAYMENT'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                    : 'bg-slate-100/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xl mt-0.5">
                    {schedule.stage === 'CUM_ACTIVE' ? '🔔' : schedule.stage === 'WAITING_PAYMENT' ? '⏳' : '✅'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm">
                        {schedule.status}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 border border-current/20 font-bold">
                        {schedule.countdown}
                      </span>
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">
                      {schedule.actionMessage}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 self-end sm:self-center">
                  <span className="text-[11px] opacity-75 block">Tahun Buku / Jenis:</span>
                  <span className="font-bold text-xs">
                    {schedule.fiscalYear ? `TB ${schedule.fiscalYear}` : '-'} • {schedule.type}
                  </span>
                </div>
              </div>

              {/* 4 Sacred Dates Stepper Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Cum Date */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    schedule.stage === 'CUM_ACTIVE'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700/60 shadow-sm ring-1 ring-emerald-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>🛒</span> 1. Cum Date
                      </span>
                      {schedule.stage === 'CUM_ACTIVE' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                          AKTIF
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 font-mono">
                      {schedule.cumDateFormatted}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Batas akhir beli saham untuk berhak menerima dividen.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {schedule.cumDaysDiff !== null ? (schedule.cumDaysDiff >= 0 ? `${schedule.cumDaysDiff} hari lagi` : `${Math.abs(schedule.cumDaysDiff)} hari lalu`) : '-'}
                  </div>
                </div>

                {/* 2. Ex Date */}
                <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>📉</span> 2. Ex Date
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 font-mono">
                      {schedule.exDateFormatted}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Perdagangan tanpa hak dividen (harga biasanya menyesuaikan).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Pasar Reguler & Nego
                  </div>
                </div>

                {/* 3. Recording Date (DPS) */}
                <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>📋</span> 3. Recording Date
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 font-mono">
                      {schedule.recordingDateFormatted}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Penentuan pemegang saham berhak di KSEI (Pukul 16:00 WIB).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Daftar Pemegang Saham (DPS)
                  </div>
                </div>

                {/* 4. Payment Date */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    schedule.stage === 'WAITING_PAYMENT'
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700/60 shadow-sm ring-1 ring-blue-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>💳</span> 4. Payment Date
                      </span>
                      {schedule.stage === 'WAITING_PAYMENT' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500 text-white animate-pulse">
                          MENUNGGU
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 font-mono">
                      {schedule.paymentDateFormatted}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Dana dividen tunai masuk otomatis ke saldo RDN sekuritas.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {schedule.payDaysDiff !== null ? (schedule.payDaysDiff >= 0 ? `${schedule.payDaysDiff} hari lagi` : `${Math.abs(schedule.payDaysDiff)} hari lalu`) : '-'}
                  </div>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Dividen per Lembar (DPS)</span>
                  <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {schedule.dps > 0 ? formatRupiah(schedule.dps) : '-'}
                  </div>
                  <span className="text-[10px] text-slate-400">per 1 lembar saham</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Estimasi Dividend Yield</span>
                  <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {schedule.yieldPercent != null ? `${schedule.yieldPercent}%` : (summary.dividendYield ? `${Number(summary.dividendYield).toFixed(2)}%` : '-')}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {currentPrice > 0 ? `harga Rp ${currentPrice.toLocaleString('id-ID')}` : 'terhadap harga'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Dana Dividen</span>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                    {formatTotalDana(schedule.totalAmount)}
                  </div>
                  <span className="text-[10px] text-slate-400">Kas disalurkan ke pasar</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Streak Dividen Berturut</span>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                    {summary.dividendStreakYears ? `${summary.dividendStreakYears} Tahun` : 'Rutin'}
                  </div>
                  <span className="text-[10px] text-slate-400">Komitmen bagi dividen</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <span className="text-3xl block mb-2">🏷️</span>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Belum Ada Pengumuman Jadwal Dividen Terbaru
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Emiten {ticker} belum mengumumkan tanggal Cum Date dividen baru ke BEI atau saat ini berada di luar musim pembagian dividen.
              </p>
              {historyList.length > 0 && (
                <button
                  onClick={() => setActiveTab('riwayat')}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  Lihat {historyList.length} Catatan Riwayat Dividen Sebelumnya →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 3. TAB CONTENT: RIWAYAT DIVIDEN MULTI-TAHUN ────────────────────── */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          {historyList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-bold">Tahun / Tanggal</th>
                    <th className="py-2.5 px-3 font-bold">Jenis Dividen</th>
                    <th className="py-2.5 px-3 font-bold text-right">DPS (per Lembar)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Yield</th>
                    <th className="py-2.5 px-3 font-bold text-right">DPR (%)</th>
                    <th className="py-2.5 px-3 font-bold">Cum Date</th>
                    <th className="py-2.5 px-3 font-bold">Tanggal Pembayaran</th>
                    <th className="py-2.5 px-3 font-bold text-center">Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {historyList.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {item.fiscalYear !== '-' ? `TB ${item.fiscalYear}` : item.dateFormatted}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[10px]">
                            {item.type.includes('Interim') ? '🔸' : '🔹'}
                          </span>
                          <span>{item.type}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.dps > 0 ? formatRupiah(item.dps) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {item.yieldPercent != null ? `${item.yieldPercent}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {item.payoutRatio != null ? `${(item.payoutRatio * (item.payoutRatio <= 1 ? 100 : 1)).toFixed(1)}%` : (summary?.payoutRatio != null ? `${(summary.payoutRatio).toFixed(1)}%` : '-')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.cumDateFormatted || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.paymentDateFormatted || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          item.source === 'IDX'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {item.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada data riwayat dividen masa lalu yang tersimpan untuk emiten {ticker}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 4. TAB CONTENT: AGENDA & RUPS ─────────────────────────────────── */}
      {activeTab === 'katalis' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {corporateActions.map((event, idx) => {
            const badgeStyles = {
              emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
              slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
              blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/80',
              purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/80'
            };
            const currentBadge = badgeStyles[event.badgeColor] || badgeStyles.slate;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{event.icon || '📌'}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${currentBadge}`}>
                      {event.countdown}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-2">
                    {event.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Jadwal / Periode:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    {event.date || '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
