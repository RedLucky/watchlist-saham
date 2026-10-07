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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">■</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Batas Auto-Rejection BEI & Tangga Fraksi (ARA/ARB)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
                Bloomberg ARA / ARB
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Batas regulasi pergerakan harga simetris BEI (Tier {limitPct}%) dan jarak fraksi harga real-time emiten {ticker}.
          </p>
        </div>

        {warningMessage && (
          <span className={`px-3 py-1 rounded-sm text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
 proximity.includes('ARA')
 ? 'bg-up-soft text-up border-up '
 : 'bg-down-soft text-down border-down '
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
              className={`p-3 rounded-sm border flex items-start gap-2.5 text-xs ${
 alert.level === 'CRITICAL'
 ? 'bg-down-soft border-down text-down '
 : alert.level === 'WARNING'
 ? 'bg-warn-soft border-warn text-warn '
 : 'bg-sunken border-line text-ink '
 }`}
            >
              <span className="text-base shrink-0">◉</span>
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
        <div className="p-3.5 rounded-sm bg-down-soft border border-down ">
          <span className="text-[10px] font-sans font-bold text-down uppercase tracking-wider block">
            Batas Bawah (ARB -{limitPct}%)
          </span>
          <span className="text-lg font-black text-down mt-1 block">
            Rp {arbPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-muted font-sans block mt-0.5">
            Sisa {ticksToARB} fraksi ke batas bawah
          </span>
        </div>

        {/* Current Price */}
        <div className="p-3.5 rounded-sm bg-sunken border border-line ">
          <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-wider block">
            Harga Terakhir
          </span>
          <span className="text-xl font-black text-ink mt-0.5 block">
            Rp {currentPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-muted font-sans block mt-0.5">
            Posisi Saat Ini
          </span>
        </div>

        {/* ARA Ceiling */}
        <div className="p-3.5 rounded-sm bg-up-soft border border-up ">
          <span className="text-[10px] font-sans font-bold text-up uppercase tracking-wider block">
            Batas Atas (ARA +{limitPct}%)
          </span>
          <span className="text-lg font-black text-up mt-1 block">
            Rp {araPrice.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-muted font-sans block mt-0.5">
            Sisa {ticksToARA} fraksi ke batas atas
          </span>
        </div>
      </div>

      {/* 7-Step Price Ladder */}
      {ladder.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
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
                  className={`p-2.5 rounded-sm border text-center transition-all ${
 isCurrent
 ? 'bg-sunken border-line shadow-sm ring-1 ring-accent'
 : isARA
 ? 'bg-up-soft border-up '
 : isARB
 ? 'bg-down-soft border-down '
 : 'bg-sunken border-line '
 }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={`${
 isARA ? 'text-up' : isARB ? 'text-down' : isCurrent ? 'text-ink' : 'text-muted'
 }`}>
                      {step.label}
                    </span>
                    <span className="font-mono text-muted">
                      {step.ticksFromCurrent > 0 ? `+${step.ticksFromCurrent}t` : step.ticksFromCurrent < 0 ? `${step.ticksFromCurrent}t` : '0t'}
                    </span>
                  </div>

                  <div className="font-mono font-black text-xs sm:text-sm text-ink mt-1">
                    Rp {step.targetPrice.toLocaleString('id-ID')}
                  </div>

                  <div className={`text-[10px] font-mono mt-0.5 ${
 step.changeFromPrev > 0 ? 'text-up ' :
 step.changeFromPrev < 0 ? 'text-down ' : 'text-muted'
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

