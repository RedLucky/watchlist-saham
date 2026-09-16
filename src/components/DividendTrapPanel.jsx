'use client';

import React from 'react';

export default function DividendTrapPanel({ dividendTrap }) {
  if (!dividendTrap || !dividendTrap.isDividendPayer) return null;

  const {
    safetyScore,
    trapRisk,
    verdict,
    badgeColor,
    yieldPct,
    streakYears,
    fcfCoverage,
    positiveFactors = [],
    riskFactors = [],
    runRate
  } = dividendTrap;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🪤</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Dividend Trap & Sustainability Analyzer (DTRP)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Bloomberg DTRP & DVD
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Menganalisis risiko kejatuhan harga di hari Ex-Date dan menguji apakah dividen tertutup oleh Free Cash Flow riil.
          </p>
        </div>

        {/* Verdict Badge */}
        <span className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
          badgeColor === 'emerald'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : badgeColor === 'rose'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        }`}>
          {verdict}
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Dividend Safety Score */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Skor Keamanan Dividen
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
            safetyScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
            safetyScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {safetyScore}/100
          </span>
          <span className="text-[10px] text-slate-500">Risiko Trap: {trapRisk}</span>
        </div>

        {/* Dividend Yield */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Cash Dividend Yield
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            {yieldPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-500">Imbal Hasil Tunai Tahunan</span>
        </div>

        {/* FCF Coverage */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            FCF Coverage
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            {fcfCoverage !== null ? `${fcfCoverage}x` : 'Sehat'}
          </span>
          <span className="text-[10px] text-slate-500">Kecukupan Arus Kas Bebas</span>
        </div>

        {/* Streak Consistency */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Konsistensi Rutin
          </span>
          <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            {streakYears > 0 ? `${streakYears} Tahun` : 'Baru'}
          </span>
          <span className="text-[10px] text-slate-500">Rekam Jejak Tanpa Putus</span>
        </div>
      </div>

      {/* Bloomberg DVD: 12-Month Passive Income Run-Rate */}
      {runRate && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>💰</span> Proyeksi Passive Income Dividen per 1 Lot (100 Lembar):
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
              DPS: Rp {runRate.annualDps.toLocaleString('id-ID')} / lembar
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 font-sans block">Harian (Run-Rate)</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rp {runRate.dailyPerLot.toLocaleString('id-ID')} / hari
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 font-sans block">Bulanan (Rata-rata)</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rp {runRate.monthlyPerLot.toLocaleString('id-ID')} / bulan
              </span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 font-sans block">Tahunan (Total per Lot)</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Rp {runRate.annualPerLot.toLocaleString('id-ID')} / th
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Insights Bullet Points */}
      <div className="space-y-1.5 pt-1">
        {positiveFactors.map((text, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>{text}</span>
          </div>
        ))}
        {riskFactors.map((text, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <span className="text-rose-500 font-bold">⚠️</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

