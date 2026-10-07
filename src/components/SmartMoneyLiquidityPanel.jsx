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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">◆</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Peta Smart Money KSEI & Profil Likuiditas (OWN / BRKR / GP)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-up-soft text-up border border-up uppercase tracking-wider">
                Bloomberg OWN & BRKR
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Analisis pergeseran kepemilikan institusi KSEI (MoM Shift), konsentrasi broker, dan Value Area harga pada emiten {ticker}.
          </p>
        </div>

        {kseiShift?.verdict && (
          <span className={`px-3 py-1 rounded-sm text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
 kseiShift.badgeColor === 'emerald'
 ? 'bg-up-soft text-up border-up '
 : kseiShift.badgeColor === 'rose'
 ? 'bg-down-soft text-down border-down '
 : 'bg-sunken text-ink border-line '
 }`}>
            {kseiShift.verdict}
          </span>
        )}
      </div>

      {/* Main 3-Column Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1: KSEI Ownership Map (OWN / HDS) */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>▥</span> Kepemilikan KSEI
              </span>
              <span className="text-[10px] text-muted font-mono">
                {kseiShift?.date || 'Update Terakhir'}
              </span>
            </div>

            {kseiShift ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Institusi:</span>
                  <span className="font-bold font-mono text-ink ">
                    {kseiShift.institutionalPercent}%
                    {kseiShift.momShift && (
                      <span className={`ml-1 text-[10px] ${
 kseiShift.momShift.diffInstPct >= 0 ? 'text-up' : 'text-down'
 }`}>
                        ({kseiShift.momShift.diffInstPct >= 0 ? `+${kseiShift.momShift.diffInstPct}%` : `${kseiShift.momShift.diffInstPct}%`})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Investor Ritel:</span>
                  <span className="font-bold font-mono text-ink ">
                    {kseiShift.retailPercent}%
                    {kseiShift.momShift && (
                      <span className={`ml-1 text-[10px] ${
 kseiShift.momShift.diffRetailPct >= 0 ? 'text-up' : 'text-down'
 }`}>
                        ({kseiShift.momShift.diffRetailPct >= 0 ? `+${kseiShift.momShift.diffRetailPct}%` : `${kseiShift.momShift.diffRetailPct}%`})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Asing (Foreign):</span>
                  <span className="font-bold font-mono text-ink ">
                    {kseiShift.foreignPercent}%
                  </span>
                </div>

                {/* Sub-institutions detail */}
                <div className="pt-2 border-t border-line space-y-1">
                  {kseiShift.institutionalDetail?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted flex items-center gap-1">
                        <span>{item.icon}</span> {item.category}
                      </span>
                      <span className="font-mono text-ink ">
                        {item.localPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted mt-2">Data KSEI belum tersedia.</p>
            )}
          </div>
        </div>

        {/* Column 2: Broker Concentration (BRKR) */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>▣</span> Konsentrasi Broker (BRKR)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sunken text-ink ">
                CR3: {brokerConcentration?.cr3}%
              </span>
            </div>

            {brokerConcentration ? (
              <div className="space-y-2 mt-2">
                <div className="p-2.5 rounded-sm bg-surface border border-line text-center">
                  <span className="text-[10px] text-muted uppercase font-bold block">
                    Bandarmologi Flow Index (BFI)
                  </span>
                  <span className={`text-base font-black font-mono mt-0.5 block ${
 brokerConcentration.bfi > 0 ? 'text-up ' :
 brokerConcentration.bfi < 0 ? 'text-down ' : 'text-muted'
 }`}>
                    {brokerConcentration.bfi > 0 ? `+${brokerConcentration.bfi}` : brokerConcentration.bfi}
                  </span>
                  <span className="text-[10px] text-muted">
                    {brokerConcentration.verdict}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs pt-1">
                  <div className="p-1.5 bg-surface rounded border border-line ">
                    <span className="text-[9px] text-muted block font-sans">CR1</span>
                    <span className="font-bold text-ink ">{brokerConcentration.cr1}%</span>
                  </div>
                  <div className="p-1.5 bg-surface rounded border border-line ">
                    <span className="text-[9px] text-muted block font-sans">CR3</span>
                    <span className="font-bold text-ink ">{brokerConcentration.cr3}%</span>
                  </div>
                  <div className="p-1.5 bg-surface rounded border border-line ">
                    <span className="text-[9px] text-muted block font-sans">CR5</span>
                    <span className="font-bold text-ink ">{brokerConcentration.cr5}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted mt-1">
                  {brokerConcentration.statusText}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted mt-2">Data konsentrasi broker belum tersedia.</p>
            )}
          </div>
        </div>

        {/* Column 3: Volume Profile (GP: POC / VAH / VAL) */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>▤</span> Value Area & POC (GP)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sunken text-ink ">
                70% Value Area
              </span>
            </div>

            {volumeProfile ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Point of Control (POC):</span>
                  <span className="font-black font-mono text-ink ">
                    Rp {volumeProfile.pocPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Value Area High (VAH):</span>
                  <span className="font-bold font-mono text-ink ">
                    Rp {volumeProfile.vahPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Value Area Low (VAL):</span>
                  <span className="font-bold font-mono text-ink ">
                    Rp {volumeProfile.valPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-2 rounded-sm bg-surface border border-line text-[11px] mt-2">
                  <span className="text-muted font-sans block">Status Posisi:</span>
                  <span className="font-bold text-ink ">
                    {volumeProfile.positionStatus}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted mt-2">Data volume profile belum tersedia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

