'use client';

import React, { useState, useEffect } from 'react';
import SectorMetricsTab from './SectorMetricsTab';
import GrowthStoryTab from './GrowthStoryTab';
import TopInvestorsTab from './TopInvestorsTab';
import { PageShell, PageHeader, PageToolbar } from '../ui/PageShell';

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
    <PageShell className="animate-fade-in">
      <PageHeader
        title="Alpha Legends Screener"
        subtitle="Formula dan panduan penyaringan saham mengikuti pendekatan Buffett, Lynch, Graham, dan Greenblatt"
        badge={stocks && stocks.length ? <span className="badge badge-outline">{stocks.length} emiten</span> : null}
      />

      {/* Sticky sub-tab switcher */}
      <PageToolbar>
        <div className="tabs" role="group" aria-label="Modul Alpha Legends">
          <button
            type="button"
            onClick={() => setSubTab('sector-metrics')}
            aria-pressed={subTab === 'sector-metrics'}
            className="tab"
            >
            ▤ Metrik Sektoral
          </button>
          <button
            type="button"
            onClick={() => setSubTab('growth-story')}
            aria-pressed={subTab === 'growth-story'}
            className="tab"
            >
            ↑ Growth Story
          </button>
          <button
            type="button"
            onClick={() => setSubTab('top-investors')}
            aria-pressed={subTab === 'top-investors'}
            className="tab"
            >
            ★ Top Investors (10)
          </button>
        </div>
      </PageToolbar>

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
    </PageShell>
  );
}
