'use client';

import React, { useState } from 'react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

const FULL_MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonthlySeasonalityPanel({ data, ticker }) {
  const [selectedCell, setSelectedCell] = useState(null);

  if (!data || !data.years || data.years.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
        <p className="text-sm">Data histori seasonality 5 tahun belum tersedia untuk {ticker || 'emiten ini'}.</p>
      </div>
    );
  }

  const { years, matrix, monthStats, overallWinRate, bestMonth, worstMonth } = data;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🗓️</span> Kalender Seasonality & Performa Bulanan 5 Tahun
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Matriks histori persentase kenaikan/penurunan harga ({ticker || 'Emiten'}) per bulan, rata-rata harga transaksi, dan potensi ayunan puncak (swing).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            🟢 Plus / Gain
          </span>
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            🔴 Minus / Loss
          </span>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3.5">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Bulan Terkuat 🌟</span>
          <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1">
            {bestMonth ? bestMonth.name : '-'}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
            Win Rate: <strong className="font-semibold">{bestMonth ? `${bestMonth.winRatePercent}%` : '-'}</strong> (Avg {bestMonth && bestMonth.avgReturnPercent >= 0 ? '+' : ''}{bestMonth ? `${bestMonth.avgReturnPercent}%` : '-'})
          </p>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3.5">
          <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Bulan Terlemah ⚠️</span>
          <div className="text-lg font-bold text-rose-800 dark:text-rose-300 mt-1">
            {worstMonth ? worstMonth.name : '-'}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-0.5">
            Win Rate: <strong className="font-semibold">{worstMonth ? `${worstMonth.winRatePercent}%` : '-'}</strong> (Avg {worstMonth && worstMonth.avgReturnPercent >= 0 ? '+' : ''}{worstMonth ? `${worstMonth.avgReturnPercent}%` : '-'})
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Win Rate Bulanan Total 📈</span>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {overallWinRate}% Hijau
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Dari 5 tahun histori transaksi
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Interaksi Matriks 💡</span>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
            Klik Sel Bulan
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Untuk melihat rincian rata-rata harga & swing
          </p>
        </div>
      </div>

      {/* Seasonality Heatmap Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs text-center border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold">
              <th className="py-2.5 px-2 text-left border-b border-r border-slate-200 dark:border-slate-700/70 w-20">Tahun</th>
              {MONTH_NAMES.map((mName, idx) => (
                <th key={idx} className="py-2.5 px-1 border-b border-r border-slate-200 dark:border-slate-700/70 last:border-r-0">
                  {mName}
                </th>
              ))}
              <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700/70 bg-slate-200/60 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                Total Thn
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => {
              const yrData = matrix[yr] || {};
              const yrSummary = yrData.yearSummary || {};
              const retYr = yrSummary.returnPercent;

              return (
                <tr key={yr} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-2 text-left font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                    {yr} {yrSummary.isYtd && <span className="text-[10px] text-indigo-500 font-normal">(YTD)</span>}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const cell = yrData[m] || {};
                    const { status, returnPercent } = cell;

                    let bgClass = 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600';
                    let textVal = '-';

                    if (status === 'PLUS') {
                      bgClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20';
                      textVal = `+${returnPercent}%`;
                    } else if (status === 'MINUS') {
                      bgClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/20';
                      textVal = `${returnPercent}%`;
                    } else if (status === 'FLAT') {
                      bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                      textVal = '0.0%';
                    } else if (status === 'FUTURE') {
                      bgClass = 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-300 dark:text-slate-700';
                      textVal = '•';
                    }

                    return (
                      <td
                        key={m}
                        onClick={() => status !== 'FUTURE' && status !== 'NO_DATA' && setSelectedCell({ year: yr, month: m, data: cell })}
                        className={`py-2 px-1 border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${bgClass}`}
                        title={cell.open ? `Klik untuk detail rincian ${FULL_MONTH_NAMES[m]} ${yr}` : ''}
                      >
                        {textVal}
                      </td>
                    );
                  })}
                  <td className={`py-2 px-2 font-bold border-l border-slate-200 dark:border-slate-700/70 ${retYr > 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' : retYr < 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-500/5' : 'text-slate-600 dark:text-slate-400'}`}>
                    {retYr != null ? `${retYr > 0 ? '+' : ''}${retYr}%` : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Aggregated 5-Year Win Rate Row */}
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-semibold border-t-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
              <td className="py-2.5 px-2 text-left border-r border-slate-200 dark:border-slate-700 font-bold">
                Win Rate
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const wr = st.winRatePercent || 0;
                return (
                  <td key={m} className={`py-2 px-1 border-r border-slate-200 dark:border-slate-700 ${wr >= 60 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : wr <= 40 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {st.totalYearsEvaluated > 0 ? `${wr}%` : '-'}
                  </td>
                );
              })}
              <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-bold">
                {overallWinRate}%
              </td>
            </tr>

            {/* Aggregated 5-Year Average Return Row */}
            <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <td className="py-2 px-2 text-left border-r border-slate-200 dark:border-slate-800 font-medium">
                Avg Return
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const avgR = st.avgReturnPercent;
                return (
                  <td key={m} className={`py-1.5 px-1 border-r border-slate-100 dark:border-slate-800 ${avgR > 0 ? 'text-emerald-600 dark:text-emerald-400' : avgR < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    {st.totalYearsEvaluated > 0 ? `${avgR > 0 ? '+' : ''}${avgR}%` : '-'}
                  </td>
                );
              })}
              <td className="py-1.5 px-2 font-medium">
                -
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selected Month Detail Modal / Drawer */}
      {selectedCell && selectedCell.data && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl p-4 relative animate-fadeIn">
          <button
            onClick={() => setSelectedCell(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-md bg-slate-200/50 dark:bg-slate-700/50"
          >
            ✕ Tutup
          </button>

          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📅</span> Rincian Performa: {FULL_MONTH_NAMES[selectedCell.month]} {selectedCell.year} ({ticker})
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Rata-rata Harga Transaksi</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Rp {selectedCell.data.avgPrice ? selectedCell.data.avgPrice.toLocaleString('id-ID') : '-'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Harga Open → Close</span>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                Rp {selectedCell.data.open?.toLocaleString('id-ID') || '-'} → Rp {selectedCell.data.close?.toLocaleString('id-ID') || '-'}
              </div>
              <p className={`text-[11px] font-bold mt-0.5 ${selectedCell.data.returnPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : selectedCell.data.returnPercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                Hasil: {selectedCell.data.returnPercent > 0 ? '+' : ''}{selectedCell.data.returnPercent}%
              </p>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Kenaikan Puncak (High Swing) 🚀</span>
              <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                Rp {selectedCell.data.high?.toLocaleString('id-ID') || '-'} (+{selectedCell.data.maxHighPercent}%)
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                Kenaikan maks dari harga pembukaan
              </p>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-800/60">
              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">Koreksi Terendah (Low Dip) 📉</span>
              <div className="text-sm font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                Rp {selectedCell.data.low?.toLocaleString('id-ID') || '-'} ({selectedCell.data.maxLowPercent}%)
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400/80 mt-0.5">
                Penurunan terendah dalam bulan tersebut
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
