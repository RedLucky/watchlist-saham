'use client';

import React, { useState, useMemo } from 'react';
import { ALPHA_LEGEND_SECTORS } from '@/data/alphaLegendSectors';

export default function SectorMetricsTab({ stocks = [] }) {
  const [selectedPart, setSelectedPart] = useState('all');
  const [activeSectorId, setActiveSectorId] = useState('bank');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sectors by search term
  const filteredSectors = useMemo(() => {
    return ALPHA_LEGEND_SECTORS.filter(sector => {
      const matchesSearch = sector.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sector.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [searchTerm]);

  // Selected sector details
  const activeSector = useMemo(() => {
    return ALPHA_LEGEND_SECTORS.find(s => s.id === activeSectorId) || ALPHA_LEGEND_SECTORS[0];
  }, [activeSectorId]);



  // Matching stocks for selected sector
  const matchingStocks = useMemo(() => {
    if (!activeSector) return stocks;
    
    // Only rely on the native subSector from the database
    return stocks.filter(stock => stock.subSector === activeSector.id);
  }, [activeSector, stocks]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-bold backdrop-blur-md">
            <span>📚 Cheat-sheet Alpha Legends</span>
            <span>•</span>
            <span>35 Sektor BEI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Kompilasi Metrik Penting Per Sektor</h2>
          <p className="text-sm text-white/80 max-w-2xl">
            Pahami indikator kinerja keuangan khusus (Key Metrics) untuk 35 sektor industri BEI agar dapat menyaring saham berkinerja tinggi secara akurat.
          </p>
        </div>
      </div>

      {/* Search Bar & Title */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Pilih Sektor Industri ({filteredSectors.length})</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Klik sektor untuk melihat metrik khusus & daftar sahamnya</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari dari 35 sektor (mis: Bank, Ritel, Semen)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 border border-transparent focus:border-blue-500 focus:outline-none transition-all"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Grid List Sektor */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
        {filteredSectors.map(sec => {
          const isActive = activeSectorId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSectorId(sec.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 group ${
                isActive
                  ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20 font-bold scale-[1.02]'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{sec.icon}</span>
              </div>
              <div>
                <h4 className="text-xs font-black leading-tight break-words">{sec.name}</h4>
                <p className={`text-[9px] ${isActive ? 'text-blue-100' : 'text-slate-400'} break-words`}>{sec.category}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Sektor Terpilih & Key Metrics */}
      {activeSector && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-2xl flex-shrink-0">
              {activeSector.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white break-words">{activeSector.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {activeSector.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Metrik Penting Yang Perlu Diketahui Investor</p>
            </div>
          </div>

          {/* 4 Cards Metrik Sektor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeSector.metrics.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white break-words">{m.name}</h5>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Table Saham Terkait Sektor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daftar Saham Sektor {activeSector.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  {matchingStocks.length} Saham
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Kode / Saham</th>
                    <th className="p-3">Harga</th>
                    <th className="p-3">PER</th>
                    <th className="p-3">PBV</th>
                    <th className="p-3">ROE</th>
                    <th className="p-3">CAGR Laba</th>
                    <th className="p-3">DER</th>
                    <th className="p-3">Div Yield</th>
                    <th className="p-3">Smart Money</th>
                    <th className="p-3 text-right">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {matchingStocks.length > 0 ? (
                    matchingStocks.map((stock, i) => {
                      const cagrVal = stock.cagr ?? stock.profitGrowth;
                      return (
                        <tr 
                          key={i}
                          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900 dark:text-white">{stock.symbol}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-2">{stock.name || stock.symbol}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            Rp {(stock.price || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">{stock.per ? `${Number(stock.per).toFixed(1)}x` : '-'}</td>
                          <td className="p-3">{stock.pbv ? `${Number(stock.pbv).toFixed(1)}x` : '-'}</td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{stock.roe ? `${Number(stock.roe).toFixed(1)}%` : '-'}</td>
                          <td className={`p-3 font-bold ${cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                          </td>
                          <td className="p-3">{stock.der ? `${Number(stock.der).toFixed(1)}x` : '-'}</td>
                          <td className="p-3 text-blue-600 dark:text-blue-400">{stock.divYield ? `${Number(stock.divYield).toFixed(1)}%` : '-'}</td>
                          <td className="p-3">
                            {stock.smartMoney ? (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                stock.smartMoney.badge === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                                stock.smartMoney.badge === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                                stock.smartMoney.badge === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}>
                                {stock.smartMoney.status.replace(/ [🟢🔴🟡⚪]/, '')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              stock.growthStoryBadge === 'emerald'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : stock.growthStoryBadge === 'amber'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {stock.growthStoryCategory || 'Potensial'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400">
                        Tidak ada data saham spesifik untuk sektor ini di database. Gunakan tombol sync untuk memperbarui.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
