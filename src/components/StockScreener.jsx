'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import ScoreBadge from './ScoreBadge';
import StockOwnershipModal from './StockOwnershipModal';

export default function StockScreener() {
  const [activeTab, setActiveTab] = useState('pick');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedOwnershipStock, setSelectedOwnershipStock] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [syariahOnly, setSyariahOnly] = useState(false);
  const [dividendStreakOnly, setDividendStreakOnly] = useState(false);
  const [highScoreOnly, setHighScoreOnly] = useState(false);
  const [copiedTicker, setCopiedTicker] = useState(null);

  const tabs = [
    { 
      id: 'pick', 
      icon: '🎯',
      label: 'Pick This', 
      tag: 'Multi-Kriteria',
      desc: 'Saham unggulan pilihan utama yang lolos di banyak kriteria sekaligus (Passive, Dividen, Murah & Valuasi Bagus)' 
    },
    { 
      id: 'passive', 
      icon: '🏖️',
      label: 'Top 10 Passive Income', 
      tag: '5-Th Dividen',
      desc: '10 Saham dividen dengan fundamental terkuat & riwayat konsisten 5 tahun untuk penghasilan pasif stabil' 
    },
    { 
      id: 'dividend', 
      icon: '💰',
      label: 'High Dividend Yield', 
      tag: 'Cash Yield',
      desc: 'Saham dengan imbal hasil dividen kas tertinggi dari harga penutupan pasar terkini' 
    },
    { 
      id: 'cheap', 
      icon: '🏷️',
      label: 'Murah & Wajar', 
      tag: 'Deep Value',
      desc: 'Saham undervalued di bawah rata-rata sektor dengan margin of safety sehat (PER & PBV diskon)' 
    },
    { 
      id: 'quality', 
      icon: '⭐',
      label: 'Valuasi Bagus', 
      tag: 'High ROE',
      desc: 'Perusahaan dengan profitabilitas tinggi (ROE & OPM unggul), neraca sehat, di harga wajar' 
    },
    { 
      id: 'potential', 
      icon: '🚀',
      label: 'Saham Berpotensi', 
      tag: 'Momentum',
      desc: 'Kombinasi sinyal teknikal bullish, lonjakan volume, dan akumulasi smart money' 
    },
  ];

  useEffect(() => {
    async function fetchScreenerData() {
      setLoading(true);
      setError(null);
      setSortConfig({ key: null, direction: 'desc' });
      try {
        const res = await fetch(`/api/screener?type=${activeTab}&_t=${Date.now()}`);
        if (!res.ok) throw new Error('Gagal mengambil data screener');
        const json = await res.json();
        setData(json.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchScreenerData();
  }, [activeTab]);

  const toggleRow = (ticker) => {
    setExpandedRow(expandedRow === ticker ? null : ticker);
  };

  const handleCopyTicker = (ticker, e) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(ticker);
    setCopiedTicker(ticker);
    setTimeout(() => setCopiedTicker(null), 1800);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const getValue = (item, key) => {
    if (!key) return 0;
    switch (key) {
      case 'price': return Number(item.price ?? 0);
      case 'dividendYield': return Number(item.metrics?.dividendYield ?? 0);
      case 'payoutRatio': return Number(item.metrics?.payoutRatio ?? 0);
      case 'roe': return Number(item.metrics?.roe ?? item.fundamentals?.roe ?? 0);
      case 'opm': return Number(item.metrics?.opm ?? item.fundamentals?.opm ?? 0);
      case 'eps': return Number(item.metrics?.eps ?? item.fundamentals?.eps ?? 0);
      case 'der': return Number(item.metrics?.der ?? item.fundamentals?.der ?? 0);
      case 'cagr': return Number(item.metrics?.cagr ?? 0);
      case 'per': return Number(item.metrics?.per ?? item.fundamentals?.per ?? 0);
      case 'pbv': return Number(item.metrics?.pbv ?? item.fundamentals?.pbv ?? 0);
      case 'score': return Number(item.score ?? 0);
      case 'changePercent': return Number(item.changePercent ?? 0);
      case 'volume': return Number(item.volume ?? 0);
      case 'matchCount': return Number(item.matchCount ?? 0);
      default: return 0;
    }
  };

  // Distinct list of sectors for filter dropdown
  const availableSectors = useMemo(() => {
    const set = new Set();
    data.forEach(item => {
      if (item.sector) set.add(item.sector);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered & Sorted Dataset
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search query filter (ticker or company name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.ticker?.toLowerCase().includes(q) || 
        item.name?.toLowerCase().includes(q) ||
        item.sector?.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== 'ALL') {
      result = result.filter(item => item.sector === selectedSector);
    }

    // Quick filters
    if (syariahOnly) {
      result = result.filter(item => Boolean(item.isSyariah));
    }
    if (dividendStreakOnly) {
      result = result.filter(item => (item.metrics?.streakYears || 0) >= 3);
    }
    if (highScoreOnly) {
      result = result.filter(item => (item.score || 0) >= 75);
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = getValue(a, sortConfig.key);
        const valB = getValue(b, sortConfig.key);
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, selectedSector, syariahOnly, dividendStreakOnly, highScoreOnly, sortConfig]);

  // Dynamic KPI Intelligence Metrics
  const kpiStats = useMemo(() => {
    if (filteredAndSortedData.length === 0) {
      return { avgYield: 0, medianPER: 0, avgCAGR: 0, syariahPercent: 0, totalMCap: 0 };
    }

    const yields = filteredAndSortedData.map(d => Number(d.metrics?.dividendYield ?? 0)).filter(y => y > 0);
    const avgYield = yields.length > 0 ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) : '0.0';

    const pers = filteredAndSortedData.map(d => Number(d.metrics?.per ?? d.fundamentals?.per ?? 0)).filter(p => p > 0).sort((a, b) => a - b);
    const medianPER = pers.length > 0 ? pers[Math.floor(pers.length / 2)].toFixed(1) : '0.0';

    const cagrs = filteredAndSortedData.map(d => Number(d.metrics?.cagr ?? 0)).filter(c => Number.isFinite(c));
    const avgCAGR = cagrs.length > 0 ? (cagrs.reduce((a, b) => a + b, 0) / cagrs.length).toFixed(1) : '0.0';

    const syariahCount = filteredAndSortedData.filter(d => d.isSyariah).length;
    const syariahPercent = Math.round((syariahCount / filteredAndSortedData.length) * 100);

    const totalMCap = filteredAndSortedData.reduce((acc, d) => acc + Number(d.fundamentals?.marketCap || 0), 0);
    const mCapTrillion = (totalMCap / 1_000_000_000_000).toFixed(1);

    return { avgYield, medianPER, avgCAGR, syariahPercent, mCapTrillion, count: filteredAndSortedData.length };
  }, [filteredAndSortedData]);

  // Helper formatting for Valuation multiples pills
  const getPERBadge = (per) => {
    if (per == null || per <= 0) return <span className="text-slate-400 font-mono text-[11px]">-</span>;
    const val = Number(per);
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (val < 10) {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
    } else if (val <= 18) {
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
    } else {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
    }

    return (
      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black border ${colorClass}`}>
        {val.toFixed(1)}x
      </span>
    );
  };

  const getPBVBadge = (pbv) => {
    if (pbv == null || pbv <= 0) return <span className="text-slate-400 font-mono text-[11px]">-</span>;
    const val = Number(pbv);
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (val < 1.0) {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
    } else if (val <= 2.5) {
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60';
    } else {
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
    }

    return (
      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black border ${colorClass}`}>
        {val.toFixed(2)}x
      </span>
    );
  };

  const renderSortHeader = (label, sortKey, align = 'right', extraClass = '') => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        onClick={() => handleSort(sortKey)}
        className={`px-4 py-3.5 text-${align} text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors select-none ${extraClass}`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] transition-transform ${
            isActive 
              ? 'bg-indigo-600 text-white font-black scale-110 shadow-xs' 
              : 'text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/50'
          }`}>
            {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const renderTableHeaders = () => {
    switch (activeTab) {
      case 'pick':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('Div Yield', 'dividendYield', 'right')}
            {renderSortHeader('CAGR Laba', 'cagr', 'right')}
            {renderSortHeader('Valuasi (PER / PBV)', 'per', 'right')}
            {renderSortHeader('Kriteria Lolos', 'matchCount', 'center')}
            {renderSortHeader('Skor Pick', 'score', 'center')}
          </>
        );
      case 'passive':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('Div Yield', 'dividendYield', 'right')}
            {renderSortHeader('CAGR Laba', 'cagr', 'right')}
            {renderSortHeader('Profitabilitas (ROE / OPM)', 'roe', 'right', 'hidden sm:table-cell')}
            {renderSortHeader('Skor (Div | Fund)', 'score', 'center')}
          </>
        );
      case 'dividend':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('Yield Kas', 'dividendYield', 'right')}
            {renderSortHeader('CAGR Laba', 'cagr', 'right')}
            {renderSortHeader('Payout Ratio', 'payoutRatio', 'right', 'hidden sm:table-cell')}
            {renderSortHeader('Skor Dividen', 'score', 'center')}
          </>
        );
      case 'cheap':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('PER vs Sektor', 'per', 'right')}
            {renderSortHeader('PBV & OPM', 'pbv', 'right', 'hidden sm:table-cell')}
            {renderSortHeader('CAGR Laba', 'cagr', 'right')}
            {renderSortHeader('Skor Valuasi', 'score', 'center')}
          </>
        );
      case 'quality':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('Valuasi (PER / PBV)', 'per', 'right')}
            {renderSortHeader('Profit (ROE / OPM)', 'roe', 'right', 'hidden sm:table-cell')}
            {renderSortHeader('CAGR Laba', 'cagr', 'right')}
            {renderSortHeader('Skor Kualitas', 'score', 'center')}
          </>
        );
      case 'potential':
        return (
          <>
            {renderSortHeader('Harga', 'price', 'right')}
            {renderSortHeader('Perubahan', 'changePercent', 'right')}
            {renderSortHeader('Volume Perdagangan', 'volume', 'right', 'hidden sm:table-cell')}
            {renderSortHeader('Skor (Tek | SM | Tren)', 'score', 'center')}
          </>
        );
      default:
        return null;
    }
  };

  const renderRowCells = (item) => {
    const safeChangePercent = Number.isFinite(item.changePercent) ? item.changePercent : 0;
    const cagrVal = item.metrics?.cagr;
    
    switch (activeTab) {
      case 'pick':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span>📈</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
              cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                <span title="Price to Earnings Ratio">{getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}</span>
                <span title="Price to Book Value">{getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}</span>
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-center">
              <div className="flex flex-wrap justify-center gap-1 max-w-[190px] mx-auto">
                {item.matchedScreeners?.map((screener, idx) => (
                  <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-extrabold">
                    {screener}
                  </span>
                )) || <span className="text-xs text-slate-400">-</span>}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <span className="text-[9px] text-amber-700 dark:text-amber-400 font-black mt-1">
                  ⭐ {item.matchCount}/4 Kriteria
                </span>
              </div>
            </td>
          </>
        );
      case 'passive':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span>📈</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
              cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
              <div className="flex items-center justify-end gap-1.5">
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                </span>
                {item.metrics?.opm != null && (
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                    OPM: {Number(item.metrics.opm).toFixed(1)}%
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono">
                  <span>Div: <strong className="text-emerald-600 dark:text-emerald-400">{item.divScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>Fund: <strong className="text-blue-600 dark:text-blue-400">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'dividend':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span>💰</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
              cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
              {item.metrics?.payoutRatio != null ? (
                <span className={`px-2 py-0.5 rounded-md text-[11px] border ${
                  item.metrics.payoutRatio <= 70 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50' 
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50'
                }`}>
                  DPR: {Number(item.metrics.payoutRatio).toFixed(0)}%
                </span>
              ) : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex justify-center items-center">
                <ScoreBadge score={item.score} size="sm" />
              </div>
            </td>
          </>
        );
      case 'cheap':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-1.5">
                {getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}
                {item.metrics?.sectorAvgPER != null && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Skt: {Number(item.metrics.sectorAvgPER).toFixed(1)}x)
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
              <div className="flex items-center justify-end gap-1.5">
                {getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}
                {item.metrics?.opm != null && (
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    OPM: {Number(item.metrics.opm).toFixed(1)}%
                  </span>
                )}
              </div>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
              cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex justify-center items-center">
                <ScoreBadge score={item.score} size="sm" />
              </div>
            </td>
          </>
        );
      case 'quality':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-1">
                {getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}
                {getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
              <div className="flex items-center justify-end gap-1.5">
                <span className="px-2 py-0.5 rounded font-mono text-[11px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                  ROE {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  DER {item.metrics?.der != null ? `${Number(item.metrics.der).toFixed(2)}x` : '-'}
                </span>
              </div>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
              cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1.5 mt-1 text-[10px] text-slate-500 font-mono font-bold">
                  <span>Val: <strong className="text-emerald-600 dark:text-emerald-400">{item.valScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>Fund: <strong className="text-blue-600 dark:text-blue-400">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'potential':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-black border ${
                safeChangePercent > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60' 
                  : safeChangePercent < 0 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(2)}%
              </span>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
              {item.volume ? (Number(item.volume) / 10000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' Lot' : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1 mt-1 text-[9px] text-slate-500 font-mono font-bold">
                  <span>Tek: <strong className="text-indigo-600 dark:text-indigo-400">{item.techScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>SM: <strong className="text-amber-600 dark:text-amber-400">{item.smScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      default:
        return null;
    }
  };

  // Executive 3-Card Deep Dive Drawer
  const renderItemDetails = (item) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Card 1: Fundamental & Proyeksi Valuasi */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📊</span> Fundamental & Valuasi
            </h4>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
              Audit Keuangan
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">ROE (Ekuitas)</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">OPM (Operasional)</span>
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">
                {item.metrics?.opm != null ? `${Number(item.metrics.opm).toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">DER (Rasio Utang)</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                {item.metrics?.der != null ? `${Number(item.metrics.der).toFixed(2)}x` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">EPS Terkini</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                {item.metrics?.eps != null ? `Rp ${Number(item.metrics.eps).toLocaleString('id-ID')}` : '-'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
              Alasan Evaluasi Algoritma:
            </span>
            <ul className="space-y-1.5">
              {item.details?.map((detail, i) => (
                <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-tight">{detail}</span>
                </li>
              )) || (
                <li className="text-[11px] text-slate-400 italic">Data poin fundamental tidak tersedia</li>
              )}
            </ul>
          </div>
        </div>

        {/* Card 2: Smart Money & KSEI Multi-Month Flow */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> Smart Money & KSEI
            </h4>
            <button
              onClick={() => setSelectedOwnershipStock(item)}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Struktur KSEI ↗
            </button>
          </div>

          {/* Volume Spike & Bandarmologi status */}
          {item.smartMoney && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Lonjakan Volume</span>
                <span className={`text-xs font-mono font-black ${
                  item.smartMoney.turnoverSpikeRatio > 1.5 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {(item.smartMoney.turnoverSpikeRatio * 100).toFixed(0)}% vs Rata-rata
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Status Bandar</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block mt-0.5 ${
                  item.smartMoney.badge === 'emerald' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                  item.smartMoney.badge === 'rose' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' :
                  item.smartMoney.badge === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {item.smartMoney.status}
                </span>
              </div>
            </div>
          )}

          {/* KSEI Multi-Month Carousel */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
              Arus Ritel vs Asing (KSEI Bulanan):
            </span>
            {(() => {
              let history = item.kseiHistory;
              if (typeof history === 'string') {
                try { history = JSON.parse(history); } catch (e) { history = []; }
              }
              if (Array.isArray(history) && history.length > 0) {
                return (
                  <div className="flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none]">
                    {[...history].reverse().slice(0, 5).map((sh, idx) => {
                      const deltaRetail = sh.deltaRetail || 0;
                      const deltaForeign = sh.deltaForeign || 0;
                      return (
                        <div key={idx} className={`p-2 min-w-[105px] rounded-xl border shrink-0 transition-all ${
                          idx === 0 
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60' 
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50'
                        }`}>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{sh.date}</div>
                          <div className="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                            Rtl: {sh.retailPercent?.toFixed(1) ?? '0.0'}%
                          </div>
                          <div className={`text-[10px] font-mono font-bold flex items-center gap-0.5 mt-0.5 ${
                            deltaRetail > 0 ? 'text-emerald-600 dark:text-emerald-400' : deltaRetail < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                          }`}>
                            {deltaRetail > 0 ? `📈 +${Math.abs(deltaRetail).toLocaleString('id-ID')}` :
                             deltaRetail < 0 ? `📉 -${Math.abs(deltaRetail).toLocaleString('id-ID')}` : '0'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return <div className="text-[11px] text-slate-400 italic">Data histori bulanan KSEI belum tercatat.</div>;
            })()}
          </div>
        </div>

        {/* Card 3: Top Shareholders & Insider Trades */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🏢</span> Pemegang Saham & Insider
            </h4>
            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
              BEI Verified ⚡
            </span>
          </div>

          {/* Top 2 Shareholders */}
          {item.ownership?.shareholders?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Top Shareholders ({'>'}5%):
              </span>
              {item.ownership.shareholders.filter(s => s.Kategori === 'Lebih dari 5%').slice(0, 2).map((sh, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={sh.Nama}>
                    {sh.Nama}
                  </span>
                  <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white shrink-0">
                    {sh.Persentase}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Insider Trades Snippet */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
              Transaksi Terkini Direksi / Komisaris:
            </span>
            {(() => {
              const trades = Array.isArray(item.insiderTrades) ? item.insiderTrades.slice(0, 2) : [];
              if (trades.length === 0) {
                return <div className="text-[11px] text-slate-400 italic">Belum ada catatan transaksi insider terkini.</div>;
              }

              return (
                <div className="space-y-1.5">
                  {trades.map((t, idx) => {
                    const isBuy = (t.action || t.type) === 'BUY';
                    const lots = Math.round((t.shares || t.volume || 0) / 100);
                    return (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">
                            {t.name || t.insiderName || 'Direksi'}
                          </div>
                          <span className={`text-[9px] font-black uppercase ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isBuy ? '🟢 Beli' : '🔴 Jual'} {lots > 0 ? `${lots.toLocaleString('id-ID')} Lot` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          Rp {(t.price || item.price || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <button
              onClick={(e) => handleCopyTicker(item.ticker, e)}
              className="text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <span>{copiedTicker === item.ticker ? '✅ Tersalin!' : '📋 Salin Kode'}</span>
            </button>
            <button
              onClick={() => setSelectedOwnershipStock(item)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
            >
              Audit Kepemilikan ↗
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 1. HERO CATEGORY SELECTOR ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setExpandedRow(null);
              }}
              className={`p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between relative overflow-hidden group ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white border-transparent shadow-lg shadow-indigo-500/25 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-indigo-400/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{tab.icon}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.tag}
                  </span>
                </div>
                <h3 className={`text-xs sm:text-sm font-black tracking-tight leading-snug ${
                  isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}>
                  {tab.label}
                </h3>
              </div>
              <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px]">
                <span className={`font-semibold ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {isActive ? 'Aktif' : 'Pilih Tab'}
                </span>
                <span className={`font-bold ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 2. EXECUTIVE KPI INTELLIGENCE BAR ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Avg Dividend Yield */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Rata-Rata Div Yield
            </span>
            <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {kpiStats.avgYield}%
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Koleksi Screener Aktif
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-lg">
            💰
          </div>
        </div>

        {/* KPI 2: Median PER */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Median PER Saham
            </span>
            <div className="text-xl font-mono font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {kpiStats.medianPER}x
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Level Valuasi Tengah
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-lg">
            🏷️
          </div>
        </div>

        {/* KPI 3: Avg Profit Growth (CAGR) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Rata-Rata CAGR Laba
            </span>
            <div className={`text-xl font-mono font-black mt-0.5 ${
              Number(kpiStats.avgCAGR) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {Number(kpiStats.avgCAGR) >= 0 ? '+' : ''}{kpiStats.avgCAGR}%
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Pertumbuhan Compound
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-lg">
            📈
          </div>
        </div>

        {/* KPI 4: Syariah & Market Cap */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Rasio Syariah & MCap
            </span>
            <div className="text-xl font-mono font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {kpiStats.syariahPercent}%
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Total MCap: Rp {kpiStats.mCapTrillion}T
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-lg">
            🌙
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH, SECTOR & CONTROLS TOOLBAR ─────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode saham (BBCA), nama perusahaan, atau sektor..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sector Selector & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Sektor ({data.length})</option>
              {availableSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Finansial"
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📋</span> Tabel
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Tampilan Grid Kartu Visual"
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🗂️</span> Kartu
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pt-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1">
            Filter Cepat:
          </span>
          <button
            onClick={() => setSyariahOnly(!syariahOnly)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border shrink-0 cursor-pointer flex items-center gap-1 ${
              syariahOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🌙</span> Hanya Syariah
          </button>
          <button
            onClick={() => setDividendStreakOnly(!dividendStreakOnly)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border shrink-0 cursor-pointer flex items-center gap-1 ${
              dividendStreakOnly
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🏆</span> Rutin Dividen ≥3th
          </button>
          <button
            onClick={() => setHighScoreOnly(!highScoreOnly)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border shrink-0 cursor-pointer flex items-center gap-1 ${
              highScoreOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>⭐</span> Skor Tinggi (≥75)
          </button>

          {(searchQuery || selectedSector !== 'ALL' || syariahOnly || dividendStreakOnly || highScoreOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSector('ALL');
                setSyariahOnly(false);
                setDividendStreakOnly(false);
                setHighScoreOnly(false);
              }}
              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 ml-auto cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* ── 4. DATA PRESENTATION (GRID CARDS OR DENSE TABLE) ────────────────── */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center text-xl animate-spin">
            ⏳
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Mengolah & Menyaring Data Saham IDX...
          </h3>
          <p className="text-xs text-slate-400">
            Menganalisis rasio valuasi, yield dividen, serta kepemilikan KSEI secara real-time.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/30 space-y-2">
          <p className="text-sm font-bold">⚠️ Terjadi Kesalahan: {error}</p>
          <button
            onClick={() => setActiveTab(activeTab)}
            className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/80 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
          <span className="text-3xl block">🔍</span>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
            Tidak Ada Saham yang Sesuai dengan Filter
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian, reset filter sektor, atau matikan filter Syariah/Dividen Rutin.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── VIEW MODE 1: MODERN GRID CARDS ──────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSortedData.map((item, idx) => {
            const isExpanded = expandedRow === item.ticker;
            const safeChangePercent = Number.isFinite(item.changePercent) ? item.changePercent : 0;
            const cagrVal = item.metrics?.cagr;

            return (
              <div
                key={item.ticker}
                className={`rounded-3xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                  isExpanded
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900/85 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm hover:border-indigo-400/40'
                }`}
              >
                <div>
                  {/* Card Header: Ticker, Avatar, Badges & Score */}
                  <div className="flex items-start justify-between gap-2.5 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                        {item.ticker.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-base text-slate-900 dark:text-white tracking-wide">
                            {item.ticker}
                          </span>
                          {item.isSyariah && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-black">
                              🌙 Syariah
                            </span>
                          )}
                          {item.hasStrongController && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-black">
                              👑 Pengendali
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                          {item.name || item.sector}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <ScoreBadge score={item.score} size="sm" />
                      {item.matchCount != null && (
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 mt-1">
                          ⭐ {item.matchCount}/4 Kriteria
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2x2 Primary Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 mb-3.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Harga Pasar
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                          Rp {(item.price ?? 0).toLocaleString('id-ID')}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${
                          safeChangePercent > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                          safeChangePercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                        }`}>
                          {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Div Yield / CAGR
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
                        </span>
                        <span className="text-slate-400 font-normal">|</span>
                        <span className={`text-xs font-mono font-bold ${
                          cagrVal != null && cagrVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Valuasi (PER / PBV)
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}
                        {getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        ROE & Solvabilitas
                      </span>
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                        ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Badges */}
                  {item.matchedScreeners?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.matchedScreeners.map((sc, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-black">
                          {sc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => setSelectedOwnershipStock(item)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>👥</span> KSEI Flow
                    </button>

                    <button
                      onClick={() => toggleRow(item.ticker)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Tutup Detail ▲' : 'Analisis Detail ▼'}</span>
                    </button>
                  </div>

                  {/* Accordion Expansion */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                      {renderItemDetails(item)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VIEW MODE 2: DENSE FINANCIAL TABLE PRO ───────────────────────── */
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-xs">
          <div className="overflow-x-auto max-h-[75vh] [scrollbar-width:thin]">
            <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800/80 text-left">
              <thead className="sticky top-0 z-20 backdrop-blur-md bg-slate-50/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <tr>
                  <th className="px-4 py-3.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">
                    #
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Saham & Sektor
                  </th>
                  {renderTableHeaders()}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredAndSortedData.map((item, idx) => {
                  const isExpanded = expandedRow === item.ticker;
                  return (
                    <Fragment key={item.ticker}>
                      <tr
                        onClick={() => toggleRow(item.ticker)}
                        className={`transition-colors cursor-pointer border-l-4 group ${
                          isExpanded
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-indigo-600 dark:border-l-indigo-500'
                            : 'border-l-transparent hover:border-l-indigo-600 dark:hover:border-l-indigo-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-xs text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                              {item.ticker.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-sm text-slate-900 dark:text-white tracking-wide">
                                  {item.ticker}
                                </span>
                                {item.isSyariah && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-black">
                                    🌙 Syariah
                                  </span>
                                )}
                                {item.hasStrongController && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-black">
                                    👑 Pengendali
                                  </span>
                                )}
                                {item.metrics?.streakYears >= 3 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-black">
                                    🏆 {item.metrics.streakYears}th Rutin
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                <span className="truncate max-w-[170px]">{item.name}</span>
                                <span>•</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.sector}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {renderRowCells(item)}
                      </tr>

                      {/* Expandable Detail Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-950/60">
                          <td colSpan="8" className="p-4 sm:p-5">
                            <div className="animate-in slide-in-from-top-1 duration-200">
                              {renderItemDetails(item)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Ownership KSEI Modal */}
      <StockOwnershipModal
        stock={selectedOwnershipStock}
        isOpen={Boolean(selectedOwnershipStock)}
        onClose={() => setSelectedOwnershipStock(null)}
      />
    </div>
  );
}
