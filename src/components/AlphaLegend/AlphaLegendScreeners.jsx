'use client';

import React, { useState, useEffect } from 'react';
import SectorMetricsTab from './SectorMetricsTab';
import GrowthStoryTab from './GrowthStoryTab';
import TopInvestorsTab from './TopInvestorsTab';

export default function AlphaLegendScreeners() {
  const [subTab, setSubTab] = useState('sector-metrics'); // 'sector-metrics' | 'growth-story' | 'top-investors'
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAlphaLegendData() {
      try {
        setLoading(true);
        const res = await fetch('/api/alpha-legend', { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal memuat data screening');
        const data = await res.json();
        setStocks(data.stocks || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAlphaLegendData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Navigation Sub-Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md bg-surface border border-line shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center bg-ink text-on-accent text-xl flex-shrink-0 ">
            ★
          </div>
          <div>
            <h1 className="text-base font-extrabold text-ink leading-tight">
              Alpha Legends Screener
            </h1>
            <p className="text-xs text-muted ">Modul Komprehensif Panduan & Formula Stock Screener</p>
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-sunken rounded-md border border-line overflow-x-auto [scrollbar-width:none] w-full sm:w-auto">
          <button
            onClick={() => setSubTab('sector-metrics')}
            className={`px-3.5 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
 subTab === 'sector-metrics'
 ? 'bg-accent text-on-accent shadow-md '
 : 'text-muted hover:text-ink '
 }`}
          >
            ▤ Metrik Sektoral
          </button>
          <button
            onClick={() => setSubTab('growth-story')}
            className={`px-3.5 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
 subTab === 'growth-story'
 ? 'bg-up text-on-accent shadow-md '
 : 'text-muted hover:text-ink '
 }`}
          >
            ↑ Growth Story
          </button>
          <button
            onClick={() => setSubTab('top-investors')}
            className={`px-3.5 py-2 rounded-sm text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
 subTab === 'top-investors'
 ? 'bg-warn text-ink shadow-md font-black'
 : 'text-muted hover:text-ink '
 }`}
          >
            ★ Top Investors (10)
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="p-12 text-center rounded-md bg-surface border border-line space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-4 border-warn border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold text-muted">Mengkalkulasi Formula Alpha Legends...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-down-soft text-down text-xs font-semibold">
          ▲ Gagal memuat data: {error}
        </div>
      ) : (
        <>
          {subTab === 'sector-metrics' && <SectorMetricsTab stocks={stocks} />}
          {subTab === 'growth-story' && <GrowthStoryTab stocks={stocks} />}
          {subTab === 'top-investors' && <TopInvestorsTab stocks={stocks} />}
        </>
      )}
    </div>
  );
}
