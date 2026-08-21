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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white text-xl flex-shrink-0 shadow-md shadow-amber-500/20">
            👑
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Alpha Legends Screener
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Modul Komprehensif Panduan & Formula Stock Screener</p>
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto [scrollbar-width:none] w-full sm:w-auto">
          <button
            onClick={() => setSubTab('sector-metrics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              subTab === 'sector-metrics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📊 Metrik Sektoral
          </button>
          <button
            onClick={() => setSubTab('growth-story')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              subTab === 'growth-story'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🚀 Growth Story
          </button>
          <button
            onClick={() => setSubTab('top-investors')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              subTab === 'top-investors'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🏆 Top Investors (10)
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Mengkalkulasi Formula Alpha Legends...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 text-xs font-semibold">
          ⚠️ Gagal memuat data: {error}
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
