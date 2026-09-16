'use client';

import React, { useState } from 'react';

/**
 * Bloomberg RRG: Relative Rotation Graph (4-Quadrant Sector Rotation)
 * Maps sectors into Leading, Weakening, Lagging, and Improving quadrants.
 */
export default function SectorRrgPanel({ rrg = [] }) {
  const [selectedQuadrant, setSelectedQuadrant] = useState('ALL');

  if (!Array.isArray(rrg) || rrg.length === 0) return null;

  const filteredSectors = selectedQuadrant === 'ALL'
    ? rrg
    : rrg.filter(s => s.quadrant === selectedQuadrant);

  const quadrantsInfo = [
    {
      id: 'LEADING',
      title: 'Leading (Memimpin) 🟢',
      desc: 'RS > 100 & Momentum > 100. Sektor terkuat yang memimpin IHSG.',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    },
    {
      id: 'WEAKENING',
      title: 'Weakening (Melemah) 🟡',
      desc: 'RS > 100 & Momentum < 100. Kekuatan relatif tinggi namun akselerasi melambat.',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    },
    {
      id: 'LAGGING',
      title: 'Lagging (Tertinggal) 🔴',
      desc: 'RS < 100 & Momentum < 100. Sektor terlemah di bawah indeks acuan.',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
    },
    {
      id: 'IMPROVING',
      title: 'Improving (Membaik) 🔵',
      desc: 'RS < 100 & Momentum > 100. Rebound awal dan perputaran arus modal masuk.',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧭</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Rotasi Sektor 4-Kuadran (RRG / Relative Rotation Graph)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Bloomberg RRG
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Memetakan siklus rotasi sektoral BEI berdasarkan Relative Strength (RS-Ratio) dan Relative Momentum vs IHSG.
          </p>
        </div>

        {/* Quadrant Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedQuadrant('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              selectedQuadrant === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua ({rrg.length})
          </button>
          {quadrantsInfo.map(q => {
            const count = rrg.filter(s => s.quadrant === q.id).length;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedQuadrant(q.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedQuadrant === q.id
                    ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {q.id} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Quadrants Summary Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {quadrantsInfo.map(q => (
          <div key={q.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wide inline-block ${q.badgeClass}`}>
              {q.title}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {q.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Sectors Coordinate Table / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSectors.map((s, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {s.sector}
                </h4>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                  s.quadrant === 'LEADING' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                  s.quadrant === 'WEAKENING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' :
                  s.quadrant === 'IMPROVING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300' :
                  'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                }`}>
                  {s.quadrant}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {s.advice}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">
                RS-Ratio: <strong className="text-slate-800 dark:text-slate-200">{s.rsRatio}</strong>
              </span>
              <span className="text-slate-500">
                Momentum: <strong className="text-slate-800 dark:text-slate-200">{s.rsMomentum}</strong>
              </span>
              <span className={`font-bold ${
                s.return5d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                5D: {s.return5d >= 0 ? `+${s.return5d}%` : `${s.return5d}%`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
