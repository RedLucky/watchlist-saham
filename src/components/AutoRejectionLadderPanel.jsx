'use client';

import React from 'react';

/**
 * Bloomberg ARA / ARB & ALRT:
 * Official IDX Auto-Rejection Limits, Tick Distance Ladder & Smart Alerts
 */
export default function AutoRejectionLadderPanel({
  executionLimits = null,
  smartAlerts = [],
  ticker = ''
}) {
  if (!executionLimits) return null;

  const {
    limitPct,
    currentPrice,
    araPrice,
    arbPrice,
    ticksToARA,
    ticksToARB,
    proximity,
    warningMessage,
    ladder = []
  } = executionLimits;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛑</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Batas Auto-Rejection BEI & Tangga Fraksi (ARA/ARB)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Bloomberg ARA / ARB
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Batas regulasi pergerakan harga simetris BEI (Tier {limitPct}%) dan jarak fraksi harga real-time emiten {ticker}.
          </p>
        </div>

        {warningMessage && (
          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
            proximity.includes('ARA')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          }`}>
            {warningMessage}
          </span>
        )}
      </div>

      {/* Smart Alerts Banner (ALRT Module) */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map((alert, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                alert.level === 'CRITICAL'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : alert.level === 'WARNING'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              }`}
            >
              <span className="text-base shrink-0">🔔</span>
              <div className="space-y-0.5">
                <div className="font-bold">{alert.title}</div>
                <div className="text-[11px] opacity-90">{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Execution Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center font-mono">
        {/* ARB Floor */}
        <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
          <span className="text-[10px] font-sans font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Batas Bawah (ARB -{limitPct}%)
          </span>
          <span className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1 block">
            Rp {arbPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
            Sisa {ticksToARB} fraksi ke batas bawah
          </span>
        </div>

        {/* Current Price */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider block">
            Harga Terakhir
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
            Rp {currentPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
            Posisi Saat Ini
          </span>
        </div>

        {/* ARA Ceiling */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
          <span className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Batas Atas (ARA +{limitPct}%)
          </span>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
            Rp {araPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
            Sisa {ticksToARA} fraksi ke batas atas
          </span>
        </div>
      </div>

      {/* 7-Step Price Ladder */}
      {ladder.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Tangga Fraksi Harga (Execution Ladder):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
            {ladder.map((step, idx) => {
              const isCurrent = step.isCurrent;
              const isARA = step.label === 'ARA';
              const isARB = step.label === 'ARB';

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : isARA
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : isARB
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={`${
                      isARA ? 'text-emerald-600' : isARB ? 'text-rose-600' : isCurrent ? 'text-indigo-600' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                    <span className="font-mono text-slate-400">
                      {step.ticksFromCurrent > 0 ? `+${step.ticksFromCurrent}t` : step.ticksFromCurrent < 0 ? `${step.ticksFromCurrent}t` : '0t'}
                    </span>
                  </div>

                  <div className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-1">
                    Rp {step.targetPrice.toLocaleString('id-ID')}
                  </div>

                  <div className={`text-[10px] font-mono mt-0.5 ${
                    step.changeFromPrev > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    step.changeFromPrev < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                  }`}>
                    {step.changeFromPrev > 0 ? `+${step.changeFromPrev}%` : `${step.changeFromPrev}%`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
