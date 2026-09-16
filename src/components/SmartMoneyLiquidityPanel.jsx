'use client';

import React from 'react';

/**
 * Bloomberg OWN, BRKR, and GP:
 * KSEI Smart Money Ownership Map, Broker Concentration & Volume Profile Panel
 */
export default function SmartMoneyLiquidityPanel({
  kseiShift = null,
  brokerConcentration = null,
  volumeProfile = null,
  ticker = ''
}) {
  if (!kseiShift && !brokerConcentration && !volumeProfile) return null;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐋</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Peta Smart Money KSEI & Profil Likuiditas (OWN / BRKR / GP)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Bloomberg OWN & BRKR
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Analisis pergeseran kepemilikan institusi KSEI (MoM Shift), konsentrasi broker, dan Value Area harga pada emiten {ticker}.
          </p>
        </div>

        {kseiShift?.verdict && (
          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
            kseiShift.badgeColor === 'emerald'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : kseiShift.badgeColor === 'rose'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
          }`}>
            {kseiShift.verdict}
          </span>
        )}
      </div>

      {/* Main 3-Column Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1: KSEI Ownership Map (OWN / HDS) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🏛️</span> Kepemilikan KSEI
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {kseiShift?.date || 'Update Terakhir'}
              </span>
            </div>

            {kseiShift ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Institusi:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {kseiShift.institutionalPercent}%
                    {kseiShift.momShift && (
                      <span className={`ml-1 text-[10px] ${
                        kseiShift.momShift.diffInstPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        ({kseiShift.momShift.diffInstPct >= 0 ? `+${kseiShift.momShift.diffInstPct}%` : `${kseiShift.momShift.diffInstPct}%`})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Investor Ritel:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {kseiShift.retailPercent}%
                    {kseiShift.momShift && (
                      <span className={`ml-1 text-[10px] ${
                        kseiShift.momShift.diffRetailPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        ({kseiShift.momShift.diffRetailPct >= 0 ? `+${kseiShift.momShift.diffRetailPct}%` : `${kseiShift.momShift.diffRetailPct}%`})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Asing (Foreign):</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {kseiShift.foreignPercent}%
                  </span>
                </div>

                {/* Sub-institutions detail */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 space-y-1">
                  {kseiShift.institutionalDetail?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span>{item.icon}</span> {item.category}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {item.localPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Data KSEI belum tersedia.</p>
            )}
          </div>
        </div>

        {/* Column 2: Broker Concentration (BRKR) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>💼</span> Konsentrasi Broker (BRKR)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                CR3: {brokerConcentration?.cr3}%
              </span>
            </div>

            {brokerConcentration ? (
              <div className="space-y-2 mt-2">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Bandarmologi Flow Index (BFI)
                  </span>
                  <span className={`text-base font-black font-mono mt-0.5 block ${
                    brokerConcentration.bfi > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    brokerConcentration.bfi < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'
                  }`}>
                    {brokerConcentration.bfi > 0 ? `+${brokerConcentration.bfi}` : brokerConcentration.bfi}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {brokerConcentration.verdict}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs pt-1">
                  <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[9px] text-slate-400 block font-sans">CR1</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{brokerConcentration.cr1}%</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[9px] text-slate-400 block font-sans">CR3</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{brokerConcentration.cr3}%</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[9px] text-slate-400 block font-sans">CR5</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{brokerConcentration.cr5}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {brokerConcentration.statusText}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Data konsentrasi broker belum tersedia.</p>
            )}
          </div>
        </div>

        {/* Column 3: Volume Profile (GP: POC / VAH / VAL) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📊</span> Value Area & POC (GP)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                70% Value Area
              </span>
            </div>

            {volumeProfile ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Point of Control (POC):</span>
                  <span className="font-black font-mono text-indigo-600 dark:text-indigo-400">
                    Rp {volumeProfile.pocPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Value Area High (VAH):</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    Rp {volumeProfile.vahPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Value Area Low (VAL):</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    Rp {volumeProfile.valPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 text-[11px] mt-2">
                  <span className="text-slate-500 font-sans block">Status Posisi:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {volumeProfile.positionStatus}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Data volume profile belum tersedia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

