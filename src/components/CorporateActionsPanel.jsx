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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-5">
      {/* ── 1. HEADER SECTION ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xl">▦</span>
            <h3 className="font-bold text-ink text-base md:text-lg">
              Kalender Aksi Korporasi & Jadwal Dividen BEI
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-up-soft text-up border border-up uppercase tracking-wider">
              KSEI / BEI Official
            </span>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
              Bloomberg CA
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Jadwal resmi Cum Date, Ex Date, Recording DPS, tanggal pencairan dividen kas, dan agenda RUPST emiten{' '}
            <span className="font-bold text-ink ">{ticker}</span>.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-1 bg-sunken p-1 rounded-sm self-start sm:self-auto border border-line ">
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-1.5 ${
 activeTab === 'jadwal'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
          >
            <span>¤</span>
            <span>Jadwal Terkini</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-1.5 ${
 activeTab === 'riwayat'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
          >
            <span>▤</span>
            <span>Riwayat Dividen</span>
            {historyList.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sunken text-ink font-mono">
                {historyList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('katalis')}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-1.5 ${
 activeTab === 'katalis'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
          >
            <span>▥</span>
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
                className={`p-3.5 rounded-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
 schedule.stage === 'CUM_ACTIVE'
 ? 'bg-up-soft border-up text-up '
 : schedule.stage === 'WAITING_PAYMENT'
 ? 'bg-sunken border-line text-ink '
 : 'bg-sunken border-line text-ink '
 }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xl mt-0.5">
                    {schedule.stage === 'CUM_ACTIVE' ? '◉' : schedule.stage === 'WAITING_PAYMENT' ? '…' : '✓'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm">
                        {schedule.status}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sunken border border-current/20 font-bold">
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
                  className={`p-3.5 rounded-sm border flex flex-col justify-between transition-all ${
 schedule.stage === 'CUM_ACTIVE'
 ? 'bg-up-soft border-up shadow-sm ring-1 ring-up'
 : 'bg-sunken border-line '
 }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <span>▣</span> 1. Cum Date
                      </span>
                      {schedule.stage === 'CUM_ACTIVE' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-up text-on-accent animate-pulse">
                          AKTIF
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-black text-ink mt-2 font-mono">
                      {schedule.cumDateFormatted}
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-tight">
                      Batas akhir beli saham untuk berhak menerima dividen.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-line text-[10px] font-mono text-muted ">
                    {schedule.cumDaysDiff !== null ? (schedule.cumDaysDiff >= 0 ? `${schedule.cumDaysDiff} hari lagi` : `${Math.abs(schedule.cumDaysDiff)} hari lalu`) : '-'}
                  </div>
                </div>

                {/* 2. Ex Date */}
                <div className="p-3.5 rounded-sm border bg-sunken border-line flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <span>↘</span> 2. Ex Date
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-ink mt-2 font-mono">
                      {schedule.exDateFormatted}
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-tight">
                      Perdagangan tanpa hak dividen (harga biasanya menyesuaikan).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-line text-[10px] font-mono text-muted ">
                    Pasar Reguler & Nego
                  </div>
                </div>

                {/* 3. Recording Date (DPS) */}
                <div className="p-3.5 rounded-sm border bg-sunken border-line flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <span>▤</span> 3. Recording Date
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-ink mt-2 font-mono">
                      {schedule.recordingDateFormatted}
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-tight">
                      Penentuan pemegang saham berhak di KSEI (Pukul 16:00 WIB).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-line text-[10px] font-mono text-muted ">
                    Daftar Pemegang Saham (DPS)
                  </div>
                </div>

                {/* 4. Payment Date */}
                <div
                  className={`p-3.5 rounded-sm border flex flex-col justify-between transition-all ${
 schedule.stage === 'WAITING_PAYMENT'
 ? 'bg-sunken border-accent shadow-sm ring-1 ring-accent'
 : 'bg-sunken border-line '
 }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <span>▤</span> 4. Payment Date
                      </span>
                      {schedule.stage === 'WAITING_PAYMENT' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-accent text-on-accent animate-pulse">
                          MENUNGGU
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-black text-ink mt-2 font-mono">
                      {schedule.paymentDateFormatted}
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-tight">
                      Dana dividen tunai masuk otomatis ke saldo RDN sekuritas.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-line text-[10px] font-mono text-muted ">
                    {schedule.payDaysDiff !== null ? (schedule.payDaysDiff >= 0 ? `${schedule.payDaysDiff} hari lagi` : `${Math.abs(schedule.payDaysDiff)} hari lalu`) : '-'}
                  </div>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-sm bg-sunken border border-line ">
                  <span className="text-[11px] text-muted block">Dividen per Lembar (DPS)</span>
                  <div className="text-sm sm:text-base font-black text-up font-mono mt-0.5">
                    {schedule.dps > 0 ? formatRupiah(schedule.dps) : '-'}
                  </div>
                  <span className="text-[10px] text-muted">per 1 lembar saham</span>
                </div>

                <div className="p-3 rounded-sm bg-sunken border border-line ">
                  <span className="text-[11px] text-muted block">Estimasi Dividend Yield</span>
                  <div className="text-sm sm:text-base font-black text-ink font-mono mt-0.5">
                    {schedule.yieldPercent != null ? `${schedule.yieldPercent}%` : (summary.dividendYield ? `${Number(summary.dividendYield).toFixed(2)}%` : '-')}
                  </div>
                  <span className="text-[10px] text-muted">
                    {currentPrice > 0 ? `harga Rp ${currentPrice.toLocaleString('id-ID')}` : 'terhadap harga'}
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-sunken border border-line ">
                  <span className="text-[11px] text-muted block">Total Dana Dividen</span>
                  <div className="text-sm sm:text-base font-black text-ink font-mono mt-0.5 truncate">
                    {formatTotalDana(schedule.totalAmount)}
                  </div>
                  <span className="text-[10px] text-muted">Kas disalurkan ke pasar</span>
                </div>

                <div className="p-3 rounded-sm bg-sunken border border-line ">
                  <span className="text-[11px] text-muted block">Streak Dividen Berturut</span>
                  <div className="text-sm sm:text-base font-black text-ink font-mono mt-0.5">
                    {summary.dividendStreakYears ? `${summary.dividendStreakYears} Tahun` : 'Rutin'}
                  </div>
                  <span className="text-[10px] text-muted">Komitmen bagi dividen</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center rounded-sm bg-sunken border border-line ">
              <span className="text-3xl block mb-2">•</span>
              <h4 className="font-bold text-sm text-ink ">
                Belum Ada Pengumuman Jadwal Dividen Terbaru
              </h4>
              <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                Emiten {ticker} belum mengumumkan tanggal Cum Date dividen baru ke BEI atau saat ini berada di luar musim pembagian dividen.
              </p>
              {historyList.length > 0 && (
                <button
                  onClick={() => setActiveTab('riwayat')}
                  className="mt-3 px-3 py-1.5 bg-sunken text-ink text-xs font-bold rounded-sm border border-line hover:bg-sunken transition-colors"
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
            <div className="overflow-x-auto rounded-sm border border-line ">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sunken text-muted border-b border-line ">
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
                <tbody className="divide-y divide-line text-ink ">
                  {historyList.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-sunken transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-ink ">
                        {item.fiscalYear !== '-' ? `TB ${item.fiscalYear}` : item.dateFormatted}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[10px]">
                            {item.type.includes('Interim') ? '•' : '•'}
                          </span>
                          <span>{item.type}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-up ">
                        {item.dps > 0 ? formatRupiah(item.dps) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted ">
                        {item.yieldPercent != null ? `${item.yieldPercent}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted ">
                        {item.payoutRatio != null ? `${(item.payoutRatio * (item.payoutRatio <= 1 ? 100 : 1)).toFixed(1)}%` : (summary?.payoutRatio != null ? `${(summary.payoutRatio).toFixed(1)}%` : '-')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted ">
                        {item.cumDateFormatted || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted ">
                        {item.paymentDateFormatted || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
 item.source === 'IDX'
 ? 'bg-up-soft text-up '
 : 'bg-sunken text-ink '
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
            <div className="p-6 text-center rounded-sm bg-sunken border border-line ">
              <p className="text-xs text-muted ">
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
              emerald: 'bg-up-soft text-up   border-up ',
              slate: 'bg-sunken text-ink   border-line ',
              blue: 'bg-sunken text-ink   border-line ',
              purple: 'bg-sunken text-ink   border-line '
            };
            const currentBadge = badgeStyles[event.badgeColor] || badgeStyles.slate;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{event.icon || '•'}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${currentBadge}`}>
                      {event.countdown}
                    </span>
                  </div>

                  <h4 className="font-bold text-ink text-xs sm:text-sm mt-2">
                    {event.title}
                  </h4>

                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between text-[11px]">
                  <span className="text-muted font-sans">Jadwal / Periode:</span>
                  <span className="font-bold font-mono text-ink ">
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
