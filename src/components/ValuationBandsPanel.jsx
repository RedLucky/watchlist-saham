'use client';

import React, { useState } from 'react';

export default function ValuationBandsPanel({ valuationBands, currentPrice }) {
  const [activeMetric, setActiveMetric] = useState('PE'); // 'PE' | 'PBV'

  if (!valuationBands) return null;

  const data = activeMetric === 'PE' ? valuationBands.pe : valuationBands.pbv;
  if (!data) return null;

  const price = currentPrice || data.currentPrice || 0;
  const bands = data.bands || {};
  const priceBands = data.priceBands || {};

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Historical Valuation Bands (PBND)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                Bloomberg PBND
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Pita deviasi standar rasio valuasi historis (Mean, ±1 SD, ±2 SD) untuk mengidentifikasi level diskon ekstrem.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveMetric('PE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'PE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            P/E Band
          </button>
          <button
            onClick={() => setActiveMetric('PBV')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'PBV'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            P/BV Band
          </button>
        </div>
      </div>

      {/* Zone Status Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎯</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Posisi Valuasi Saat Ini:</span>
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                data.zoneColor === 'emerald'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : data.zoneColor === 'teal'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                  : data.zoneColor === 'rose'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  : data.zoneColor === 'amber'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}>
                {data.zone}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
              {data.zoneDesc}
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potensi ke Mean</span>
          <span className={`text-sm font-black font-mono ${data.upsideToMeanPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {data.upsideToMeanPct >= 0 ? '+' : ''}{data.upsideToMeanPct}%
          </span>
        </div>
      </div>

      {/* Valuation Bands Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {/* -2 SD */}
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
              -2 SD (Diskon Ekstrem)
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
              {bands.minus2Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-emerald-200 dark:border-emerald-800/40 font-mono text-xs font-extrabold text-slate-900 dark:text-white">
            Rp {priceBands.minus2Sd ? Number(priceBands.minus2Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* -1 SD */}
        <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
              -1 SD (Undervalued)
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
              {bands.minus1Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-teal-200 dark:border-teal-800/40 font-mono text-xs font-extrabold text-slate-900 dark:text-white">
            Rp {priceBands.minus1Sd ? Number(priceBands.minus1Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* Mean */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
              Mean (Fair Value)
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
              {bands.mean}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-blue-200 dark:border-blue-800/40 font-mono text-xs font-extrabold text-slate-900 dark:text-white">
            Rp {priceBands.mean ? Number(priceBands.mean).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* +1 SD */}
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
              +1 SD (Overvalued)
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
              {bands.plus1Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-amber-200 dark:border-amber-800/40 font-mono text-xs font-extrabold text-slate-900 dark:text-white">
            Rp {priceBands.plus1Sd ? Number(priceBands.plus1Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* +2 SD */}
        <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
              +2 SD (Premi Ekstrem)
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
              {bands.plus2Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-rose-200 dark:border-rose-800/40 font-mono text-xs font-extrabold text-slate-900 dark:text-white">
            Rp {priceBands.plus2Sd ? Number(priceBands.plus2Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

