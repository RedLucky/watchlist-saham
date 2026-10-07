'use client';

import React, { useState, useMemo } from 'react';
import { aggregateSeasonalityStats } from '@/lib/monthlySeasonalityEngine';

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
  const [timeframe, setTimeframe] = useState('5Y'); // '3Y' | '5Y' | '10Y'

  const allYears = data?.years || [];
  const matrix = data?.matrix || {};

  // Determine active slice of years based on selected timeframe
  const yearLimit = timeframe === '3Y' ? 3 : timeframe === '10Y' ? 10 : 5;
  const activeYears = useMemo(() => {
    return allYears.slice(0, yearLimit);
  }, [allYears, yearLimit]);

  // Recalculate dynamic statistics for active years
  const { monthStats, overallWinRate, bestMonth, worstMonth } = useMemo(() => {
    return aggregateSeasonalityStats(matrix, activeYears);
  }, [matrix, activeYears]);

  if (!data || !data.years || data.years.length === 0) {
    return (
      <div className="bg-surface rounded-sm border border-line p-6 text-center text-muted ">
        <p className="text-sm">Data histori seasonality belum tersedia untuk {ticker || 'emiten ini'}.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-md border border-line p-5 md:p-6 shadow-sm space-y-6">
      {/* Header Title & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl md:text-2xl">▦</span>
            <h3 className="text-base md:text-lg font-black text-ink tracking-tight">
              Kalender Seasonality & Performa Bulanan ({timeframe})
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-sm bg-sunken text-ink border border-line uppercase font-mono">
              {activeYears.length} Tahun Aktif
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Matriks histori persentase kenaikan/penurunan harga ({ticker || 'Emiten'}) per bulan, rata-rata harga transaksi, dan potensi ayunan puncak (swing).
          </p>
        </div>

        {/* Timeframe Selector & Status Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 3Y / 5Y / 10Y Pill Switcher */}
          <div className="flex items-center gap-1 bg-sunken p-1 rounded-sm border border-line ">
            <button
              onClick={() => { setTimeframe('3Y'); setSelectedCell(null); }}
              className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${
 timeframe === '3Y'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
              title="Analisis 3 Tahun Terakhir (Siklus Terkini)"
            >
              3 Thn
            </button>
            <button
              onClick={() => { setTimeframe('5Y'); setSelectedCell(null); }}
              className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${
 timeframe === '5Y'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
              title="Analisis 5 Tahun Terakhir (Standar Optimal)"
            >
              5 Thn
            </button>
            <button
              onClick={() => { setTimeframe('10Y'); setSelectedCell(null); }}
              className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${
 timeframe === '10Y'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-muted hover:text-ink '
 }`}
              title="Analisis 10 Tahun Terakhir (Institutional View)"
            >
              10 Thn
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded-full bg-up-soft text-up border border-up text-[11px]">
              ● Plus
            </span>
            <span className="px-2 py-0.5 rounded-full bg-down-soft text-down border border-down text-[11px]">
              ● Minus
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 Dynamic Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-up-soft border border-up rounded-sm p-3.5">
          <span className="text-xs text-up font-medium">Bulan Terkuat ({timeframe}) ★</span>
          <div className="text-lg font-bold text-up mt-1">
            {bestMonth ? bestMonth.name : '-'}
          </div>
          <p className="text-[11px] text-up mt-0.5">
            Win Rate: <strong className="font-semibold">{bestMonth ? `${bestMonth.winRatePercent}%` : '-'}</strong> (Avg {bestMonth && bestMonth.avgReturnPercent >= 0 ? '+' : ''}{bestMonth ? `${bestMonth.avgReturnPercent}%` : '-'})
          </p>
        </div>

        <div className="bg-down-soft border border-down rounded-sm p-3.5">
          <span className="text-xs text-down font-medium">Bulan Terlemah ({timeframe}) ▲</span>
          <div className="text-lg font-bold text-down mt-1">
            {worstMonth ? worstMonth.name : '-'}
          </div>
          <p className="text-[11px] text-down mt-0.5">
            Win Rate: <strong className="font-semibold">{worstMonth ? `${worstMonth.winRatePercent}%` : '-'}</strong> (Avg {worstMonth && worstMonth.avgReturnPercent >= 0 ? '+' : ''}{worstMonth ? `${worstMonth.avgReturnPercent}%` : '-'})
          </p>
        </div>

        <div className="bg-sunken border border-line rounded-sm p-3.5">
          <span className="text-xs text-muted font-medium">Win Rate Total ({timeframe}) ↗</span>
          <div className="text-lg font-bold text-ink mt-1">
            {overallWinRate}% Hijau
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            Dari {activeYears.length} tahun periode terpilih
          </p>
        </div>

        <div className="bg-sunken border border-line rounded-sm p-3.5">
          <span className="text-xs text-muted font-medium">Interaksi Matriks ✦</span>
          <div className="text-sm font-semibold text-ink mt-1">
            Klik Sel Bulan
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            Membuka rincian harga & ayunan swing
          </p>
        </div>
      </div>

      {/* Seasonality Heatmap Grid */}
      <div className="overflow-x-auto rounded-sm border border-line ">
        <table className="w-full text-xs text-center border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-sunken text-ink font-semibold">
              <th className="py-2.5 px-2 text-left border-b border-r border-line w-20">Tahun</th>
              {MONTH_NAMES.map((mName, idx) => (
                <th key={idx} className="py-2.5 px-1 border-b border-r border-line last:border-r-0">
                  {mName}
                </th>
              ))}
              <th className="py-2.5 px-2 border-b border-line bg-sunken text-ink ">
                Total Thn
              </th>
            </tr>
          </thead>
          <tbody>
            {activeYears.map((yr) => {
              const yrData = matrix[yr] || {};
              const yrSummary = yrData.yearSummary || {};
              const retYr = yrSummary.returnPercent;

              return (
                <tr key={yr} className="border-b border-line hover:bg-sunken ">
                  <td className="py-2.5 px-2 text-left font-bold text-ink border-r border-line ">
                    {yr} {yrSummary.isYtd && <span className="text-[10px] text-ink font-normal">(YTD)</span>}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const cell = yrData[m] || {};
                    const { status, returnPercent } = cell;
                    const isSelected = selectedCell?.year === yr && selectedCell?.month === m;

                    let bgClass = 'bg-sunken  text-muted ';
                    let textVal = '-';

                    if (status === 'PLUS') {
                      bgClass = 'bg-up-soft text-up  font-semibold hover:bg-up-soft';
                      textVal = `+${returnPercent}%`;
                    } else if (status === 'MINUS') {
                      bgClass = 'bg-down-soft text-down  font-semibold hover:bg-down-soft';
                      textVal = `${returnPercent}%`;
                    } else if (status === 'FLAT') {
                      bgClass = 'bg-sunken  text-muted ';
                      textVal = '0.0%';
                    } else if (status === 'FUTURE') {
                      bgClass = 'bg-sunken  text-muted  cursor-default';
                      textVal = '•';
                    }

                    const isInteractive = status !== 'FUTURE' && status !== 'NO_DATA';

                    return (
                      <td
                        key={m}
                        onClick={() => isInteractive && setSelectedCell({ year: yr, month: m, data: cell })}
                        className={`py-2 px-1 border-r border-line transition-all ${
 isInteractive ? 'cursor-pointer' : 'cursor-default opacity-50'
 } ${bgClass} ${isSelected ? 'ring-2 ring-accent relative z-10 font-black' : ''}`}
                        title={cell.open ? `Klik untuk detail rincian ${FULL_MONTH_NAMES[m]} ${yr}` : ''}
                      >
                        {textVal}
                      </td>
                    );
                  })}
                  <td className={`py-2 px-2 font-bold border-l border-line ${retYr > 0 ? 'text-up bg-up-soft' : retYr < 0 ? 'text-down bg-down-soft' : 'text-muted '}`}>
                    {retYr != null ? `${retYr > 0 ? '+' : ''}${retYr}%` : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Aggregated Win Rate Row */}
            <tr className="bg-sunken font-semibold border-t-2 border-line text-ink ">
              <td className="py-2.5 px-2 text-left border-r border-line font-bold">
                Win Rate
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const wr = st.winRatePercent || 0;
                return (
                  <td key={m} className={`py-2 px-1 border-r border-line ${wr >= 60 ? 'text-up font-bold' : wr <= 40 ? 'text-down ' : 'text-ink '}`}>
                    {st.totalYearsEvaluated > 0 ? `${wr}%` : '-'}
                  </td>
                );
              })}
              <td className="py-2 px-2 text-up font-bold">
                {overallWinRate}%
              </td>
            </tr>

            {/* Aggregated Average Return Row */}
            <tr className="bg-sunken text-[11px] border-t border-line text-muted ">
              <td className="py-2 px-2 text-left border-r border-line font-medium">
                Avg Return
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const avgR = st.avgReturnPercent;
                return (
                  <td key={m} className={`py-1.5 px-1 border-r border-line font-medium ${avgR > 0 ? 'text-up ' : avgR < 0 ? 'text-down ' : ''}`}>
                    {st.totalYearsEvaluated > 0 ? `${avgR > 0 ? '+' : ''}${avgR}%` : '-'}
                  </td>
                );
              })}
              <td className="py-1.5 px-2 font-medium">
                -
              </td>
            </tr>

            {/* Aggregated Average Swing High % Row */}
            <tr className="bg-up-soft text-[10px] border-t border-line text-up ">
              <td className="py-1.5 px-2 text-left border-r border-line font-medium">
                Avg Peak ↑
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const avgH = st.avgHighPercent;
                return (
                  <td key={m} className="py-1 px-1 border-r border-line font-mono">
                    {st.totalYearsEvaluated > 0 ? `+${avgH}%` : '-'}
                  </td>
                );
              })}
              <td className="py-1 px-2 font-mono">
                -
              </td>
            </tr>

            {/* Aggregated Average Traded Price Row */}
            <tr className="bg-sunken text-[10px] border-t border-line text-ink font-mono">
              <td className="py-1.5 px-2 text-left border-r border-line font-sans font-medium">
                Avg Harga ¤
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const st = monthStats[m] || {};
                const avgP = st.avgMonthlyPrice;
                return (
                  <td key={m} className="py-1 px-1 border-r border-line ">
                    {st.totalYearsEvaluated > 0 && avgP > 0 ? avgP.toLocaleString('id-ID') : '-'}
                  </td>
                );
              })}
              <td className="py-1 px-2">
                -
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selected Month Detail Modal / Drawer */}
      {selectedCell && selectedCell.data && (
        <div className="bg-sunken border border-line rounded-sm p-4 relative animate-fadeIn">
          <button
            onClick={() => setSelectedCell(null)}
            className="absolute top-3 right-3 text-muted hover:text-ink text-xs px-2.5 py-1 rounded-md bg-sunken font-semibold"
          >
            ✕ Tutup
          </button>

          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>▦</span> Rincian Performa: {FULL_MONTH_NAMES[selectedCell.month]} {selectedCell.year} ({ticker})
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="bg-surface p-3 rounded-sm border border-line ">
              <span className="text-[11px] text-muted ">Rata-rata Harga Transaksi</span>
              <div className="text-base font-bold text-ink mt-0.5">
                Rp {selectedCell.data.avgPrice ? selectedCell.data.avgPrice.toLocaleString('id-ID') : '-'}
              </div>
            </div>

            <div className="bg-surface p-3 rounded-sm border border-line ">
              <span className="text-[11px] text-muted ">Harga Open → Close</span>
              <div className="text-xs font-semibold text-ink mt-1">
                Rp {selectedCell.data.open?.toLocaleString('id-ID') || '-'} → Rp {selectedCell.data.close?.toLocaleString('id-ID') || '-'}
              </div>
              <p className={`text-[11px] font-bold mt-0.5 ${selectedCell.data.returnPercent > 0 ? 'text-up ' : selectedCell.data.returnPercent < 0 ? 'text-down ' : 'text-muted'}`}>
                Hasil: {selectedCell.data.returnPercent > 0 ? '+' : ''}{selectedCell.data.returnPercent}%
              </p>
            </div>

            <div className="bg-up-soft p-3 rounded-sm border border-up ">
              <span className="text-[11px] text-up font-medium">Kenaikan Puncak (High Swing) ↑</span>
              <div className="text-sm font-bold text-up mt-0.5">
                Rp {selectedCell.data.high?.toLocaleString('id-ID') || '-'} (+{selectedCell.data.maxHighPercent}%)
              </div>
              <p className="text-[10px] text-up mt-0.5">
                Kenaikan maks dari harga pembukaan
              </p>
            </div>

            <div className="bg-down-soft p-3 rounded-sm border border-down ">
              <span className="text-[11px] text-down font-medium">Koreksi Terendah (Low Dip) ↘</span>
              <div className="text-sm font-bold text-down mt-0.5">
                Rp {selectedCell.data.low?.toLocaleString('id-ID') || '-'} ({selectedCell.data.maxLowPercent}%)
              </div>
              <p className="text-[10px] text-down mt-0.5">
                Penurunan terendah dalam bulan tersebut
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
