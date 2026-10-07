'use client';

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import ScoreBadge from './ScoreBadge';
import StockOwnershipModal from './StockOwnershipModal';
import AiScreenerBar from './AiScreenerBar';
import { PageShell, PageHeader, PageToolbar, SectionTitle } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { StatCard } from './ui/StatCard';

export default function StockScreener() {
  const [activeTab, setActiveTab] = useState('pick');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedOwnershipStock, setSelectedOwnershipStock] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Default ke mode cards jika dibuka pada perangkat mobile (< 768px)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('cards');
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [syariahOnly, setSyariahOnly] = useState(false);
  const [dividendStreakOnly, setDividendStreakOnly] = useState(false);
  const [highScoreOnly, setHighScoreOnly] = useState(false);
  const [copiedTicker, setCopiedTicker] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const tabs = [
    { 
      id: 'pick', 
      icon: '◎',
      label: 'Pick This', 
      tag: 'Multi-Kriteria',
      desc: 'Saham unggulan pilihan utama yang lolos di banyak kriteria sekaligus (Passive, Dividen, Murah & Valuasi Bagus)' 
    },
    { 
      id: 'passive', 
      icon: '◷',
      label: 'Top 10 Passive Income', 
      tag: '5-Th Dividen',
      desc: '10 Saham dividen dengan fundamental terkuat & riwayat konsisten 5 tahun untuk penghasilan pasif stabil' 
    },
    { 
      id: 'dividend', 
      icon: '¤',
      label: 'High Dividend Yield', 
      tag: 'Cash Yield',
      desc: 'Saham dengan imbal hasil dividen kas tertinggi dari harga penutupan pasar terkini' 
    },
    { 
      id: 'cheap', 
      icon: '•',
      label: 'Murah & Wajar', 
      tag: 'Deep Value',
      desc: 'Saham undervalued di bawah rata-rata sektor dengan margin of safety sehat (PER & PBV diskon)' 
    },
    { 
      id: 'quality', 
      icon: '★',
      label: 'Valuasi Bagus', 
      tag: 'High ROE',
      desc: 'Perusahaan dengan profitabilitas tinggi (ROE & OPM unggul), neraca sehat, di harga wajar' 
    },
    { 
      id: 'potential', 
      icon: '↑',
      label: 'Saham Berpotensi', 
      tag: 'Momentum',
      desc: 'Kombinasi sinyal teknikal bullish, lonjakan volume, dan akumulasi smart money' 
    },
  ];

  const fetchScreenerData = useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    if (!aiResult) {
      fetchScreenerData();
    }
  }, [activeTab, fetchScreenerData, aiResult]);

  const handleAiSearch = async (prompt) => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/screener/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mencari dengan AI');
      setAiResult(json);
      setData(json.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearAi = () => {
    setAiResult(null);
    fetchScreenerData();
  };

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
      case 'bfi': return Number(item.metrics?.bfi ?? 0);
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
    if (per == null || per <= 0) return <span className="text-muted font-mono text-[11px]">-</span>;
    const val = Number(per);
    let colorClass = 'bg-sunken text-ink border-line   ';
    if (val < 10) {
      colorClass = 'bg-up-soft text-up border-up   ';
    } else if (val <= 18) {
      colorClass = 'bg-sunken text-ink border-line   ';
    } else {
      colorClass = 'bg-warn-soft text-warn border-warn   ';
    }

    return (
      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black border ${colorClass}`}>
        {val.toFixed(1)}x
      </span>
    );
  };

  const getPBVBadge = (pbv) => {
    if (pbv == null || pbv <= 0) return <span className="text-muted font-mono text-[11px]">-</span>;
    const val = Number(pbv);
    let colorClass = 'bg-sunken text-ink border-line   ';
    if (val < 1.0) {
      colorClass = 'bg-up-soft text-up border-up   ';
    } else if (val <= 2.5) {
      colorClass = 'bg-sunken text-ink border-line   ';
    } else {
      colorClass = 'bg-sunken text-ink border-line   ';
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
        className={`px-4 py-3.5 text-${align} text-[11px] font-black text-ink uppercase tracking-wider cursor-pointer hover:text-ink hover:bg-sunken transition-colors select-none ${extraClass}`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] transition-transform ${
 isActive 
 ? 'bg-accent text-on-accent font-black scale-110 shadow-xs' 
 : 'text-muted bg-sunken '
 }`}>
            {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const renderTableHeaders = () => {
    if (aiResult) {
      return (
        <>
          {renderSortHeader('Harga', 'price', 'right')}
          {renderSortHeader('Div Yield', 'dividendYield', 'right')}
          {renderSortHeader('Valuasi (PER / PBV)', 'per', 'right')}
          {renderSortHeader('Profit (ROE / OPM)', 'roe', 'right', 'hidden sm:table-cell')}
          {renderSortHeader('Smart Money', 'bfi', 'center', 'hidden md:table-cell')}
          {renderSortHeader('AI Match', 'score', 'center')}
        </>
      );
    }

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
    
    if (aiResult) {
      const perVal = item.metrics?.per;
      const pbvVal = item.metrics?.pbv;
      const roeVal = item.metrics?.roe;
      const opmVal = item.metrics?.opm;
      const bfiVal = item.metrics?.bfi;

      return (
        <>
          <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
            Rp {(item.price ?? 0).toLocaleString('id-ID')}
          </td>
          <td className="px-4 py-3.5 whitespace-nowrap text-right">
            {item.metrics?.dividendYield > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs bg-up-soft text-up border border-up ">
                {item.metrics.dividendYield.toFixed(1)}%
              </span>
            ) : (
              <span className="text-muted font-mono text-xs">-</span>
            )}
          </td>
          <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs text-ink ">
            {perVal != null ? `${perVal.toFixed(1)}x` : '-'} / {pbvVal != null ? `${pbvVal.toFixed(2)}x` : '-'}
          </td>
          <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell font-mono text-xs">
            <span className={roeVal >= 15 ? 'text-up  font-bold' : 'text-muted '}>
              {roeVal != null ? `${roeVal.toFixed(1)}%` : '-'}
            </span>
            {opmVal != null && (
              <span className="text-muted text-[10px] ml-1">
                ({opmVal.toFixed(0)}%)
              </span>
            )}
          </td>
          <td className="px-4 py-3.5 whitespace-nowrap text-center hidden md:table-cell">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
 bfiVal > 0 ? 'bg-up-soft text-up ' : 'bg-sunken text-muted '
 }`}>
              {bfiVal > 0 ? `Akumulasi (+${bfiVal})` : 'Netral'}
            </span>
          </td>
          <td className="px-4 py-3.5 whitespace-nowrap text-center">
            <ScoreBadge score={item.matchScore ?? item.score} />
          </td>
        </>
      );
    }

    switch (activeTab) {
      case 'pick':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs bg-up-soft text-up border border-up ">
                <span>↗</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
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
                  <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full bg-sunken text-ink border border-line font-extrabold">
                    {screener}
                  </span>
                )) || <span className="text-xs text-muted">-</span>}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <span className="text-[9px] text-warn font-black mt-1">
                  ★ {item.matchCount}/4 Kriteria
                </span>
              </div>
            </td>
          </>
        );
      case 'passive':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs bg-up-soft text-up border border-up ">
                <span>↗</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
 }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
              <div className="flex items-center justify-end gap-1.5">
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-sunken text-ink border border-line ">
                  ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                </span>
                {item.metrics?.opm != null && (
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-sunken text-ink border border-line ">
                    OPM: {Number(item.metrics.opm).toFixed(1)}%
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1.5 mt-1 text-[10px] text-muted font-bold font-mono">
                  <span>Div: <strong className="text-up ">{item.divScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>Fund: <strong className="text-ink ">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'dividend':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-up-soft text-up border border-up ">
                <span>¤</span> {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
              </span>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
 }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold text-ink hidden sm:table-cell">
              {item.metrics?.payoutRatio != null ? (
                <span className={`px-2 py-0.5 rounded-md text-[11px] border ${
 item.metrics.payoutRatio <= 70 
 ? 'bg-up-soft text-up border-up ' 
 : 'bg-warn-soft text-warn border-warn '
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
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-1.5">
                {getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}
                {item.metrics?.sectorAvgPER != null && (
                  <span className="text-[10px] text-muted font-mono">
                    (Skt: {Number(item.metrics.sectorAvgPER).toFixed(1)}x)
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
              <div className="flex items-center justify-end gap-1.5">
                {getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}
                {item.metrics?.opm != null && (
                  <span className="text-[10px] font-mono font-bold text-ink ">
                    OPM: {Number(item.metrics.opm).toFixed(1)}%
                  </span>
                )}
              </div>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
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
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
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
                <span className="px-2 py-0.5 rounded font-mono text-[11px] font-black bg-sunken text-ink border border-line ">
                  ROE {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-warn-soft text-warn border border-warn ">
                  DER {item.metrics?.der != null ? `${Number(item.metrics.der).toFixed(2)}x` : '-'}
                </span>
              </div>
            </td>
            <td className={`px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
 }`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1.5 mt-1 text-[10px] text-muted font-mono font-bold">
                  <span>Val: <strong className="text-up ">{item.valScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>Fund: <strong className="text-ink ">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'potential':
        return (
          <>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono tabular-nums font-black text-ink ">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right">
              <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-black border ${
 safeChangePercent > 0 
 ? 'bg-up-soft text-up border-up ' 
 : safeChangePercent < 0 
 ? 'bg-down-soft text-down border-down ' 
 : 'bg-sunken text-ink border-line '
 }`}>
                {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(2)}%
              </span>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold text-ink hidden sm:table-cell">
              {item.volume ? (Number(item.volume) / 10000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' Lot' : '-'}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} size="sm" />
                <div className="flex gap-1 mt-1 text-[9px] text-muted font-mono font-bold">
                  <span>Tek: <strong className="text-ink ">{item.techScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>SM: <strong className="text-warn ">{item.smScore ?? 0}</strong></span>
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
        <div className="p-4 rounded-md bg-surface border border-line shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h4 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
              <span>▤</span> Fundamental & Valuasi
            </h4>
            <span className="text-[10px] font-bold text-ink bg-sunken px-2 py-0.5 rounded-full border border-line ">
              Audit Keuangan
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-sm bg-sunken border border-line ">
              <span className="text-[10px] text-muted font-bold block">ROE (Ekuitas)</span>
              <span className="font-mono font-black text-ink text-xs">
                {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-sm bg-sunken border border-line ">
              <span className="text-[10px] text-muted font-bold block">OPM (Operasional)</span>
              <span className="font-mono font-black text-ink text-xs">
                {item.metrics?.opm != null ? `${Number(item.metrics.opm).toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-sm bg-sunken border border-line ">
              <span className="text-[10px] text-muted font-bold block">DER (Rasio Utang)</span>
              <span className="font-mono font-black text-warn text-xs">
                {item.metrics?.der != null ? `${Number(item.metrics.der).toFixed(2)}x` : '-'}
              </span>
            </div>
            <div className="p-2 rounded-sm bg-sunken border border-line ">
              <span className="text-[10px] text-muted font-bold block">EPS Terkini</span>
              <span className="font-mono font-black text-up text-xs">
                {item.metrics?.eps != null ? `Rp ${Number(item.metrics.eps).toLocaleString('id-ID')}` : '-'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1.5">
              Alasan Evaluasi Algoritma:
            </span>
            <ul className="space-y-1.5">
              {item.details?.map((detail, i) => (
                <li key={i} className="text-[11px] text-muted flex items-start gap-1.5">
                  <span className="text-up font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-tight">{detail}</span>
                </li>
              )) || (
                <li className="text-[11px] text-muted italic">Data poin fundamental tidak tersedia</li>
              )}
            </ul>
          </div>
        </div>

        {/* Card 2: Smart Money & KSEI Multi-Month Flow */}
        <div className="p-4 rounded-md bg-surface border border-line shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h4 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
              <span>»</span> Smart Money & KSEI
            </h4>
            <button
              onClick={() => setSelectedOwnershipStock(item)}
              className="text-[10px] font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
            >
              Struktur KSEI ↗
            </button>
          </div>

          {/* Volume Spike & Bandarmologi status */}
          {item.smartMoney && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-sm bg-sunken border border-line ">
                <span className="text-[10px] text-muted font-bold block">Lonjakan Volume</span>
                <span className={`text-xs font-mono font-black ${
 item.smartMoney.turnoverSpikeRatio > 1.5 ? 'text-warn' : 'text-ink '
 }`}>
                  {(item.smartMoney.turnoverSpikeRatio * 100).toFixed(0)}% vs Rata-rata
                </span>
              </div>
              <div className="p-2.5 rounded-sm bg-sunken border border-line ">
                <span className="text-[10px] text-muted font-bold block">Status Bandar</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block mt-0.5 ${
 item.smartMoney.badge === 'emerald' ? 'bg-up-soft text-up ' :
 item.smartMoney.badge === 'rose' ? 'bg-down-soft text-down ' :
 item.smartMoney.badge === 'amber' ? 'bg-warn-soft text-warn ' :
 'bg-sunken text-ink '
 }`}>
                  {item.smartMoney.status}
                </span>
              </div>
            </div>
          )}

          {/* KSEI Multi-Month Carousel */}
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1.5">
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
                        <div key={idx} className={`p-2 min-w-[105px] rounded-sm border shrink-0 transition-all ${
 idx === 0 
 ? 'bg-sunken border-line ' 
 : 'bg-sunken border-line '
 }`}>
                          <div className="text-[9px] text-muted font-bold">{sh.date}</div>
                          <div className="text-[11px] font-mono font-black text-ink ">
                            Rtl: {sh.retailPercent?.toFixed(1) ?? '0.0'}%
                          </div>
                          <div className={`text-[10px] font-mono font-bold flex items-center gap-0.5 mt-0.5 ${
 deltaRetail > 0 ? 'text-up ' : deltaRetail < 0 ? 'text-down ' : 'text-muted'
 }`}>
                            {deltaRetail > 0 ? `↗ +${Math.abs(deltaRetail).toLocaleString('id-ID')}` :
                             deltaRetail < 0 ? `↘ -${Math.abs(deltaRetail).toLocaleString('id-ID')}` : '0'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return <div className="text-[11px] text-muted italic">Data histori bulanan KSEI belum tercatat.</div>;
            })()}
          </div>
        </div>

        {/* Card 3: Top Shareholders & Insider Trades */}
        <div className="p-4 rounded-md bg-surface border border-line shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h4 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
              <span>▥</span> Pemegang Saham & Insider
            </h4>
            <span className="text-[9px] font-bold bg-warn-soft text-warn px-2 py-0.5 rounded-full border border-warn ">
              BEI Verified »
            </span>
          </div>

          {/* Top 2 Shareholders */}
          {item.ownership?.shareholders?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                Top Shareholders ({'>'}5%):
              </span>
              {item.ownership.shareholders.filter(s => s.Kategori === 'Lebih dari 5%').slice(0, 2).map((sh, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-sm bg-sunken border border-line ">
                  <span className="text-[10px] font-bold text-ink truncate max-w-[170px]" title={sh.Nama}>
                    {sh.Nama}
                  </span>
                  <span className="text-[11px] font-mono font-black text-ink shrink-0">
                    {sh.Persentase}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Insider Trades Snippet */}
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1.5">
              Transaksi Terkini Direksi / Komisaris:
            </span>
            {(() => {
              const trades = Array.isArray(item.insiderTrades) ? item.insiderTrades.slice(0, 2) : [];
              if (trades.length === 0) {
                return <div className="text-[11px] text-muted italic">Belum ada catatan transaksi insider terkini.</div>;
              }

              return (
                <div className="space-y-1.5">
                  {trades.map((t, idx) => {
                    const isBuy = (t.action || t.type) === 'BUY';
                    const lots = Math.round((t.shares || t.volume || 0) / 100);
                    return (
                      <div key={idx} className="p-2 rounded-sm bg-sunken border border-line flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-ink truncate">
                            {t.name || t.insiderName || 'Direksi'}
                          </div>
                          <span className={`text-[9px] font-black uppercase ${isBuy ? 'text-up' : 'text-down'}`}>
                            {isBuy ? '● Beli' : '● Jual'} {lots > 0 ? `${lots.toLocaleString('id-ID')} Lot` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted shrink-0">
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
          <div className="pt-2 border-t border-line flex items-center justify-between">
            <button
              onClick={(e) => handleCopyTicker(item.ticker, e)}
              className="text-[10px] font-bold text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
            >
              <span>{copiedTicker === item.ticker ? '✓ Tersalin!' : '▤ Salin Kode'}</span>
            </button>
            <button
              onClick={() => setSelectedOwnershipStock(item)}
              className="px-2.5 py-1 rounded-sm text-[10px] font-black bg-accent hover:bg-accent text-on-accent shadow-xs transition-all cursor-pointer"
            >
              Audit Kepemilikan ↗
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Stock Screener"
        subtitle="Saring saham BEI dengan kriteria valuasi, kualitas, dividen, dan momentum"
        badge={<span className="badge badge-outline">{data.length} emiten</span>}
      />

      {/* ── AI NATURAL LANGUAGE SCREENER BAR ── */}
      <AiScreenerBar
        onSearch={handleAiSearch}
        loading={aiLoading}
        aiResult={aiResult}
        onClear={handleClearAi}
      />

      {/* ── 1. STRATEGY SELECTOR (columns grow with the viewport) ──────────── */}
      <section>
        <SectionTitle note="pilih satu strategi">Filter Strategi</SectionTitle>
        <AutoGrid minWidth="210px">
        {tabs.map((tab) => {
          const isActive = !aiResult && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setActiveTab(tab.id);
                setExpandedRow(null);
                setAiResult(null);
              }}
              className={`p-3.5 rounded-sm text-left transition-colors cursor-pointer border flex flex-col justify-between relative overflow-hidden group focus-ring ${
 isActive
 ? 'bg-accent border-accent text-on-accent'
 : 'bg-surface hover:bg-sunken text-ink border-line hover:border-line-strong'
 }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl" aria-hidden="true">{tab.icon}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-sm font-mono uppercase tracking-wider ${
 isActive
 ? 'border border-on-accent/40 text-on-accent'
 : 'bg-sunken text-muted'
 }`}>
                    {tab.tag}
                  </span>
                </div>
                <h3 className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug ${
 isActive ? 'text-on-accent' : 'text-ink '
 }`}>
                  {tab.label}
                </h3>
              </div>
              <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-[10px]">
                <span className={`font-medium ${isActive ? 'text-on-accent' : 'text-muted'}`}>
                  {isActive ? 'Aktif' : 'Pilih'}
                </span>
                <span className={`font-mono ${isActive ? 'text-on-accent' : 'text-ink '}`} aria-hidden="true">
                  →
                </span>
              </div>
            </button>
          );
        })}
        </AutoGrid>
      </section>

      {/* ── 2. KPI SUMMARY ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle note="dari hasil filter aktif">Ringkasan Koleksi</SectionTitle>
        <AutoGrid minWidth="230px">
          <StatCard
            label="Rata-Rata Div Yield"
            value={`${kpiStats.avgYield}%`}
            hint="Koleksi screener aktif"
            tone="up"
          />
          <StatCard
            label="Median PER Saham"
            value={`${kpiStats.medianPER}x`}
            hint="Level valuasi tengah"
          />
          <StatCard
            label="Rata-Rata CAGR Laba"
            value={`${Number(kpiStats.avgCAGR) >= 0 ? '+' : ''}${kpiStats.avgCAGR}%`}
            hint="Pertumbuhan compound"
            tone={Number(kpiStats.avgCAGR) >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="Rasio Syariah"
            value={`${kpiStats.syariahPercent}%`}
            hint={`Total MCap: Rp ${kpiStats.mCapTrillion}T`}
          />
        </AutoGrid>
      </section>

      {/* ── 3. STICKY TOOLBAR: SEARCH, SECTOR, QUICK FILTERS, VIEW ────────── */}
      <PageToolbar
        meta={(
          <span className="badge" aria-live="polite">
            {filteredAndSortedData.length} hasil
          </span>
        )}
      >
        <div className="relative min-w-[190px] max-w-xs flex-1">
          <label htmlFor="screener-search" className="sr-only">Cari saham</label>
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted font-mono text-sm" aria-hidden="true">
            ⌕
          </span>
          <input
            id="screener-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode, nama, atau sektor..."
            className="input pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted hover:text-ink focus-ring rounded-sm"
            >
              <span className="font-mono" aria-hidden="true">✕</span>
            </button>
          )}
        </div>

        <label htmlFor="screener-sector" className="sr-only">Sektor</label>
        <select
          id="screener-sector"
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="select w-auto min-h-9 py-1 text-xs"
        >
          <option value="ALL">Semua Sektor ({data.length})</option>
          {availableSectors.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>

        {/* Quick filter chips */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSyariahOnly(!syariahOnly)}
            aria-pressed={syariahOnly}
            className={`badge min-h-8 cursor-pointer ${
 syariahOnly ? 'badge-up' : 'hover:bg-sunken'
            }`}
          >
            <span aria-hidden="true">☾</span> Syariah
          </button>
          <button
            type="button"
            onClick={() => setDividendStreakOnly(!dividendStreakOnly)}
            aria-pressed={dividendStreakOnly}
            className={`badge min-h-8 cursor-pointer ${
 dividendStreakOnly ? 'badge-accent' : 'hover:bg-sunken'
            }`}
          >
            <span aria-hidden="true">★</span> Dividen ≥3th
          </button>
          <button
            type="button"
            onClick={() => setHighScoreOnly(!highScoreOnly)}
            aria-pressed={highScoreOnly}
            className={`badge min-h-8 cursor-pointer ${
 highScoreOnly ? 'badge-warn' : 'hover:bg-sunken'
            }`}
          >
            <span aria-hidden="true">★</span> Skor ≥75
          </button>
          {(searchQuery || selectedSector !== 'ALL' || syariahOnly || dividendStreakOnly || highScoreOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSector('ALL');
                setSyariahOnly(false);
                setDividendStreakOnly(false);
                setHighScoreOnly(false);
              }}
              aria-label="Reset semua filter"
              className="btn-ghost !min-h-8 !px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* View switch */}
        <div className="tabs" role="group" aria-label="Tampilan hasil">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className="tab"
          >
            <span className="font-mono" aria-hidden="true">▤</span> Tabel
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
            className="tab"
          >
            <span className="font-mono" aria-hidden="true">▤</span> Kartu
          </button>
        </div>
      </PageToolbar>

      {/* ── 4. DATA PRESENTATION (GRID CARDS OR DENSE TABLE) ────────────────── */}
      {loading ? (
        <div className="p-12 text-center rounded-md bg-surface border border-line animate-pulse space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-sunken flex items-center justify-center text-xl animate-spin">
            …
          </div>
          <h3 className="text-sm font-bold text-ink ">
            Mengolah & Menyaring Data Saham IDX...
          </h3>
          <p className="text-xs text-muted">
            Menganalisis rasio valuasi, yield dividen, serta kepemilikan KSEI secara real-time.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-down bg-down-soft rounded-md border border-down space-y-2">
          <p className="text-sm font-bold">▲ Terjadi Kesalahan: {error}</p>
          <button
            onClick={() => setActiveTab(activeTab)}
            className="px-4 py-1.5 rounded-sm bg-down text-on-accent text-xs font-bold hover:bg-down transition-colors cursor-pointer"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        <div className="p-12 text-center rounded-md bg-surface border border-dashed border-line space-y-2">
          <span className="text-3xl block">⌕</span>
          <h3 className="text-sm font-black text-ink ">
            Tidak Ada Saham yang Sesuai dengan Filter
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
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
                className={`rounded-md border p-5 transition-all duration-200 flex flex-col justify-between ${
 isExpanded
 ? 'bg-surface border-accent shadow-md ring-2 ring-accent'
 : 'bg-surface hover:bg-sunken border-line shadow-2xs hover:shadow-sm hover:border-accent'
 }`}
              >
                <div>
                  {/* Card Header: Ticker, Avatar, Badges & Score */}
                  <div className="flex items-start justify-between gap-2.5 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md border border-line flex items-center justify-center font-black text-xs text-ink shrink-0">
                        {item.ticker.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-base text-ink tracking-wide">
                            {item.ticker}
                          </span>
                          {item.isSyariah && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-up-soft text-up border border-up font-black">
                              ☾ Syariah
                            </span>
                          )}
                          {item.hasStrongController && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warn-soft text-warn border border-warn font-black">
                              ★ Pengendali
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted truncate max-w-[190px]">
                          {item.name || item.sector}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <ScoreBadge score={item.score} size="sm" />
                      {item.matchCount != null && (
                        <span className="text-[9px] font-black text-warn mt-1">
                          ★ {item.matchCount}/4 Kriteria
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2x2 Primary Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-sunken border border-line mb-3.5">
                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                        Harga Pasar
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-sm font-mono font-black text-ink ">
                          Rp {(item.price ?? 0).toLocaleString('id-ID')}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${
 safeChangePercent > 0 ? 'text-up ' :
 safeChangePercent < 0 ? 'text-down ' : 'text-muted'
 }`}>
                          {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                        Div Yield / CAGR
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xs font-mono font-black text-up ">
                          {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
                        </span>
                        <span className="text-muted font-normal">|</span>
                        <span className={`text-xs font-mono font-bold ${
 cagrVal != null && cagrVal >= 0 ? 'text-up ' : 'text-down '
 }`}>
                          {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                        Valuasi (PER / PBV)
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getPERBadge(item.metrics?.per ?? item.fundamentals?.per)}
                        {getPBVBadge(item.metrics?.pbv ?? item.fundamentals?.pbv)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                        ROE & Solvabilitas
                      </span>
                      <div className="text-xs font-mono font-bold text-ink mt-1">
                        ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Badges */}
                  {item.matchedScreeners?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.matchedScreeners.map((sc, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-sunken text-ink border border-line font-black">
                          {sc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div>
                  <div className="flex items-center justify-between pt-3 border-t border-line ">
                    <button
                      onClick={() => setSelectedOwnershipStock(item)}
                      className="text-[11px] font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>◫</span> KSEI Flow
                    </button>

                    <button
                      onClick={() => toggleRow(item.ticker)}
                      className="px-3 py-1.5 rounded-sm text-xs font-black bg-sunken hover:bg-sunken text-ink transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Tutup Detail ▲' : 'Analisis Detail ▼'}</span>
                    </button>
                  </div>

                  {/* Accordion Expansion */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-line animate-in fade-in duration-200">
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
        <div className="overflow-hidden rounded-md border border-line bg-surface shadow-xs">
          <div className="overflow-x-auto max-h-[75vh] [scrollbar-width:thin]">
            <table className="min-w-full divide-y divide-line text-left">
              <thead className="sticky top-0 z-20 bg-sunken border-b border-line shadow-2xs">
                <tr>
                  <th className="px-4 py-3.5 text-center text-[10px] font-black text-muted uppercase tracking-widest w-12">
                    #
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black text-ink uppercase tracking-wider">
                    Saham & Sektor
                  </th>
                  {renderTableHeaders()}
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium">
                {filteredAndSortedData.map((item, idx) => {
                  const isExpanded = expandedRow === item.ticker;
                  return (
                    <Fragment key={item.ticker}>
                      <tr
                        onClick={() => toggleRow(item.ticker)}
                        className={`transition-colors cursor-pointer border-l-4 group ${
 isExpanded
 ? 'bg-sunken border-l-indigo-600 '
 : 'border-l-transparent hover:border-l-indigo-600 hover:bg-sunken '
 }`}
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-mono font-bold text-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm border border-line flex items-center justify-center font-black text-xs text-ink shrink-0 group-hover:scale-105 transition-transform">
                              {item.ticker.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-sm text-ink tracking-wide">
                                  {item.ticker}
                                </span>
                                {item.isSyariah && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-up-soft text-up border border-up font-black">
                                    ☾ Syariah
                                  </span>
                                )}
                                {item.hasStrongController && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warn-soft text-warn border border-warn font-black">
                                    ★ Pengendali
                                  </span>
                                )}
                                {item.metrics?.streakYears >= 3 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sunken text-ink border border-line font-black">
                                    ★ {item.metrics.streakYears}th Rutin
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted ">
                                <span className="truncate max-w-[170px]">{item.name}</span>
                                <span>•</span>
                                <span className="text-[10px] text-muted ">{item.sector}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {renderRowCells(item)}
                      </tr>

                      {/* Expandable Detail Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-sunken ">
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
    </PageShell>
  );
}
