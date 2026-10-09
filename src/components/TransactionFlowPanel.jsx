'use client';

/**
 * @fileoverview Multi-Timeframe Transaction Flow Panel (Inflow, Outflow & Netflow)
 * Displays Domestic (Lokal), Foreign (Asing), and Active Market flows across
 * Daily (1HK), Weekly (5HK), Monthly (20HK), and Yearly (250HK) windows.
 */

import React, { useState, useMemo } from 'react';
import { calculateTransactionFlows, FLOW_PERIOD_LABELS } from '@/lib/transactionFlowEngine';
import {
  PERIOD_ORDER,
  formatFlowRupiah,
  formatFlowLots,
  getNetflowTone,
  getDominantFlowBadge,
  getFlowSourceBadge,
  computeGrossSplitPct,
} from '@/lib/transactionFlowPresenter';

/**
 * Renders a single participant flow card (Foreign, Domestic, or Active Market Flow).
 *
 * @param {object} props - Card properties.
 * @param {string} props.title - Participant title.
 * @param {string} props.subtitle - Participant subtitle.
 * @param {string} props.icon - Unicode symbol icon.
 * @param {object} props.flow - Participant flow object ({ inflowRp, outflowRp, netflowRp, inflowLots, outflowLots, netflowLots, shareOfTurnoverPct, netflowPct }).
 * @returns {React.ReactElement} Participant flow card.
 */
function ParticipantFlowCard({ title, subtitle, icon, flow }) {
  const safeFlow = flow || {
    inflowRp: 0,
    outflowRp: 0,
    netflowRp: 0,
    inflowLots: 0,
    outflowLots: 0,
    netflowLots: 0,
    shareOfTurnoverPct: 0,
    netflowPct: 0,
  };

  const netTone = getNetflowTone(safeFlow.netflowRp);
  const split = computeGrossSplitPct(safeFlow.inflowRp, safeFlow.outflowRp);

  return (
    <div className="p-3.5 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <span className="font-mono">{icon}</span>
              <span>{title}</span>
            </div>
            <div className="text-[11px] text-muted">{subtitle}</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-surface border border-line text-ink font-semibold whitespace-nowrap">
            Porsi {safeFlow.shareOfTurnoverPct}%
          </span>
        </div>

        {/* Gross Buy (Inflow) & Gross Sell (Outflow) */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-2.5">
          <div className="p-2 rounded-sm bg-surface border border-line">
            <div className="text-[10px] text-muted uppercase font-mono">Inflow (Beli)</div>
            <div className="font-mono font-bold text-up text-xs sm:text-sm mt-0.5">
              {formatFlowRupiah(safeFlow.inflowRp)}
            </div>
            <div className="text-[10px] font-mono text-muted">
              {formatFlowLots(safeFlow.inflowLots)}
            </div>
          </div>

          <div className="p-2 rounded-sm bg-surface border border-line">
            <div className="text-[10px] text-muted uppercase font-mono">Outflow (Jual)</div>
            <div className="font-mono font-bold text-down text-xs sm:text-sm mt-0.5">
              {formatFlowRupiah(safeFlow.outflowRp)}
            </div>
            <div className="text-[10px] font-mono text-muted">
              {formatFlowLots(safeFlow.outflowLots)}
            </div>
          </div>
        </div>

        {/* Buy vs Sell Pressure Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-muted">
            <span>Beli {split.buyPct}%</span>
            <span>Jual {split.sellPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-sm bg-surface overflow-hidden flex border border-line">
            <div
              className="bg-up h-full transition-all"
              style={{ width: `${split.buyPct}%` }}
            />
            <div
              className="bg-down h-full transition-all"
              style={{ width: `${split.sellPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Netflow Box */}
      <div className={`p-2.5 rounded-sm border ${netTone.boxClass}`}>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase">
          <span>Netflow (Bersih)</span>
          <span>
            {safeFlow.netflowPct > 0 ? '+' : ''}
            {safeFlow.netflowPct}% Nilai
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <span className="font-mono font-black text-sm sm:text-base">
            {netTone.prefixIcon} {formatFlowRupiah(safeFlow.netflowRp, true)}
          </span>
          <span className="font-mono text-[11px] font-bold">
            {formatFlowLots(safeFlow.netflowLots, true)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the multi-timeframe Domestic & Foreign Inflow, Outflow, and Netflow panel.
 *
 * @param {object} props - Component props.
 * @param {object} [props.transactionFlow] - Pre-calculated transactionFlow object from API.
 * @param {object} [props.stock] - Fallback stock object if transactionFlow is not passed directly.
 * @param {string} [props.ticker] - Optional ticker symbol for header display.
 * @returns {React.ReactElement|null} TransactionFlowPanel component.
 */
export default function TransactionFlowPanel({ transactionFlow, stock, ticker }) {
  const [selectedPeriod, setSelectedPeriod] = useState('1d');

  const flowReport = useMemo(() => {
    if (transactionFlow && transactionFlow.periods) {
      return transactionFlow;
    }
    if (stock) {
      return calculateTransactionFlows(stock);
    }
    return null;
  }, [transactionFlow, stock]);

  if (!flowReport || !flowReport.periods) {
    return null;
  }

  const activeWindow = flowReport.periods[selectedPeriod] || flowReport.periods['1d'];
  if (!activeWindow) return null;

  const dominantBadge = getDominantFlowBadge(activeWindow.dominantPlayer);
  const sourceBadge = getFlowSourceBadge(activeWindow.source);
  const resolvedTicker = ticker || stock?.ticker || '';

  return (
    <div className="bg-surface border border-line rounded-md p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Badges */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <span className="font-mono">≈</span>
            <span>
              Arus Transaksi Inflow &amp; Netflow (Domestik vs Asing)
              {resolvedTicker ? ` — ${resolvedTicker}` : ''}
            </span>
          </h4>
          <p className="text-[11px] text-muted mt-0.5">
            Rincian Gross Buy (Inflow), Gross Sell (Outflow), dan Net Buy/Sell (Netflow) Harian, Mingguan, Bulanan hingga Tahunan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${sourceBadge.badgeClass}`}>
            {sourceBadge.label}
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${dominantBadge.badgeClass}`}>
            {dominantBadge.label}
          </span>
        </div>
      </div>

      {/* Period Selector Tabs + Window Turnover Summary */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="tabs grid grid-cols-2 sm:grid-cols-4" role="tablist" aria-label="Periode arus transaksi">
          {PERIOD_ORDER.map((periodKey) => {
            const periodObj = flowReport.periods[periodKey];
            const isSelected = selectedPeriod === periodKey;
            return (
              <button
                key={periodKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedPeriod(periodKey)}
                className="tab text-xs font-mono"
              >
                <span>{FLOW_PERIOD_LABELS[periodKey] || periodKey}</span>
                {periodObj?.days > 0 && (
                  <span className="text-[10px] text-muted ml-1">({periodObj.days}d)</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-sunken px-3 py-1.5 rounded-sm border border-line">
          <div>
            <span className="text-muted text-[10px] uppercase mr-1.5">Total Nilai ({activeWindow.label}):</span>
            <span className="font-bold text-ink">{formatFlowRupiah(activeWindow.totalTurnoverRp)}</span>
          </div>
          <span className="text-muted">|</span>
          <div>
            <span className="text-muted text-[10px] uppercase mr-1.5">Total Volume:</span>
            <span className="font-bold text-ink">{formatFlowLots(activeWindow.totalLots)}</span>
          </div>
        </div>
      </div>

      {/* 3-Column Participant Breakdown for Active Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ParticipantFlowCard
          icon="◎"
          title="Investor Asing (Foreign)"
          subtitle="Akumulasi / distribusi institusi & dana asing"
          flow={activeWindow.foreign}
        />
        <ParticipantFlowCard
          icon="▤"
          title="Investor Domestik (Lokal)"
          subtitle="Partisipasi institusi lokal & ritel domestik"
          flow={activeWindow.domestic}
        />
        <ParticipantFlowCard
          icon="⇅"
          title="Arus Uang Aktif (Market)"
          subtitle="Tekanan beli aktif (HAKA) vs jual aktif (HAKI)"
          flow={activeWindow.activeFlow}
        />
      </div>

      {/* Multi-Timeframe Summary Table (1D, 1W, 1M, 1Y) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
            Matriks Perbandingan Lintas Periode (Harian · Mingguan · Bulanan · Tahunan)
          </span>
          <span className="text-[10px] font-mono text-muted">
            Klik baris untuk mengganti fokus periode
          </span>
        </div>

        <div className="scroll-area overflow-x-auto border border-line rounded-sm">
          <table className="table-base w-full text-xs">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="num">Total Nilai</th>
                <th className="num">Asing Inflow</th>
                <th className="num">Asing Outflow</th>
                <th className="num">Asing Netflow</th>
                <th className="num">Domestik Inflow</th>
                <th className="num">Domestik Outflow</th>
                <th className="num">Domestik Netflow</th>
                <th>Status Dominan</th>
              </tr>
            </thead>
            <tbody>
              {PERIOD_ORDER.map((key) => {
                const win = flowReport.periods[key];
                if (!win) return null;
                const fNetTone = getNetflowTone(win.foreign?.netflowRp);
                const dNetTone = getNetflowTone(win.domestic?.netflowRp);
                const domBadge = getDominantFlowBadge(win.dominantPlayer);
                const isCurrent = selectedPeriod === key;

                return (
                  <tr
                    key={key}
                    onClick={() => setSelectedPeriod(key)}
                    className={`cursor-pointer transition-colors ${isCurrent ? 'bg-sunken font-semibold' : 'hover:bg-sunken'}`}
                  >
                    <td className="font-mono whitespace-nowrap">
                      <span className="font-bold text-ink">{win.label}</span>
                      <span className="text-[10px] text-muted block">
                        {win.days} hari bursa ({win.source === 'idx' ? 'BEI' : win.source === 'hybrid' ? 'Hibrida' : 'Estimasi'})
                      </span>
                    </td>
                    <td className="num font-mono whitespace-nowrap">
                      <div className="font-bold text-ink">{formatFlowRupiah(win.totalTurnoverRp)}</div>
                      <div className="text-[10px] text-muted">{formatFlowLots(win.totalLots)}</div>
                    </td>
                    <td className="num font-mono text-up whitespace-nowrap">
                      <div>{formatFlowRupiah(win.foreign?.inflowRp)}</div>
                      <div className="text-[10px] text-muted">{formatFlowLots(win.foreign?.inflowLots)}</div>
                    </td>
                    <td className="num font-mono text-down whitespace-nowrap">
                      <div>{formatFlowRupiah(win.foreign?.outflowRp)}</div>
                      <div className="text-[10px] text-muted">{formatFlowLots(win.foreign?.outflowLots)}</div>
                    </td>
                    <td className={`num font-mono font-bold whitespace-nowrap ${fNetTone.textClass}`}>
                      <div>{formatFlowRupiah(win.foreign?.netflowRp, true)}</div>
                      <div className="text-[10px]">
                        {formatFlowLots(win.foreign?.netflowLots, true)} ({win.foreign?.netflowPct > 0 ? '+' : ''}{win.foreign?.netflowPct}%)
                      </div>
                    </td>
                    <td className="num font-mono text-up whitespace-nowrap">
                      <div>{formatFlowRupiah(win.domestic?.inflowRp)}</div>
                      <div className="text-[10px] text-muted">{formatFlowLots(win.domestic?.inflowLots)}</div>
                    </td>
                    <td className="num font-mono text-down whitespace-nowrap">
                      <div>{formatFlowRupiah(win.domestic?.outflowRp)}</div>
                      <div className="text-[10px] text-muted">{formatFlowLots(win.domestic?.outflowLots)}</div>
                    </td>
                    <td className={`num font-mono font-bold whitespace-nowrap ${dNetTone.textClass}`}>
                      <div>{formatFlowRupiah(win.domestic?.netflowRp, true)}</div>
                      <div className="text-[10px]">
                        {formatFlowLots(win.domestic?.netflowLots, true)} ({win.domestic?.netflowPct > 0 ? '+' : ''}{win.domestic?.netflowPct}%)
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${domBadge.badgeClass}`}>
                        {domBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

