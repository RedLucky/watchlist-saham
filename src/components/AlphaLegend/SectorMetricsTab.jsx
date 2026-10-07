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
      <div className="card p-4 sm:p-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sunken text-ink text-xs font-bold ">
            <span>▤ Cheat-sheet Alpha Legends</span>
            <span>•</span>
            <span>35 Sektor BEI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Kompilasi Metrik Penting Per Sektor</h2>
          <p className="text-sm text-muted max-w-2xl">
            Pahami indikator kinerja keuangan khusus (Key Metrics) untuk 35 sektor industri BEI agar dapat menyaring saham berkinerja tinggi secara akurat.
          </p>
        </div>
      </div>

      {/* Search Bar & Title */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface p-4 rounded-md border border-line shadow-sm">
        <div>
          <h3 className="text-sm font-black text-ink ">Pilih Sektor Industri ({filteredSectors.length})</h3>
          <p className="text-xs text-muted ">Klik sektor untuk melihat metrik khusus & daftar sahamnya</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari dari 35 sektor (mis: Bank, Ritel, Semen)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 rounded-sm bg-sunken text-xs font-medium text-ink border border-transparent focus:border-accent focus:outline-none transition-all"
          />
          <svg className="w-4 h-4 text-muted absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between space-y-2 group ${
 isActive
 ? 'bg-accent border-accent text-on-accent font-bold'
 : 'bg-surface border-line hover:border-line-strong text-ink'
 }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{sec.icon}</span>
              </div>
              <div>
                <h4 className="text-xs font-black leading-tight break-words">{sec.name}</h4>
                <p className={`text-[9px] ${isActive ? 'text-ink' : 'text-muted'} break-words`}>{sec.category}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Sektor Terpilih & Key Metrics */}
      {activeSector && (
        <div className="p-6 rounded-md bg-surface border border-line shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="w-12 h-12 rounded-md bg-sunken flex items-center justify-center text-2xl flex-shrink-0">
              {activeSector.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-ink break-words">{activeSector.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sunken text-ink ">
                  {activeSector.category}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">Metrik Penting Yang Perlu Diketahui Investor</p>
            </div>
          </div>

          {/* 4 Cards Metrik Sektor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeSector.metrics.map((m, idx) => (
              <div key={idx} className="p-4 rounded-md bg-sunken border border-line space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent text-on-accent text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <h5 className="text-xs font-black text-ink break-words">{m.name}</h5>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Table Saham Terkait Sektor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-ink flex items-center gap-2">
                <span>Daftar Saham Sektor {activeSector.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-sunken text-xs text-muted ">
                  {matchingStocks.length} Saham
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-md border border-line ">
              <table className="w-full text-left text-xs">
                <thead className="bg-sunken text-ink font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs border-b border-line ">
                  <tr>
                    <th className="p-3 bg-sunken ">Kode / Saham</th>
                    <th className="p-3 bg-sunken ">Harga</th>
                    <th className="p-3 bg-sunken ">PER</th>
                    <th className="p-3 bg-sunken ">PBV</th>
                    <th className="p-3 bg-sunken ">ROE</th>
                    <th className="p-3 bg-sunken ">CAGR Laba</th>
                    <th className="p-3 bg-sunken ">DER</th>
                    <th className="p-3 bg-sunken ">Div Yield</th>
                    <th className="p-3 bg-sunken ">Smart Money</th>
                    <th className="p-3 text-right bg-sunken ">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-medium">
                  {matchingStocks.length > 0 ? (
                    matchingStocks.map((stock, i) => {
                      const cagrVal = stock.cagr ?? stock.profitGrowth;
                      return (
                        <tr 
                          key={i}
                          className="hover:bg-sunken transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-extrabold text-ink ">{stock.symbol}</div>
                            <div className="text-[10px] text-muted line-clamp-2">{stock.name || stock.symbol}</div>
                          </td>
                          <td className="p-3 font-semibold text-ink ">
                            Rp {(stock.price || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">{stock.per ? `${Number(stock.per).toFixed(1)}x` : '-'}</td>
                          <td className="p-3">{stock.pbv ? `${Number(stock.pbv).toFixed(1)}x` : '-'}</td>
                          <td className="p-3 text-up font-bold">{stock.roe ? `${Number(stock.roe).toFixed(1)}%` : '-'}</td>
                          <td className={`p-3 font-bold ${cagrVal >= 0 ? 'text-up ' : 'text-down '}`}>
                            {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                          </td>
                          <td className="p-3">{stock.der ? `${Number(stock.der).toFixed(1)}x` : '-'}</td>
                          <td className="p-3 text-ink ">{stock.divYield ? `${Number(stock.divYield).toFixed(1)}%` : '-'}</td>
                          <td className="p-3">
                            {stock.smartMoney ? (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
 stock.smartMoney.badge === 'emerald' ? 'bg-up-soft text-up border border-up ' :
 stock.smartMoney.badge === 'rose' ? 'bg-down-soft text-down border border-down ' :
 stock.smartMoney.badge === 'amber' ? 'bg-warn-soft text-warn border border-warn ' :
 'bg-sunken text-muted border border-line '
 }`}>
                                {stock.smartMoney.status.replace(/ [●●●○]/, '')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
 stock.growthStoryBadge === 'emerald'
 ? 'bg-up-soft text-up '
 : stock.growthStoryBadge === 'amber'
 ? 'bg-warn-soft text-warn '
 : 'bg-sunken text-ink '
 }`}>
                              {stock.growthStoryCategory || 'Potensial'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-muted">
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
