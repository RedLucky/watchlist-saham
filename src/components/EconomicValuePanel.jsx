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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">◆</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Economic Value Added (ROIC vs WACC)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-up-soft text-up border border-up uppercase tracking-wider">
                Bloomberg WACC
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Mengukur efisiensi modal: Apakah imbal hasil modal investasi (ROIC) melampaui biaya modal rata-rata tertimbang (WACC).
          </p>
        </div>

        {/* Verdict Badge */}
        <span className={`px-3 py-1 rounded-sm text-xs font-black self-start sm:self-auto uppercase tracking-wide border ${
 badgeColor === 'emerald'
 ? 'bg-up-soft text-up border-up '
 : badgeColor === 'teal'
 ? 'bg-up-soft text-up border-up '
 : badgeColor === 'rose'
 ? 'bg-down-soft text-down border-down '
 : 'bg-warn-soft text-warn border-warn '
 }`}>
          {verdict}
        </span>
      </div>

      {/* Primary KPI Spread Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* ROIC */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            ROIC (Return on Capital)
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {roic}%
          </span>
          <span className="text-[10px] text-muted">NOPAT / Invested Capital</span>
        </div>

        {/* WACC */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            WACC (Biaya Modal)
          </span>
          <span className="text-lg font-black font-mono text-ink mt-0.5 block">
            {wacc}%
          </span>
          <span className="text-[10px] text-muted">Batas Minimum Kelayakan</span>
        </div>

        {/* Economic Spread */}
        <div className={`p-3.5 rounded-sm border ${
 isPositiveSpread
 ? 'bg-up-soft border-up '
 : 'bg-down-soft border-down '
 }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
 isPositiveSpread ? 'text-up ' : 'text-down '
 }`}>
            Economic Spread
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
 isPositiveSpread ? 'text-up ' : 'text-down '
 }`}>
            {isPositiveSpread ? '+' : ''}{economicSpread}%
          </span>
          <span className="text-[10px] text-muted">ROIC dikurangi WACC</span>
        </div>

        {/* Estimated EVA */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            EVA (Economic Value)
          </span>
          <span className={`text-lg font-black font-mono mt-0.5 block ${
 eva >= 0 ? 'text-ink ' : 'text-down '
 }`}>
            {eva >= 0 ? '+' : ''}Rp {(eva / 1e9).toFixed(1)} M
          </span>
          <span className="text-[10px] text-muted">Nilai Tambah Ekonomi Riil</span>
        </div>
      </div>

      {/* Capital Structure Breakdown */}
      <div className="p-3.5 rounded-sm bg-sunken border border-line space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-ink ">
          <span>Struktur Bobot Modal (Capital Structure):</span>
          <span className="text-muted font-mono text-[11px]">
            Ekuitas {weightOfEquityPct}% • Utang {weightOfDebtPct}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-sunken ">
          <div
            className="bg-accent h-full transition-all"
            style={{ width: `${weightOfEquityPct}%` }}
            title={`Ekuitas: ${weightOfEquityPct}% (Cost of Equity: ${costOfEquity}%)`}
          />
          <div
            className="bg-warn h-full transition-all"
            style={{ width: `${weightOfDebtPct}%` }}
            title={`Utang: ${weightOfDebtPct}% (After-Tax Cost of Debt: ${afterTaxCostOfDebt}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            <span>Cost of Equity ($K_e$): <strong>{costOfEquity}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warn inline-block" />
            <span>Cost of Debt After-Tax ($K_d$): <strong>{afterTaxCostOfDebt}%</strong></span>
          </div>
        </div>

        <p className="text-xs text-muted pt-1 border-t border-line ">
          ✦ <strong>Kesimpulan Analis:</strong> {verdictDesc}
        </p>
      </div>
    </div>
  );
}

