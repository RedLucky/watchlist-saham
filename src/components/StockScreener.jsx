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

 const tabs = [
 { id: 'pick', label: '🎯 Pick This', desc: 'Saham unggulan pilihan utama yang lolos di banyak kriteria sekaligus (Passive, Dividen, Murah & Valuasi Bagus)' },
 { id: 'passive', label: '🏖️ Top 10 Passive Income', desc: '10 Saham dividen dengan fundamental terkuat & riwayat 5 tahun untuk passive income' },
 { id: 'dividend', label: '💰 High Dividend Yield', desc: 'Saham dengan yield dividen tertinggi dari harga terbaru' },
 { id: 'cheap', label: '🏷️ Murah & Wajar', desc: 'Saham undervalued (PER & PBV di bawah rata-rata sektor)' },
 { id: 'quality', label: '⭐ Valuasi Bagus', desc: 'Perusahaan fundamental sehat & harga terjangkau' },
 { id: 'potential', label: '🚀 Saham Berpotensi', desc: 'Kombinasi sinyal teknikal, akumulasi smart money, & tren' },
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

 const sortedData = useMemo(() => {
 if (!sortConfig.key) return data;
 return [...data].sort((a, b) => {
 const valA = getValue(a, sortConfig.key);
 const valB = getValue(b, sortConfig.key);
 if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
 if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
 return 0;
 });
 }, [data, sortConfig]);

 const renderSortHeader = (label, sortKey, align = 'right', extraClass = '') => {
 const isActive = sortConfig.key === sortKey;
 return (
 <th 
 onClick={() => handleSort(sortKey)}
 className={`px-4 py-3 text-${align} text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors select-none bg-slate-100 dark:bg-slate-900 ${extraClass}`}
 >
 <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
 <span>{label}</span>
 <span className={`text-[10px] ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
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
  {renderSortHeader('PER / PBV / EPS', 'per', 'right')}
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
  {renderSortHeader('ROE / OPM', 'roe', 'right', 'hidden sm:table-cell')}
  {renderSortHeader('Skor (Div | Fund | Passive)', 'score', 'center')}
  </>
  );
  case 'dividend':
  return (
  <>
  {renderSortHeader('Harga', 'price', 'right')}
  {renderSortHeader('Yield', 'dividendYield', 'right')}
  {renderSortHeader('CAGR Laba', 'cagr', 'right')}
  {renderSortHeader('Payout Ratio', 'payoutRatio', 'right', 'hidden sm:table-cell')}
  {renderSortHeader('Skor Dividen', 'score', 'center')}
  </>
  );
  case 'cheap':
  return (
  <>
  {renderSortHeader('Harga', 'price', 'right')}
  {renderSortHeader('PER / EPS', 'per', 'right')}
  {renderSortHeader('PBV / OPM', 'pbv', 'right', 'hidden sm:table-cell')}
  {renderSortHeader('CAGR Laba', 'cagr', 'right')}
  {renderSortHeader('Skor Valuasi', 'score', 'center')}
  </>
  );
 case 'quality':
 return (
 <>
 {renderSortHeader('Harga', 'price', 'right')}
 {renderSortHeader('PER / PBV / EPS', 'per', 'right')}
 {renderSortHeader('ROE / OPM / DER', 'roe', 'right', 'hidden sm:table-cell')}
 {renderSortHeader('CAGR Laba', 'cagr', 'right')}
 {renderSortHeader('Skor (Val | Fund | Gabungan)', 'score', 'center')}
 </>
 );
 case 'potential':
 return (
 <>
 {renderSortHeader('Harga', 'price', 'right')}
 {renderSortHeader('Perubahan', 'changePercent', 'right')}
 {renderSortHeader('Volume', 'volume', 'right', 'hidden sm:table-cell')}
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
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-emerald-700 dark:text-emerald-400">
              {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
            </td>
            <td className={`px-4 py-4 whitespace-nowrap text-right font-extrabold ${cagrVal != null && cagrVal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300">
              <div className="flex flex-col items-end">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">PER: {item.metrics?.per != null ? `${Number(item.metrics.per).toFixed(1)}x` : '-'}</span>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">PBV: {item.metrics?.pbv != null ? `${Number(item.metrics.pbv).toFixed(1)}x` : '-'}</span>
                {item.metrics?.eps != null && (
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">EPS: Rp {Number(item.metrics.eps).toLocaleString('id-ID')}</span>
                )}
              </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-center">
              <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
                {item.matchedScreeners?.map((screener, idx) => (
                  <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/30 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-400/30 font-extrabold">
                    {screener}
                  </span>
                )) || <span className="text-xs text-slate-500 dark:text-slate-400">-</span>}
              </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} />
                <span className="text-[9px] text-amber-800 dark:text-amber-400 font-extrabold mt-1">
                  ⭐ {item.matchCount}/4 Kriteria
                </span>
              </div>
            </td>
          </>
        );
      case 'passive':
        return (
          <>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-emerald-700 dark:text-emerald-400">
              {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
            </td>
            <td className={`px-4 py-4 whitespace-nowrap text-right font-extrabold ${cagrVal != null && cagrVal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300 hidden sm:table-cell">
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-purple-700 dark:text-purple-400">ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}</span>
                {item.metrics?.opm != null && (
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">OPM: {Number(item.metrics.opm).toFixed(1)}%</span>
                )}
              </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} />
                <div className="flex gap-1.5 mt-1 text-[10px] text-slate-700 dark:text-slate-400 font-bold">
                  <span title="Skor Dividen">Div: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{item.divScore ?? 0}</strong></span>
                  <span>|</span>
                  <span title="Skor Fundamental">Fund: <strong className="text-blue-700 dark:text-blue-400 font-extrabold">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'dividend':
        return (
          <>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-emerald-700 dark:text-emerald-400">
              {(item.metrics?.dividendYield ?? 0).toFixed(1)}%
            </td>
            <td className={`px-4 py-4 whitespace-nowrap text-right font-extrabold ${cagrVal != null && cagrVal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300 font-bold hidden sm:table-cell">
              {item.metrics?.payoutRatio != null ? `${Number(item.metrics.payoutRatio).toFixed(0)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex justify-center items-center">
                <ScoreBadge score={item.score} />
              </div>
            </td>
          </>
        );
      case 'cheap':
        return (
          <>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300">
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">PER: {item.metrics?.per != null ? `${Number(item.metrics.per).toFixed(1)}x` : '-'}</span>
                {item.metrics?.eps != null && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">EPS: Rp {Number(item.metrics.eps).toLocaleString('id-ID')}</span>
                )}
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sektor: {item.metrics?.sectorAvgPER != null ? `${Number(item.metrics.sectorAvgPER).toFixed(1)}x` : '-'}</span>
              </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300 hidden sm:table-cell">
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-blue-700 dark:text-blue-400">PBV: {item.metrics?.pbv != null ? `${Number(item.metrics.pbv).toFixed(2)}x` : '-'}</span>
                {item.metrics?.opm != null && (
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">OPM: {Number(item.metrics.opm).toFixed(1)}%</span>
                )}
              </div>
            </td>
            <td className={`px-4 py-4 whitespace-nowrap text-right font-extrabold ${cagrVal != null && cagrVal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex justify-center items-center">
                <ScoreBadge score={item.score} />
              </div>
            </td>
          </>
        );
      case 'quality':
        return (
          <>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300">
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">PER: {item.metrics?.per != null ? `${Number(item.metrics.per).toFixed(1)}x` : '-'}</span>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">PBV: {item.metrics?.pbv != null ? `${Number(item.metrics.pbv).toFixed(1)}x` : '-'}</span>
                {item.metrics?.eps != null && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">EPS: Rp {Number(item.metrics.eps).toLocaleString('id-ID')}</span>
                )}
              </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300 hidden sm:table-cell">
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-purple-700 dark:text-purple-400">ROE: {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}</span>
                {item.metrics?.opm != null && (
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">OPM: {Number(item.metrics.opm).toFixed(1)}%</span>
                )}
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400">DER: {item.metrics?.der != null ? `${Number(item.metrics.der).toFixed(2)}x` : '-'}</span>
              </div>
            </td>
            <td className={`px-4 py-4 whitespace-nowrap text-right font-extrabold ${cagrVal != null && cagrVal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} />
                <div className="flex gap-1.5 mt-1 text-[10px] text-slate-700 dark:text-slate-400 font-bold">
                  <span>Val: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{item.valScore ?? 0}</strong></span>
                  <span>|</span>
                  <span>Fund: <strong className="text-blue-700 dark:text-blue-400 font-extrabold">{item.fundScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      case 'potential':
        return (
          <>
            <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
              Rp {(item.price ?? 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right">
              <span className={`font-extrabold ${safeChangePercent > 0 ? 'text-emerald-700 dark:text-emerald-400' : safeChangePercent < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-400'}`}>
                {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(2)}%
              </span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-slate-700 dark:text-slate-300 font-bold hidden sm:table-cell">
              {item.volume ? (Number(item.volume) / 10000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' Lot' : '-'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <ScoreBadge score={item.score} />
                <div className="flex gap-1 mt-1 text-[9px] text-slate-700 dark:text-slate-400 font-bold">
                  <span title="Teknikal">Tek: <strong className="text-indigo-700 dark:text-indigo-400 font-extrabold">{item.techScore ?? 0}</strong></span>
                  <span>|</span>
                  <span title="Smart Money">SM: <strong className="text-amber-800 dark:text-amber-400 font-extrabold">{item.smScore ?? 0}</strong></span>
                  <span>|</span>
                  <span title="Tren">Tren: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{item.trendScore ?? 0}</strong></span>
                </div>
              </div>
            </td>
          </>
        );
      default:
        return null;
    }
  };

  // Shared Detail Renderer for both Desktop Expanded Row and Mobile Card Accordion
  const renderItemDetails = (item) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left Column: Alasan Penilaian & Smart Money Metrics */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2">
              Alasan Penilaian
            </h4>
            <ul className="space-y-1.5">
              {item.details?.map((detail, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5 shrink-0">✓</span>
                  <span>{detail}</span>
                </li>
              )) || (
                <li className="text-xs text-slate-500 dark:text-slate-400 italic">Tidak ada detail tersedia</li>
              )}
            </ul>
          </div>

          {item.smartMoney && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2">
                ⚡ Volume & Smart Money Analysis
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Lonjakan Harian</span>
                  <span className={`text-xs font-bold ${
                    item.smartMoney.turnoverSpikeRatio > 1.5 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {(item.smartMoney.turnoverSpikeRatio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status Bandarmologi</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold block truncate mt-0.5 ${
                    item.smartMoney.badge === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    item.smartMoney.badge === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                    item.smartMoney.badge === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {item.smartMoney.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: KSEI Multi-Month Flow & Shareholders */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                📊 Pergerakan Ritel & Smart Money (KSEI)
              </h4>
              <button
                onClick={() => setSelectedOwnershipStock(item)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Detail Lengkap ↗
              </button>
            </div>
            {(() => {
              let history = item.kseiHistory;
              if (typeof history === 'string') {
                try { history = JSON.parse(history); } catch (e) { history = []; }
              }
              if (Array.isArray(history) && history.length > 0) {
                return (
                  <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                    {[...history].reverse().slice(0, 6).map((sh, idx) => {
                      const deltaRetail = sh.deltaRetail || 0;
                      const deltaForeign = sh.deltaForeign || 0;
                      return (
                        <div key={idx} className={`p-2 min-w-[115px] rounded-lg border shrink-0 transition-all ${
                          idx === 0 
                            ? 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-sm'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50'
                        }`}>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{sh.date}</div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            Ritel: {sh.retailPercent?.toFixed(1) ?? '0.0'}%
                          </div>
                          <div className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${
                            deltaRetail > 0 ? 'text-emerald-600 dark:text-emerald-400' : deltaRetail < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                          }`}>
                            {deltaRetail > 0 ? `📈 +${Math.abs(deltaRetail).toLocaleString('id-ID')}` :
                             deltaRetail < 0 ? `📉 -${Math.abs(deltaRetail).toLocaleString('id-ID')}` :
                             '➖ 0 lbr'}
                          </div>
                          {deltaForeign !== 0 && (
                            <div className={`text-[9px] font-bold mt-0.5 ${
                              deltaForeign > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {deltaForeign > 0 ? `🌐 +${Math.abs(deltaForeign).toLocaleString('id-ID')}` :
                               `🌐 -${Math.abs(deltaForeign).toLocaleString('id-ID')}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return <div className="text-[10px] text-slate-500 italic">Data histori kepemilikan KSEI belum tersedia.</div>;
            })()}
          </div>

          {item.ownership && item.ownership.shareholders && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2">
                🏢 Top Shareholders ({'>'}5%)
              </h4>
              <div className="space-y-1.5">
                {item.ownership.shareholders.filter(s => s.Kategori === 'Lebih dari 5%').slice(0, 3).map((sh, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate pr-2 max-w-[140px]" title={sh.Nama}>{sh.Nama}</div>
                    <div className="text-[10px] font-bold text-slate-900 dark:text-white shrink-0">{sh.Persentase}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insider Trades */}
          <div>
            {(() => {
              let trades = [];
              if (Array.isArray(item.insiderTrades) && item.insiderTrades.length > 0) {
                trades = item.insiderTrades.filter(t => t.name || t.insiderName).map(t => ({
                  name: t.name || t.insiderName,
                  role: t.position || t.role || 'Direksi / Manajemen',
                  action: t.action || (t.type === 'SELL' ? 'SELL' : 'BUY'),
                  date: t.date ? new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'Snapshot',
                  shares: Number(t.shares || t.volume || 0),
                  price: Number(t.price || item.price || 0),
                  purpose: t.purpose || (t.action === 'SELL' ? 'Divestasi / Realisasi' : 'Investasi Langsung'),
                }));
              }

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      🚨 Transaksi Orang Dalam (Insider)
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      BEI ⚡
                    </span>
                  </div>

                  {trades.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      Belum ada catatan transaksi orang dalam terkini.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {trades.slice(0, 3).map((trade, idx) => {
                        const isBuy = trade.action === 'BUY';
                        const totalLots = Math.round((trade.shares || 0) / 100);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 shadow-xs space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                                    isBuy 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                  }`}>
                                    {isBuy ? '🟢 BELI' : '🔴 JUAL'}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white truncate" title={trade.name}>
                                    {trade.name}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {trade.role}
                                </div>
                              </div>
                              <span className="text-[9px] font-medium text-slate-400 shrink-0">{trade.date}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                              <span>Harga: <strong>Rp {(trade.price || item.price || 0).toLocaleString('id-ID')}</strong></span>
                              <span className={`font-black ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isBuy ? '+' : '-'}{totalLots.toLocaleString('id-ID')} Lot
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation (Horizontal Scrollable on Mobile) */}
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x pb-1">
        <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 w-max shadow-2xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setExpandedRow(null); }}
              className={`snap-start px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/20'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Description & Mobile Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
          {tabs.find(t => t.id === activeTab)?.desc}
        </p>

        {/* Mobile Sort Pills Bar */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] pb-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Urutkan:</span>
          {[
            { key: 'score', label: '⚡ Skor' },
            { key: 'price', label: '💵 Harga' },
            { key: 'dividendYield', label: '📈 Yield' },
            { key: 'cagr', label: '📊 CAGR' },
            { key: 'per', label: '🏷️ PER' },
          ].map(s => {
            const isActive = sortConfig.key === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleSort(s.key)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {s.label} {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 1. MOBILE CARD VIEW (Phone & Small Screens) ───────────────────── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-12"></div>
              </div>
              <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            </div>
          ))
        ) : error ? (
          <div className="p-6 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/30">
            ⚠️ {error}
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Tidak ada saham yang memenuhi kriteria screener ini.
          </div>
        ) : (
          sortedData.map((item, idx) => {
            const isExpanded = expandedRow === item.ticker;
            const safeChangePercent = Number.isFinite(item.changePercent) ? item.changePercent : 0;
            const cagrVal = item.metrics?.cagr;

            return (
              <div 
                key={item.ticker}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-all"
              >
                {/* Card Top: Rank, Ticker, Badges, Score */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{item.ticker.substring(0, 2)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-black text-base text-slate-900 dark:text-white">{item.ticker}</span>
                        {item.isSyariah && <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">🌙 Syariah</span>}
                        {item.hasStrongController && <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">👑 Pengendali</span>}
                        {item.isDividendTrap && <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">⚠️ Trap</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">{item.name || item.sector}</p>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <ScoreBadge score={item.score} />
                    {item.matchCount != null && (
                      <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                        ⭐ {item.matchCount}/4 Kriteria
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Metrics 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/60 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Harga Terkini</span>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        Rp {(item.price ?? 0).toLocaleString('id-ID')}
                      </span>
                      <span className={`text-[10px] font-bold ${safeChangePercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : safeChangePercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {safeChangePercent > 0 ? '+' : ''}{safeChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {activeTab === 'pick' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Div Yield / CAGR</span>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {(item.metrics?.dividendYield ?? 0).toFixed(1)}% <span className="text-slate-400 font-normal">|</span> {cagrVal != null ? `${cagrVal >= 0 ? '+' : ''}${Number(cagrVal).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'passive' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Div Yield / ROE</span>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {(item.metrics?.dividendYield ?? 0).toFixed(1)}% <span className="text-slate-400 font-normal">|</span> {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'dividend' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Yield / Payout</span>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {(item.metrics?.dividendYield ?? 0).toFixed(1)}% <span className="text-slate-400 font-normal">|</span> {item.metrics?.payoutRatio != null ? `${Number(item.metrics.payoutRatio).toFixed(0)}%` : '-'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'cheap' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">PER / PBV</span>
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {item.metrics?.per != null ? `${Number(item.metrics.per).toFixed(1)}x` : '-'} <span className="text-slate-400 font-normal">|</span> {item.metrics?.pbv != null ? `${Number(item.metrics.pbv).toFixed(1)}x` : '-'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'quality' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">PER / ROE</span>
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {item.metrics?.per != null ? `${Number(item.metrics.per).toFixed(1)}x` : '-'} <span className="text-slate-400 font-normal">|</span> {item.metrics?.roe != null ? `${Number(item.metrics.roe).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'potential' && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Volume Transaksi</span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.volume ? (Number(item.volume) / 10000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' Lot' : '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Badges row */}
                {item.matchedScreeners?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {item.matchedScreeners.map((sc, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 font-bold">
                        {sc}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800/60">
                  <button
                    onClick={() => setSelectedOwnershipStock(item)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1"
                  >
                    <span>👥</span> Struktur KSEI
                  </button>

                  <button
                    onClick={() => toggleRow(item.ticker)}
                    className="text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Tutup Detail ▲' : 'Buka Analisis ▼'}</span>
                  </button>
                </div>

                {/* Accordion Expandable Content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                    {renderItemDetails(item)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 2. DESKTOP & TABLET TABLE VIEW ───────────────────────────────── */}
      <div className="hidden md:block glass-panel overflow-hidden border border-slate-300 dark:border-white/10 rounded-2xl shadow-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800/30">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-20 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-10 bg-slate-100 dark:bg-slate-900">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-900">Saham</th>
                {renderTableHeaders()}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-4"></div></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10"></div>
                        <div>
                          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16 mb-2"></div>
                          <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-24"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16 ml-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-12 ml-auto"></div></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-12 ml-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-6 bg-slate-200 dark:bg-white/10 rounded-full w-10 mx-auto"></div></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-red-400">
                    ⚠️ {error}
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada saham yang memenuhi kriteria screener ini.
                  </td>
                </tr>
              ) : (
                sortedData.map((item, idx) => (
                  <Fragment key={item.ticker}>
                    <tr 
                      className="hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => toggleRow(item.ticker)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="text-xs font-bold text-indigo-400">{item.ticker.substring(0, 2)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white">{item.ticker}</span>
                              {item.isSyariah ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold" title="Saham Syariah (DES / ISSI)">
                                  🌙 Syariah
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 font-medium" title="Konvensional">
                                  Konvensional
                                </span>
                              )}
                              {item.isDividendTrap && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold" title="Peringatan: Potensi jebakan dividen">
                                  ⚠️ Div. Trap
                                </span>
                              )}
                              {item.hasStrongController && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold" title="Kepemilikan Pengendali > 50%">
                                  👑 Pengendali Kuat
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOwnershipStock(item);
                                }}
                                className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 font-bold transition-all flex items-center gap-1 shadow-sm"
                                title="Lihat Struktur & Riwayat Kepemilikan KSEI"
                              >
                                👥 Kepemilikan
                              </button>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 truncate max-w-[80px]">
                                {item.sector}
                              </span>
                              {item.metrics?.streakYears >= 5 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black flex items-center gap-0.5" title={`Rutin membagikan dividen ${item.metrics.streakYears} tahun berturut-turut`}>
                                  🏆 {item.metrics.streakYears}th Rutin
                                </span>
                              )}
                              {item.metrics?.streakYears >= 3 && item.metrics?.streakYears < 5 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold flex items-center gap-0.5" title={`Membagikan dividen ${item.metrics.streakYears} tahun berturut-turut`}>
                                  🎖️ {item.metrics.streakYears}th Rutin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px] sm:max-w-[200px]">
                                {item.name}
                              </div>
                              {item.fundamentals?.marketCap && (
                                <div className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800/30">
                                  MCap: {(item.fundamentals.marketCap / 1_000_000_000_000).toFixed(1)}T
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {renderRowCells(item)}
                    </tr>

                    {/* Expandable Details Row */}
                    {expandedRow === item.ticker && (
                      <tr>
                        <td colSpan="8" className="bg-slate-50 dark:bg-slate-900/60 px-4 py-4">
                          <div className="pl-12 animate-in slide-in-from-top-2 duration-300">
                            {renderItemDetails(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
 </tbody>
 </table>
 </div>
 </div>

 <StockOwnershipModal
   stock={selectedOwnershipStock}
   isOpen={Boolean(selectedOwnershipStock)}
   onClose={() => setSelectedOwnershipStock(null)}
 />
 </div>
 );
}
