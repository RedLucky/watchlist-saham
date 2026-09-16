'use client';

import React, { useState, useMemo } from 'react';
import { roundToIDXTick } from '@/lib/tradeSetup';

export default function ScenarioForecaster({ stockDetail }) {
  if (!stockDetail) return null;

  const f = stockDetail.fundamentals || {};
  const currentPrice = Number(stockDetail.price) || 0;
  const sharesOutstanding = Number(stockDetail.sharesOutstanding) || 1;
  const currentRevenue = Number(f.totalRevenue) || 0;
  const currentNpm = Number(f.npm) || (currentRevenue > 0 && f.netIncome ? (Number(f.netIncome) / currentRevenue * 100) : 12);
  const currentPayoutRatio = Number(f.payoutRatio) || 45;
  const currentCagr = Number(stockDetail.projections?.cagrPercent) || 10;
  const bondYield = Number(stockDetail.projections?.bondYield) || 6.5;

  // Interactive Slider States
  const [revenueGrowth, setRevenueGrowth] = useState(Math.round(Math.max(-20, Math.min(40, currentCagr))));
  const [npmTarget, setNpmTarget] = useState(Math.round(Math.max(2, Math.min(50, currentNpm))));
  const [payoutRatio, setPayoutRatio] = useState(Math.round(Math.max(10, Math.min(100, currentPayoutRatio))));

  // Dynamic calculations
  const projected = useMemo(() => {
    // 1. Projected Revenue
    const projRev = currentRevenue > 0
      ? currentRevenue * (1 + revenueGrowth / 100)
      : (currentPrice * sharesOutstanding * 0.4) * (1 + revenueGrowth / 100);

    // 2. Projected Net Profit
    const projProfit = projRev * (npmTarget / 100);

    // 3. Projected EPS
    const projEps = sharesOutstanding > 0 ? (projProfit / sharesOutstanding) : 0;

    // 4. Projected Fair Value Graham
    const safeG = Math.max(0, Math.min(25, revenueGrowth));
    const rawFairVal = projEps > 0 ? (projEps * (8.5 + 2 * safeG) * (4.4 / bondYield)) : 0;
    const projFairValue = roundToIDXTick(rawFairVal);

    // 5. Projected 12-Month Target Price
    const rawTarget = currentPrice * (1 + revenueGrowth / 100);
    const projTargetPrice = roundToIDXTick(rawTarget);

    // 6. Projected DPS & Yield
    const projDps = projEps * (payoutRatio / 100);
    const projYield = currentPrice > 0 ? Number(((projDps / currentPrice) * 100).toFixed(2)) : 0;

    // 7. Upside / Margin of Safety
    const upsidePct = currentPrice > 0 ? Number((((projTargetPrice - currentPrice) / currentPrice) * 100).toFixed(1)) : 0;
    const mosPct = projFairValue > 0 ? Number((((projFairValue - currentPrice) / projFairValue) * 100).toFixed(1)) : 0;

    return {
      projRev,
      projProfit,
      projEps: Math.round(projEps),
      projFairValue,
      projTargetPrice,
      projDps: Math.round(projDps),
      projYield,
      upsidePct,
      mosPct
    };
  }, [revenueGrowth, npmTarget, payoutRatio, currentRevenue, currentPrice, sharesOutstanding, bondYield]);

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Interactive What-If Scenario Forecaster (SCEN)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Bloomberg SCEN
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Simulator proyeksi: Geser parameter asumsi pertumbuhan untuk melihat dampaknya ke EPS, Fair Value Graham, dan dividen.
          </p>
        </div>

        <button
          onClick={() => {
            setRevenueGrowth(Math.round(Math.max(-20, Math.min(40, currentCagr))));
            setNpmTarget(Math.round(Math.max(2, Math.min(50, currentNpm))));
            setPayoutRatio(Math.round(Math.max(10, Math.min(100, currentPayoutRatio))));
          }}
          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          Reset Asumsi ↺
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        {/* Slider 1: Revenue Growth */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">Pertumbuhan Omset (YoY):</span>
            <span className={`font-mono px-2 py-0.5 rounded-md ${
              revenueGrowth >= 15 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
              revenueGrowth >= 0 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300' :
              'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
            }`}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth}%
            </span>
          </div>
          <input
            type="range"
            min="-20"
            max="40"
            step="1"
            value={revenueGrowth}
            onChange={(e) => setRevenueGrowth(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-20% (Krisis)</span>
            <span>+10% (Normal)</span>
            <span>+40% (Boom)</span>
          </div>
        </div>

        {/* Slider 2: Net Profit Margin (NPM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">Margin Laba Bersih (NPM):</span>
            <span className="font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
              {npmTarget}%
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="45"
            step="0.5"
            value={npmTarget}
            onChange={(e) => setNpmTarget(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>2%</span>
            <span>{currentNpm > 0 ? `${currentNpm.toFixed(1)}% (Saat ini)` : '15%'}</span>
            <span>45%</span>
          </div>
        </div>

        {/* Slider 3: Dividend Payout Ratio (DPR) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">Payout Ratio Dividen (DPR):</span>
            <span className="font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
              {payoutRatio}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            step="5"
            value={payoutRatio}
            onChange={(e) => setPayoutRatio(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10% (Minimal)</span>
            <span>50% (Moderat)</span>
            <span>95% (Maksimal)</span>
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Outputs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Proj EPS */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Proyeksi EPS
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            Rp {projected.projEps.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-500">Laba Bersih per Lembar</span>
        </div>

        {/* Proj Target Price 12M */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Harga 12M
          </span>
          <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            Rp {projected.projTargetPrice ? Number(projected.projTargetPrice).toLocaleString('id-ID') : '-'}
          </span>
          <span className={`text-[10px] font-bold ${projected.upsidePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {projected.upsidePct >= 0 ? '+' : ''}{projected.upsidePct}% dari harga kini
          </span>
        </div>

        {/* Proj Fair Value Graham */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Nilai Wajar Graham
          </span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
            Rp {projected.projFairValue ? Number(projected.projFairValue).toLocaleString('id-ID') : '-'}
          </span>
          <span className={`text-[10px] font-bold ${projected.mosPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            MoS: {projected.mosPct >= 0 ? '+' : ''}{projected.mosPct}%
          </span>
        </div>

        {/* Proj Dividend & Yield */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Estimasi Dividen (DPS)
          </span>
          <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5 block">
            Rp {projected.projDps.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
            Yield Proyeksi: ~{projected.projYield}%
          </span>
        </div>
      </div>
    </div>
  );
}
