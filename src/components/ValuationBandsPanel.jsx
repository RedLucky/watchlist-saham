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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">▤</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Historical Valuation Bands (PBND)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
                Bloomberg PBND
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Pita deviasi standar rasio valuasi historis (Mean, ±1 SD, ±2 SD) untuk mengidentifikasi level diskon ekstrem.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center bg-sunken p-1 rounded-sm self-start sm:self-auto border border-line text-xs font-bold">
          <button
            onClick={() => setActiveMetric('PE')}
            className={`px-3 py-1.5 rounded-sm transition-all ${
 activeMetric === 'PE'
 ? 'bg-accent text-on-accent shadow-xs'
 : 'text-muted hover:text-ink'
 }`}
          >
            P/E Band
          </button>
          <button
            onClick={() => setActiveMetric('PBV')}
            className={`px-3 py-1.5 rounded-sm transition-all ${
 activeMetric === 'PBV'
 ? 'bg-accent text-on-accent shadow-xs'
 : 'text-muted hover:text-ink'
 }`}
          >
            P/BV Band
          </button>
        </div>
      </div>

      {/* Zone Status Banner */}
      <div className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">◎</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted ">Posisi Valuasi Saat Ini:</span>
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
 data.zoneColor === 'emerald'
 ? 'bg-up-soft text-up border border-up '
 : data.zoneColor === 'teal'
 ? 'bg-up-soft text-up border border-up '
 : data.zoneColor === 'rose'
 ? 'bg-down-soft text-down border border-down '
 : data.zoneColor === 'amber'
 ? 'bg-warn-soft text-warn border border-warn '
 : 'bg-sunken text-ink border border-line '
 }`}>
                {data.zone}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 font-medium">
              {data.zoneDesc}
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Potensi ke Mean</span>
          <span className={`text-sm font-black font-mono ${data.upsideToMeanPct >= 0 ? 'text-up ' : 'text-down '}`}>
            {data.upsideToMeanPct >= 0 ? '+' : ''}{data.upsideToMeanPct}%
          </span>
        </div>
      </div>

      {/* Valuation Bands Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {/* -2 SD */}
        <div className="p-3 rounded-sm bg-up-soft border border-up flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-up block">
              -2 SD (Diskon Ekstrem)
            </span>
            <span className="text-xs font-bold text-muted font-mono mt-0.5 block">
              {bands.minus2Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-up font-mono text-xs font-extrabold text-ink ">
            Rp {priceBands.minus2Sd ? Number(priceBands.minus2Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* -1 SD */}
        <div className="p-3 rounded-sm bg-up-soft border border-up flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-up block">
              -1 SD (Undervalued)
            </span>
            <span className="text-xs font-bold text-muted font-mono mt-0.5 block">
              {bands.minus1Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-up font-mono text-xs font-extrabold text-ink ">
            Rp {priceBands.minus1Sd ? Number(priceBands.minus1Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* Mean */}
        <div className="p-3 rounded-sm bg-sunken border border-line flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink block">
              Mean (Fair Value)
            </span>
            <span className="text-xs font-bold text-muted font-mono mt-0.5 block">
              {bands.mean}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-line font-mono text-xs font-extrabold text-ink ">
            Rp {priceBands.mean ? Number(priceBands.mean).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* +1 SD */}
        <div className="p-3 rounded-sm bg-warn-soft border border-warn flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-warn block">
              +1 SD (Overvalued)
            </span>
            <span className="text-xs font-bold text-muted font-mono mt-0.5 block">
              {bands.plus1Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-warn font-mono text-xs font-extrabold text-ink ">
            Rp {priceBands.plus1Sd ? Number(priceBands.plus1Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>

        {/* +2 SD */}
        <div className="p-3 rounded-sm bg-down-soft border border-down flex flex-col justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-down block">
              +2 SD (Premi Ekstrem)
            </span>
            <span className="text-xs font-bold text-muted font-mono mt-0.5 block">
              {bands.plus2Sd}x
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-down font-mono text-xs font-extrabold text-ink ">
            Rp {priceBands.plus2Sd ? Number(priceBands.plus2Sd).toLocaleString('id-ID') : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

