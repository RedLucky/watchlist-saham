'use client';

import React from 'react';

export default function EconomicValuePanel({ waccData }) {
  if (!waccData) return null;

  const {
    wacc,
    roic,
    costOfEquity,
    afterTaxCostOfDebt,
    weightOfEquityPct,
    weightOfDebtPct,
    economicSpread,
    eva,
    verdict,
    badgeColor,
    verdictDesc
  } = waccData;

  const isPositiveSpread = economicSpread >= 0;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Economic Value Added (ROIC vs WACC)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Bloomberg WACC
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Mengukur efisiensi modal: Apakah imbal hasil modal investasi (ROIC) melampaui biaya modal rata-rata tertimbang (WACC).
          </p>
        </div>

        {/* Verdict Badge */}
        <span className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
          badgeColor === 'emerald'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : badgeColor === 'teal'
            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800'
            : badgeColor === 'rose'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        }`}>
          {verdict}
        </span>
      </div>

      {/* Primary KPI Spread Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* ROIC */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            ROIC (Return on Capital)
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            {roic}%
          </span>
          <span className="text-[10px] text-slate-500">NOPAT / Invested Capital</span>
        </div>

        {/* WACC */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            WACC (Biaya Modal)
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            {wacc}%
          </span>
          <span className="text-[10px] text-slate-500">Batas Minimum Kelayakan</span>
        </div>

        {/* Economic Spread */}
        <div className={`p-3.5 rounded-xl border ${
          isPositiveSpread
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
            isPositiveSpread ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
          }`}>
            Economic Spread
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
            isPositiveSpread ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isPositiveSpread ? '+' : ''}{economicSpread}%
          </span>
          <span className="text-[10px] text-slate-500">ROIC dikurangi WACC</span>
        </div>

        {/* Estimated EVA */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            EVA (Economic Value)
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
            eva >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {eva >= 0 ? '+' : ''}Rp {(eva / 1e9).toFixed(1)} M
          </span>
          <span className="text-[10px] text-slate-500">Nilai Tambah Ekonomi Riil</span>
        </div>
      </div>

      {/* Capital Structure Breakdown */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Struktur Bobot Modal (Capital Structure):</span>
          <span className="text-slate-500 font-mono text-[11px]">
            Ekuitas {weightOfEquityPct}% • Utang {weightOfDebtPct}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all"
            style={{ width: `${weightOfEquityPct}%` }}
            title={`Ekuitas: ${weightOfEquityPct}% (Cost of Equity: ${costOfEquity}%)`}
          />
          <div
            className="bg-amber-500 dark:bg-amber-400 h-full transition-all"
            style={{ width: `${weightOfDebtPct}%` }}
            title={`Utang: ${weightOfDebtPct}% (After-Tax Cost of Debt: ${afterTaxCostOfDebt}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
            <span>Cost of Equity ($K_e$): <strong>{costOfEquity}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Cost of Debt After-Tax ($K_d$): <strong>{afterTaxCostOfDebt}%</strong></span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
          💡 <strong>Kesimpulan Analis:</strong> {verdictDesc}
        </p>
      </div>
    </div>
  );
}
