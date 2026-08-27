'use client';

import React, { useState, useMemo } from 'react';

const TOP_INVESTORS = [
  { id: 'all', name: 'Konsensus Multitokoh (≥3)', icon: '👑', desc: 'Saham luar biasa yang lolos minimal 3 formula investor legendaris sekaligus.' },
  { id: 'buffett', name: 'Warren Buffett', icon: '📈', desc: 'Wide Moat: ROE ≥ 15%, Revenue Growth ≥ 8%, DER ≤ 1.0x, PER ≤ 20x, PBV ≤ 3.5x.' },
  { id: 'graham_defensive', name: 'Ben Graham (Defensive)', icon: '🛡️', desc: 'Graham Number (PER x PBV ≤ 22.5), PER ≤ 15x, PBV ≤ 1.5x, Dividen Rutin ≥ 5 Thn.' },
  { id: 'graham_enterprising', name: 'Ben Graham (Enterprising)', icon: '🏛️', desc: 'Deep Value: PER ≤ 10x, PBV ≤ 1.0x (Diskon Aset Bersih), DER ≤ 1.0x, ROE Positif.' },
  { id: 'lynch_fast', name: 'Peter Lynch (Fast Growers)', icon: '⚡', desc: 'Fast Growers: Revenue Growth ≥ 15%, ROE ≥ 15%, DER ≤ 1.0x, PER Wajar ≤ 28x.' },
  { id: 'lynch_stalwarts', name: 'Peter Lynch (Stalwarts)', icon: '🏢', desc: 'Blue Chip Mapan: ROE ≥ 14%, Pertumbuhan Stabil ≥ 6%, PER ≤ 16x, DER Terkendali.' },
  { id: 'lynch_slow', name: 'Peter Lynch (Slow Growers)', icon: '🐢', desc: 'Dividend Champions: Yield Dividen Tinggi ≥ 6.0%, Rekam Jejak Rutin ≥ 5 Thn, PER ≤ 15x.' },
  { id: 'greenblatt', name: 'Joel Greenblatt (Magic Formula)', icon: '🪄', desc: 'Magic Formula: ROE Tinggi ≥ 16% dikombinasikan dengan Earnings Yield Tinggi (1/PER ≥ 9%).' },
  { id: 'terry_smith', name: 'Terry Smith', icon: '🇬🇧', desc: 'Quality Compounder: Bisnis Superior dengan ROE ≥ 20%, Growth ≥ 10%, dan Utang Minimal.' },
  { id: 'ken_fisher', name: 'Ken Fisher (Superstocks)', icon: '🎣', desc: 'Superstocks: Diskon Valuasi PBV ≤ 1.2x & PER ≤ 12x dengan Pertumbuhan Revenue ≥ 10%.' },
  { id: 'nick_sleep', name: 'Nick Sleep (SES)', icon: '🛋️', desc: 'Scale Economies Shared: Efisiensi Skala Besar, ROE Tinggi ≥ 16%, Growth ≥ 12%.' },
];

export default function TopInvestorsTab({ stocks = [] }) {
  const [selectedInvestorId, setSelectedInvestorId] = useState('all');

  const activeInvestor = useMemo(() => {
    return TOP_INVESTORS.find(inv => inv.id === selectedInvestorId) || TOP_INVESTORS[0];
  }, [selectedInvestorId]);

  const filteredStocks = useMemo(() => {
    if (selectedInvestorId === 'all') {
      return stocks
        .filter(s => s.passedFormulaKeys && s.passedFormulaKeys.length >= 3)
        .sort((a, b) => (b.passedFormulaKeys?.length || 0) - (a.passedFormulaKeys?.length || 0) || (b.roe || 0) - (a.roe || 0));
    }
    return stocks
      .filter(s => s.passedFormulaKeys && s.passedFormulaKeys.includes(selectedInvestorId))
      .sort((a, b) => (b.roe || 0) - (a.roe || 0) || (a.per || 999) - (b.per || 999));
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
                {inv.id === 'all' ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-black/20 text-slate-950' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                  }`}>
                    {stocks.filter(s => s.passedFormulaKeys && s.passedFormulaKeys.length >= 3).length} Saham
                  </span>
                ) : (
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

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Saham</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Harga</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">PER</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">PBV</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">ROE</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">CAGR Laba</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">DER</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">PEG</th>
                <th className="p-3 text-right bg-slate-100 dark:bg-slate-900">Formula Lolos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock, i) => {
                  const cagrVal = stock.cagr ?? stock.profitGrowth;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">{stock.symbol}</div>
                        <div className="text-[10px] text-slate-500">{stock.name || stock.symbol}</div>
                      </td>
                      <td className="p-3 font-semibold">Rp {(stock.price || 0).toLocaleString('id-ID')}</td>
                      <td className="p-3">{stock.per ? `${stock.per.toFixed(1)}x` : '-'}</td>
                      <td className="p-3">{stock.pbv ? `${stock.pbv.toFixed(1)}x` : '-'}</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}</td>
                      <td className={`p-3 font-bold ${cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                      </td>
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
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
