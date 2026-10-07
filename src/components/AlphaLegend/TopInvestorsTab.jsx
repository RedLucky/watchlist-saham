'use client';

import React, { useState, useMemo } from 'react';

const TOP_INVESTORS = [
  { id: 'all', name: 'Konsensus Multitokoh (≥3)', icon: '★', desc: 'Saham luar biasa yang lolos minimal 3 formula investor legendaris sekaligus.' },
  { id: 'buffett', name: 'Warren Buffett', icon: '↗', desc: 'Wide Moat: ROE ≥ 15%, Revenue Growth ≥ 8%, DER ≤ 1.0x, PER ≤ 20x, PBV ≤ 3.5x.' },
  { id: 'graham_defensive', name: 'Ben Graham (Defensive)', icon: '◇', desc: 'Graham Number (PER x PBV ≤ 22.5), PER ≤ 15x, PBV ≤ 1.5x, Dividen Rutin ≥ 5 Thn.' },
  { id: 'graham_enterprising', name: 'Ben Graham (Enterprising)', icon: '▥', desc: 'Deep Value: PER ≤ 10x, PBV ≤ 1.0x (Diskon Aset Bersih), DER ≤ 1.0x, ROE Positif.' },
  { id: 'lynch_fast', name: 'Peter Lynch (Fast Growers)', icon: '»', desc: 'Fast Growers: Revenue Growth ≥ 15%, ROE ≥ 15%, DER ≤ 1.0x, PER Wajar ≤ 28x.' },
  { id: 'lynch_stalwarts', name: 'Peter Lynch (Stalwarts)', icon: '▥', desc: 'Blue Chip Mapan: ROE ≥ 14%, Pertumbuhan Stabil ≥ 6%, PER ≤ 16x, DER Terkendali.' },
  { id: 'lynch_slow', name: 'Peter Lynch (Slow Growers)', icon: '○', desc: 'Dividend Champions: Yield Dividen Tinggi ≥ 6.0%, Rekam Jejak Rutin ≥ 5 Thn, PER ≤ 15x.' },
  { id: 'greenblatt', name: 'Joel Greenblatt (Magic Formula)', icon: '✦', desc: 'Magic Formula: ROE Tinggi ≥ 16% dikombinasikan dengan Earnings Yield Tinggi (1/PER ≥ 9%).' },
  { id: 'terry_smith', name: 'Terry Smith', icon: '▣', desc: 'Quality Compounder: Bisnis Superior dengan ROE ≥ 20%, Growth ≥ 10%, dan Utang Minimal.' },
  { id: 'ken_fisher', name: 'Ken Fisher (Superstocks)', icon: '⌇', desc: 'Superstocks: Diskon Valuasi PBV ≤ 1.2x & PER ≤ 12x dengan Pertumbuhan Revenue ≥ 10%.' },
  { id: 'nick_sleep', name: 'Nick Sleep (SES)', icon: '▤', desc: 'Scale Economies Shared: Efisiensi Skala Besar, ROE Tinggi ≥ 16%, Growth ≥ 12%.' },
];

export default function TopInvestorsTab({ stocks = [] }) {
  const [selectedInvestorId, setSelectedInvestorId] = useState('all');

  const activeInvestor = useMemo(() => {
    return TOP_INVESTORS.find(inv => inv.id === selectedInvestorId) || TOP_INVESTORS[0];
  }, [selectedInvestorId]);

  const filteredStocks = useMemo(() => {
    if (selectedInvestorId === 'all') {
      return [...stocks]
        .filter(s => (s.passedFormulaKeys && s.passedFormulaKeys.length >= 2) || (s.maxMatchScore && s.maxMatchScore >= 70))
        .sort((a, b) => (b.maxMatchScore || 0) - (a.maxMatchScore || 0) || (b.passedFormulaKeys?.length || 0) - (a.passedFormulaKeys?.length || 0));
    }
    return [...stocks]
      .filter(s => (s.evaluationDetails?.[selectedInvestorId]?.matchScore || 0) >= 50 || (s.passedFormulaKeys && s.passedFormulaKeys.includes(selectedInvestorId)))
      .sort((a, b) => (b.evaluationDetails?.[selectedInvestorId]?.matchScore || 0) - (a.evaluationDetails?.[selectedInvestorId]?.matchScore || 0));
  }, [selectedInvestorId, stocks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card p-4 sm:p-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warn-soft text-warn text-xs font-bold border border-warn">
          <span>★ Screener By Top Investor</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">Formula Kuantitatif 10 Tokoh Investor Dunia</h2>
        <p className="text-xs sm:text-sm text-warn max-w-2xl">
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
              className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between space-y-2 group ${
 isActive
 ? ' text-ink border-warn font-extrabold shadow-md scale-[1.02]'
 : 'bg-surface border-line hover:border-warn text-ink '
 }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{inv.icon}</span>
                {inv.id === 'all' ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
 isActive ? 'bg-black/20 text-ink' : 'bg-sunken text-muted'
 }`}>
                    {stocks.filter(s => s.passedFormulaKeys && s.passedFormulaKeys.length >= 3).length} Saham
                  </span>
                ) : (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
 isActive ? 'bg-black/20 text-ink' : 'bg-sunken text-muted'
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
      <div className="p-4 rounded-md bg-warn-soft border border-warn text-warn flex items-start gap-3">
        <span className="text-2xl">{activeInvestor.icon}</span>
        <div>
          <h4 className="text-sm font-extrabold">{activeInvestor.name} — Kriteria Screening</h4>
          <p className="text-xs mt-0.5 opacity-90">{activeInvestor.desc}</p>
        </div>
      </div>

      {/* Table Results */}
      <div className="p-6 rounded-md bg-surface border border-line shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-ink ">
            Saham Lolos Filter ({filteredStocks.length})
          </h3>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-md border border-line ">
          <table className="w-full text-left text-xs">
            <thead className="bg-sunken text-ink font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs border-b border-line ">
              <tr>
                <th className="p-3 bg-sunken ">Saham</th>
                <th className="p-3 bg-sunken text-center">Match Score</th>
                <th className="p-3 bg-sunken ">Harga</th>
                <th className="p-3 bg-sunken ">PER</th>
                <th className="p-3 bg-sunken ">PBV</th>
                <th className="p-3 bg-sunken ">ROE</th>
                <th className="p-3 bg-sunken ">CAGR Laba</th>
                <th className="p-3 bg-sunken ">DER</th>
                <th className="p-3 bg-sunken ">PEG</th>
                <th className="p-3 text-right bg-sunken ">Formula Lolos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock, i) => {
                  const cagrVal = stock.cagr ?? stock.profitGrowth;
                  const matchScore = selectedInvestorId === 'all'
                    ? (stock.maxMatchScore || 0)
                    : (stock.evaluationDetails?.[selectedInvestorId]?.matchScore || 0);

                  return (
                    <tr key={i} className="hover:bg-sunken transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-ink ">{stock.symbol}</div>
                        <div className="text-[10px] text-muted">{stock.name || stock.symbol}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
 matchScore >= 85
 ? 'bg-up-soft text-up border border-up '
 : matchScore >= 75
 ? 'bg-sunken text-ink border border-line '
 : matchScore >= 60
 ? 'bg-warn-soft text-warn border border-warn '
 : 'bg-sunken text-ink '
 }`}>
                            {matchScore}%
                          </span>
                          {selectedInvestorId === 'all' && stock.bestLegend && (
                            <span className="text-[9px] text-muted mt-0.5 line-clamp-1">{stock.bestLegend.split(' ')[0]}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold">Rp {(stock.price || 0).toLocaleString('id-ID')}</td>
                      <td className="p-3">{stock.per ? `${stock.per.toFixed(1)}x` : '-'}</td>
                      <td className="p-3">{stock.pbv ? `${stock.pbv.toFixed(1)}x` : '-'}</td>
                      <td className="p-3 text-up font-bold">{stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}</td>
                      <td className={`p-3 font-bold ${cagrVal >= 0 ? 'text-up ' : 'text-down '}`}>
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
                              className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-warn-soft text-warn border border-warn "
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
                  <td colSpan="9" className="p-8 text-center text-muted">
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
