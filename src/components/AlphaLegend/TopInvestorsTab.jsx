'use client';

import React, { useState, useMemo } from 'react';

const TOP_INVESTORS = [
  { id: 'all', name: 'Semua Investor (10)', icon: '👑', desc: 'Tampilkan semua saham yang lolos minimal 1 formula investor legendaris.' },
  { id: 'buffett', name: 'Warren Buffett', icon: '📈', desc: 'Predictability 10 Thn, Long Term Debt ≤ 5x Earnings, ROE ≥ 15%, ROTC ≥ 12%, FCF > 0.' },
  { id: 'graham_enterprising', name: 'Ben Graham (Enterprising)', icon: '🏛️', desc: 'PER ≤ 9 (12), CR ≥ 1.5, Debt/NCAV ≤ 110%, Earnings Stability 5 Thn, Dividend 5 Thn.' },
  { id: 'graham_defensive', name: 'Ben Graham (Defensive)', icon: '🛡️', desc: 'Graham Number (PER x PBV ≤ 22.5), CR ≥ 2, LT Debt ≤ Net Current Asset, DER ≤ 100%.' },
  { id: 'lynch_fast', name: 'Peter Lynch (Fast Growers)', icon: '⚡', desc: 'EPS Growth ≥ 20%, PEG ≤ 1, Inventory/Sales ≤ 5ppt, DER < 80%, PER ≤ 40.' },
  { id: 'lynch_stalwarts', name: 'Peter Lynch (Stalwarts)', icon: '🏢', desc: 'EPS Growth 10%–20%, Yield-adj PEG ≤ 1, DER < 80%, Sales ≥ 1.9B.' },
  { id: 'lynch_slow', name: 'Peter Lynch (Slow Growers)', icon: '🐢', desc: 'EPS Growth < 10%, Yield-adj PEG ≤ 1, Yield ≥ 3.5%, DER < 80%.' },
  { id: 'greenblatt', name: 'Joel Greenblatt (Magic Formula)', icon: '🪄', desc: 'Kombinasi Peringkat ROC (Return on Capital) Tinggi & Earnings Yield (EY) Tinggi.' },
  { id: 'terry_smith', name: 'Terry Smith', icon: '🇬🇧', desc: 'The English Warren Buffett: ROCE ≥ 14%, OPM > 15%, Debt < 5x Net Income, TIER > 10.' },
  { id: 'ken_fisher', name: 'Ken Fisher (PSR & Superstocks)', icon: '🎣', desc: 'Price to Sales Ratio (PSR ≤ 3 / ≤ 0.8), DER ≤ 40%, PRR ≤ 15, EPS Growth ≥ 15%.' },
  { id: 'nick_sleep', name: 'Nick Sleep (SES)', icon: '🛋️', desc: 'Scale Economies Shared: Repeat Purchase, Runway Panjang, Sales Vol Naik, ROIC Tinggi.' },
];

export default function TopInvestorsTab({ stocks = [] }) {
  const [selectedInvestorId, setSelectedInvestorId] = useState('all');

  const activeInvestor = useMemo(() => {
    return TOP_INVESTORS.find(inv => inv.id === selectedInvestorId) || TOP_INVESTORS[0];
  }, [selectedInvestorId]);

  const filteredStocks = useMemo(() => {
    if (selectedInvestorId === 'all') {
      return stocks.filter(s => s.passedFormulaKeys && s.passedFormulaKeys.length > 0);
    }
    return stocks.filter(s => s.passedFormulaKeys && s.passedFormulaKeys.includes(selectedInvestorId));
  }, [selectedInvestorId, stocks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-900 via-yellow-950 to-slate-900 text-white shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
          <span>🏆 Screener By Top Investor</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">Formula Kuantitatif 10 Tokoh Investor Dunia</h2>
        <p className="text-xs sm:text-sm text-amber-100/80 max-w-2xl">
          Screening otomatis menggunakan kriteria kuantitatif ketat dari Warren Buffett, Ben Graham, Peter Lynch, Joel Greenblatt, Terry Smith, Ken Fisher, hingga Nick Sleep.
        </p>
      </div>

      {/* Grid Button Tokoh Investor */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {TOP_INVESTORS.map(inv => {
          const isActive = selectedInvestorId === inv.id;
          return (
            <button
              key={inv.id}
              onClick={() => setSelectedInvestorId(inv.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 group ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{inv.icon}</span>
                {inv.id !== 'all' && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-black/20 text-slate-950' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                  }`}>
                    {stocks.filter(s => s.passedFormulaKeys && s.passedFormulaKeys.includes(inv.id)).length} Saham
                  </span>
                )}
              </div>
              <h4 className="text-xs font-black leading-tight break-words">{inv.name}</h4>
            </button>
          );
        })}
      </div>

      {/* Info Box Investor Terpilih */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <span className="text-2xl">{activeInvestor.icon}</span>
        <div>
          <h4 className="text-sm font-extrabold">{activeInvestor.name} — Kriteria Screening</h4>
          <p className="text-xs mt-0.5 opacity-90">{activeInvestor.desc}</p>
        </div>
      </div>

      {/* Table Results */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Saham Lolos Filter ({filteredStocks.length})
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Saham</th>
                <th className="p-3">Harga</th>
                <th className="p-3">PER</th>
                <th className="p-3">PBV</th>
                <th className="p-3">ROE</th>
                <th className="p-3">DER</th>
                <th className="p-3">PEG</th>
                <th className="p-3 text-right">Formula Lolos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 dark:text-white">{stock.symbol}</div>
                      <div className="text-[10px] text-slate-500">{stock.name || stock.symbol}</div>
                    </td>
                    <td className="p-3 font-semibold">Rp {(stock.price || 0).toLocaleString('id-ID')}</td>
                    <td className="p-3">{stock.per ? `${stock.per.toFixed(1)}x` : '-'}</td>
                    <td className="p-3">{stock.pbv ? `${stock.pbv.toFixed(1)}x` : '-'}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}</td>
                    <td className="p-3">{stock.der ? `${stock.der.toFixed(1)}x` : '-'}</td>
                    <td className="p-3">{stock.peg ? `${stock.peg.toFixed(2)}` : '-'}</td>
                    <td className="p-3 text-right space-x-1 space-y-1">
                      {stock.passedFormulaKeys && stock.passedFormulaKeys.map(key => {
                        const invObj = TOP_INVESTORS.find(t => t.id === key);
                        return (
                          <span
                            key={key}
                            className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50"
                          >
                            {invObj ? invObj.name.split(' ')[0] : key}
                          </span>
                        );
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Tidak ada saham yang memenuhi kriteria filter tokoh investor ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
