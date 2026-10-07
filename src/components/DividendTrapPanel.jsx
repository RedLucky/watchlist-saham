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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">◇</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Dividend Trap & Sustainability Analyzer (DTRP)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-warn-soft text-warn border border-warn uppercase tracking-wider">
                Bloomberg DTRP & DVD
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Menganalisis risiko kejatuhan harga di hari Ex-Date dan menguji apakah dividen tertutup oleh Free Cash Flow riil.
          </p>
        </div>

        {/* Verdict Badge */}
        <span className={`px-3 py-1 rounded-sm text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
 badgeColor === 'emerald'
 ? 'bg-up-soft text-up border-up '
 : badgeColor === 'rose'
 ? 'bg-down-soft text-down border-down '
 : 'bg-warn-soft text-warn border-warn '
 }`}>
          {verdict}
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Dividend Safety Score */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Skor Keamanan Dividen
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
 safetyScore >= 70 ? 'text-up ' :
 safetyScore >= 50 ? 'text-warn ' : 'text-down '
 }`}>
            {safetyScore}/100
          </span>
          <span className="text-[10px] text-muted">Risiko Trap: {trapRisk}</span>
        </div>

        {/* Dividend Yield */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Cash Dividend Yield
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {yieldPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-muted">Imbal Hasil Tunai Tahunan</span>
        </div>

        {/* FCF Coverage */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            FCF Coverage
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {fcfCoverage !== null ? `${fcfCoverage}x` : 'Sehat'}
          </span>
          <span className="text-[10px] text-muted">Kecukupan Arus Kas Bebas</span>
        </div>

        {/* Streak Consistency */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Konsistensi Rutin
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {streakYears > 0 ? `${streakYears} Tahun` : 'Baru'}
          </span>
          <span className="text-[10px] text-muted">Rekam Jejak Tanpa Putus</span>
        </div>
      </div>

      {/* Bloomberg DVD: 12-Month Passive Income Run-Rate */}
      {runRate && (
        <div className="p-3.5 rounded-sm bg-sunken border border-line space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-ink ">
            <span className="flex items-center gap-1.5">
              <span>¤</span> Proyeksi Passive Income Dividen per 1 Lot (100 Lembar):
            </span>
            <span className="text-ink font-mono text-[11px]">
              DPS: Rp {runRate.annualDps.toLocaleString('id-ID')} / lembar
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 bg-surface rounded-sm border border-line ">
              <span className="text-[10px] text-muted font-sans block">Harian (Run-Rate)</span>
              <span className="text-xs font-bold text-ink ">
                Rp {runRate.dailyPerLot.toLocaleString('id-ID')} / hari
              </span>
            </div>
            <div className="p-2 bg-surface rounded-sm border border-line ">
              <span className="text-[10px] text-muted font-sans block">Bulanan (Rata-rata)</span>
              <span className="text-xs font-bold text-ink ">
                Rp {runRate.monthlyPerLot.toLocaleString('id-ID')} / bulan
              </span>
            </div>
            <div className="p-2 bg-surface rounded-sm border border-line ">
              <span className="text-[10px] text-muted font-sans block">Tahunan (Total per Lot)</span>
              <span className="text-xs font-bold text-ink ">
                Rp {runRate.annualPerLot.toLocaleString('id-ID')} / th
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Insights Bullet Points */}
      <div className="space-y-1.5 pt-1">
        {positiveFactors.map((text, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-ink ">
            <span className="text-up font-bold">✓</span>
            <span>{text}</span>
          </div>
        ))}
        {riskFactors.map((text, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-down ">
            <span className="text-down font-bold">▲</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

