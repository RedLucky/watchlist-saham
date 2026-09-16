'use client';

import React from 'react';

/**
 * Bloomberg CA: Live Corporate Actions & Catalyst Calendar Panel
 * Displays upcoming and historical corporate events (Dividends, RUPS, Financial Reports)
 */
export default function CorporateActionsPanel({ corporateActions = [], ticker = '' }) {
  if (!Array.isArray(corporateActions) || corporateActions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Kalender Aksi Korporasi & Katalis Pasar (CA)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Bloomberg CA
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Jadwal dividen kas, RUPS, dan jendela estimasi rilis laporan keuangan berkala untuk emiten {ticker}.
          </p>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {corporateActions.length} Agenda Terdeteksi
        </span>
      </div>

      {/* Events Timeline Grid */}
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
    </div>
  );
}
