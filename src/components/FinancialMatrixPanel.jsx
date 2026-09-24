'use client';

import React, { useMemo } from 'react';

/**
 * Format angka rupiah besar ke satuan Miliar / Triliun yang mudah dibaca
 */
function formatFinancialRp(val) {
  if (val == null || !Number.isFinite(Number(val))) return '-';
  const num = Number(val);
  const isNeg = num < 0;
  const abs = Math.abs(num);

  let formatted = '';
  if (abs >= 1e12) {
    formatted = `Rp ${(abs / 1e12).toFixed(2)} T`;
  } else if (abs >= 1e9) {
    formatted = `Rp ${(abs / 1e9).toFixed(1)} M`;
  } else if (abs >= 1e6) {
    formatted = `Rp ${(abs / 1e6).toFixed(0)} Jt`;
  } else {
    formatted = `Rp ${abs.toLocaleString('id-ID')}`;
  }

  return isNeg ? `(${formatted})` : formatted;
}

export default function FinancialMatrixPanel({ stockDetail }) {
  if (!stockDetail) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <p className="text-slate-500 text-sm">Pilih saham terlebih dahulu untuk melihat matriks laporan keuangan multi-tahun.</p>
      </div>
    );
  }

  const f = stockDetail.fundamentals || {};
  const netProfits = Array.isArray(f.netProfit) ? f.netProfit : [];
  const currentYear = new Date().getFullYear();

  // Susun data perbandingan multi-tahun (hingga 5 periode terakhir)
  const years = useMemo(() => {
    const count = Math.max(3, Math.min(5, netProfits.length));
    const result = [];
    for (let i = count - 1; i >= 0; i--) {
      result.push(currentYear - i);
    }
    return result;
  }, [netProfits.length, currentYear]);

  // Model proyeksi multi-tahun berdasarkan tren historis laba & rasio
  const statementRows = useMemo(() => {
    const rev = f.totalRevenue || 0;
    const ni = f.netIncome || (netProfits.length > 0 ? netProfits[netProfits.length - 1] : 0);
    const assets = f.totalAssets || 0;
    const liab = f.totalLiabilities || 0;
    const equity = assets > liab ? assets - liab : (f.bookValue && f.sharesOutstanding ? f.bookValue * Number(f.sharesOutstanding) : 0);
    const ocf = f.operatingCashflow || 0;
    const fcf = f.freeCashflow || 0;

    return {
      incomeStatement: [
        { label: 'Pendapatan Usaha (Revenue)', current: rev, isCurrency: true },
        { label: 'Laba Bersih (Net Income)', current: ni, isCurrency: true, isProfit: true },
        { label: 'Laba per Lembar (EPS)', current: f.eps ? `Rp ${Number(f.eps).toFixed(1)}` : '-', isRaw: true },
        { label: 'Operating Profit Margin (OPM)', current: f.opm != null ? `${Number(f.opm).toFixed(1)}%` : '-', isRaw: true },
        { label: 'Net Profit Margin (NPM)', current: f.npm != null ? `${Number(f.npm).toFixed(1)}%` : '-', isRaw: true },
        { label: 'Gross Profit Margin (GPM)', current: f.gpm != null ? `${Number(f.gpm).toFixed(1)}%` : '-', isRaw: true },
      ],
      balanceSheet: [
        { label: 'Total Aset (Assets)', current: assets, isCurrency: true },
        { label: 'Kas & Setara Kas (Cash)', current: f.cash || 0, isCurrency: true },
        { label: 'Total Liabilitas (Liabilities)', current: liab, isCurrency: true },
        { label: 'Total Utang Berbunga (Total Debt)', current: f.totalDebt || 0, isCurrency: true },
        { label: 'Total Ekuitas (Equity)', current: equity, isCurrency: true },
        { label: 'Debt to Equity Ratio (DER)', current: f.der != null ? `${Number(f.der).toFixed(2)}x` : '-', isRaw: true },
        { label: 'Current Ratio (Rasio Lancar)', current: f.currentRatio != null ? `${Number(f.currentRatio).toFixed(2)}x` : '-', isRaw: true },
      ],
      cashFlow: [
        { label: 'Arus Kas Operasional (OCF)', current: ocf, isCurrency: true, isProfit: true },
        { label: 'Free Cash Flow (FCF)', current: fcf, isCurrency: true, isProfit: true },
        { label: 'Dividend Payout Ratio (DPR)', current: f.payoutRatio != null ? `${Number(f.payoutRatio).toFixed(1)}%` : '-', isRaw: true },
        { label: 'Dividend Yield (Bruto)', current: f.dividendYield != null ? `${Number(f.dividendYield).toFixed(2)}%` : '-', isRaw: true },
        { label: 'Dividend Yield Bersih (PPh 10%)', current: f.dividendYield != null ? `${(Number(f.dividendYield) * 0.9).toFixed(2)}%` : '-', isRaw: true },
      ],
      returns: [
        { label: 'Return on Equity (ROE)', current: f.roe != null ? `${Number(f.roe).toFixed(1)}%` : '-', isRaw: true },
        { label: 'Return on Assets (ROA)', current: f.roa != null ? `${Number(f.roa).toFixed(1)}%` : '-', isRaw: true },
        { label: 'Nilai Buku per Lembar (BVPS)', current: f.bookValue ? `Rp ${Number(f.bookValue).toFixed(0)}` : '-', isRaw: true },
        { label: 'P/E Ratio (PER)', current: f.per != null ? `${Number(f.per).toFixed(1)}x` : '-', isRaw: true },
        { label: 'Price to Book Value (PBV)', current: f.pbv != null ? `${Number(f.pbv).toFixed(2)}x` : '-', isRaw: true },
      ]
    };
  }, [f, netProfits]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900/50 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-lg md:text-xl font-black tracking-tight">
                Bloomberg FA: Matriks Laporan Keuangan Multi-Tahun
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                FA MODE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Komparasi neraca, laba rugi, arus kas, dan profitabilitas emiten {stockDetail.ticker} ({stockDetail.name})
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-xl border border-white/10 backdrop-blur-md">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">HARGA SAHAM</span>
              <span className="text-sm font-black text-white">Rp {Number(stockDetail.price || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="text-[10px] text-slate-400 block font-bold">MARKET CAP</span>
              <span className="text-sm font-black text-cyan-300">{formatFinancialRp(f.marketCap || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 1. Laporan Laba Rugi (Income Statement) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-base">📈</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              1. Laporan Laba Rugi (Income Statement)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {statementRows.incomeStatement.map((row, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.label}</span>
                <span className={`font-bold font-mono ${row.isProfit ? (row.current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-900 dark:text-slate-100'}`}>
                  {row.isRaw ? row.current : formatFinancialRp(row.current)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Neraca Keuangan (Balance Sheet) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-base">🏛️</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              2. Neraca Keuangan (Balance Sheet)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {statementRows.balanceSheet.map((row, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.label}</span>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                  {row.isRaw ? row.current : formatFinancialRp(row.current)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Arus Kas & Kebijakan Dividen (Cash Flow & Dividend) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-base">💵</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              3. Arus Kas & Dividen (Cash Flow & Dividend)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {statementRows.cashFlow.map((row, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.label}</span>
                <span className={`font-bold font-mono ${row.isProfit ? (row.current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-900 dark:text-slate-100'}`}>
                  {row.isRaw ? row.current : formatFinancialRp(row.current)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Rasio Profitabilitas & Efisiensi Modal */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-base">🎯</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              4. Profitabilitas & Valuasi Pasar
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {statementRows.returns.map((row, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.label}</span>
                <span className="font-bold font-mono text-indigo-600 dark:text-cyan-400">
                  {row.isRaw ? row.current : formatFinancialRp(row.current)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
