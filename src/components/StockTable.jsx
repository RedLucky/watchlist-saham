'use client';

import { useState } from 'react';
import ScoreBadge from './ScoreBadge';
import DetailPanel from './DetailPanel';
import Tooltip from './Tooltip';
import StockOwnershipModal from './StockOwnershipModal';

function SortIcon({ active, asc }) {
 return (
 <svg
 className={`w-3 h-3 ml-1 inline-block transition-transform ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'} ${active && asc ? 'rotate-180' : ''}`}
 viewBox="0 0 12 12"
 fill="currentColor"
 >
 <path d="M6 2l4 5H2z"/>
 </svg>
 );
}

export default function StockTable({ stocks, loading, mode, style }) {
 const [expandedTicker, setExpandedTicker] = useState(null);
 const [selectedOwnershipStock, setSelectedOwnershipStock] = useState(null);
 const [sortBy, setSortBy] = useState('score');
 const [sortAsc, setSortAsc] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterTab, setFilterTab] = useState('ALL');

 const formatPrice = (price) => {
 const value = Number(price);
 if (!Number.isFinite(value)) return '-';
 return new Intl.NumberFormat('id-ID').format(value);
 };

 const formatPercentFromPrice = (basePrice, nextPrice, withPlus = false) => {
 const base = Number(basePrice);
 const next = Number(nextPrice);
 if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(next)) return '-';
 const value = (((next - base) / base) * 100).toFixed(1);
 return withPlus ? `+${value}%` : `${value}%`;
 };

 const handleSort = (field) => {
 if (sortBy === field) {
 setSortAsc(!sortAsc);
 } else {
 setSortBy(field);
 setSortAsc(false);
 }
 };

 const sortedStocks = [...(stocks || [])].sort((a, b) => {
 let aVal, bVal;
 switch (sortBy) {
 case 'score': aVal = a.score; bVal = b.score; break;
 case 'ticker': aVal = a.ticker; bVal = b.ticker; break;
 case 'riskReward': aVal = a.riskReward; bVal = b.riskReward; break;
 case 'sector': aVal = a.sector; bVal = b.sector; break;
 default: aVal = a.score; bVal = b.score;
 }
 if (typeof aVal === 'string') {
 return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
 }
 return sortAsc ? aVal - bVal : bVal - aVal;
 });

 const filteredStocks = sortedStocks.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTicker = s.ticker?.toLowerCase().includes(q);
      const matchName = s.name?.toLowerCase().includes(q);
      const matchSector = s.sector?.toLowerCase().includes(q);
      if (!matchTicker && !matchName && !matchSector) return false;
    }
    if (filterTab === 'TOP_SCORE') return s.score >= 80;
    if (filterTab === 'BUY_SIGNAL') {
      const sig = s.supertrendDema?.signal;
      return sig === 'BUY' || sig === 'STRONG_BUY';
    }
    if (filterTab === 'HIGH_RR') return (s.riskReward || 0) >= 2.0;
    return true;
  });

 if (loading) {
 return (
 <div className="glass rounded-2xl overflow-hidden">
 <div className="p-5">
 <div className="space-y-3">
 {[1, 2, 3, 4, 5].map(i => (
 <div key={i} className="skeleton h-16 w-full"/>
 ))}
 </div>
 </div>
 </div>
 );
 }

 if (!stocks || stocks.length === 0) {
 return (
 <div className="glass rounded-2xl p-12 text-center">
 <div className="text-4xl mb-3">📊</div>
 <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Tidak ada saham yang sesuai kriteria</h3>
 <p className="text-sm text-slate-400 dark:text-slate-500">
 Coba ganti ke mode yang lebih longgar (misal: Pertumbuhan atau Seimbang) untuk melihat hasil.
 </p>
 </div>
 );
 }

 return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      {/* Header & Table Controls Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Pilihan Saham Teratas (Watchlist Rekomendasi)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Hasil komputasi algoritma multi-faktor, proyeksi Benjamin Graham, & sinyal tren IDX
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
              {filteredStocks.length} / {stocks.length} Saham
            </span>
          </div>
        </div>

        {/* Search Bar & Quick Filter Chips */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 Cari kode ticker, nama emiten, atau sektor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none]">
            {[
              { id: 'ALL', label: `Semua (${stocks.length})` },
              { id: 'TOP_SCORE', label: `⭐ Skor ≥ 80 (${stocks.filter(s => s.score >= 80).length})` },
              { id: 'BUY_SIGNAL', label: `🟢 Sinyal BUY (${stocks.filter(s => s.supertrendDema?.signal === 'BUY' || s.supertrendDema?.signal === 'STRONG_BUY').length})` },
              { id: 'HIGH_RR', label: `🎯 R:R ≥ 2.0 (${stocks.filter(s => (s.riskReward || 0) >= 2.0).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterTab(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  filterTab === f.id
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-transparent shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-16 gap-3 px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        <div className="col-span-3 cursor-pointer hover:text-slate-900 dark:text-white" onClick={() => handleSort('ticker')}>
          Saham <SortIcon active={sortBy === 'ticker'} asc={sortAsc} />
        </div>
        <div className="col-span-2 text-right">
          Harga Sekarang
        </div>
        <div className="col-span-1 text-center cursor-pointer hover:text-slate-900 dark:text-white" onClick={() => handleSort('score')}>
          <Tooltip term="score">Skor</Tooltip> <SortIcon active={sortBy === 'score'} asc={sortAsc} />
        </div>
        <div className="col-span-2 text-center">
          <Tooltip term="supertrendDema">Sinyal ST+DEMA</Tooltip>
        </div>
        <div className="col-span-2 text-right">
          <Tooltip term="entry">Area Beli</Tooltip>
        </div>
        <div className="col-span-2 text-right">
          <Tooltip term="target">Target Jual</Tooltip>
        </div>
        <div className="col-span-2 text-right">
          <Tooltip term="stopLoss">Stop Loss</Tooltip>
        </div>
        <div className="col-span-2 text-right cursor-pointer hover:text-slate-900 dark:text-white" onClick={() => handleSort('riskReward')}>
          <Tooltip term="riskLevel">Risiko</Tooltip> <SortIcon active={sortBy === 'riskReward'} asc={sortAsc} />
        </div>
      </div>

      {/* Empty Search Result */}
      {filteredStocks.length === 0 && (
        <div className="p-8 text-center space-y-2">
          <span className="text-3xl block">🔍</span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada saham yang sesuai pencarian atau filter</p>
          <button 
            onClick={() => { setSearchQuery(''); setFilterTab('ALL'); }} 
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer"
          >
            Reset Pencarian & Filter
          </button>
        </div>
      )}

      {/* Stock rows */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800/30">
        {filteredStocks.map((stock, index) => {
          const isExpanded = expandedTicker === stock.ticker;

          return (
            <div
              key={stock.ticker}
              className={`animate-fade-in stagger-${Math.min(index + 1, 10)}`}
              style={{ opacity: 0 }}
            >
 {/* Main row */}
 <div
 className={`stock-row grid grid-cols-2 sm:grid-cols-16 gap-3 sm:gap-3 px-4 sm:px-6 py-4 items-center ${
 isExpanded ? 'bg-slate-50 dark:bg-white/[0.02]' : ''
 }`}
 onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
 >
 {/* Stock info */}
 <div className="col-span-1 sm:col-span-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
 stock.score >= 85 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
 stock.score >= 70 ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30' :
 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
 }`}>
 {stock.ticker.substring(0, 2)}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-1.5 flex-wrap">
   <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">{stock.ticker}</span>
   <button
     onClick={(e) => {
       e.stopPropagation();
       setSelectedOwnershipStock(stock);
     }}
     className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold transition-all flex items-center gap-0.5 shadow-xs"
     title="Lihat Struktur & Riwayat Kepemilikan KSEI"
   >
     👥 Kepemilikan
   </button>
 </div>
 <div className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px] font-medium">{stock.name}</div>
 <div className="sm:hidden flex items-center gap-1.5 mt-1 flex-wrap">
   {stock.supertrendDema && (
     <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
       stock.supertrendDema.signal === 'STRONG_BUY' || stock.supertrendDema.signal === 'BUY'
         ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
         : stock.supertrendDema.signal === 'SELL'
         ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
         : 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30'
     }`}>
       {stock.supertrendDema.badge}
     </span>
   )}
   <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{stock.sector}</span>
 </div>
 <div className="sm:hidden text-xs text-slate-900 dark:text-white mt-1 font-extrabold font-mono">
   Harga: {formatPrice(stock.price)}
 </div>
 </div>
 </div>
 </div>

 {/* Current Price - hidden on mobile */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{formatPrice(stock.price)}</div>
 </div>

 {/* Score */}
 <div className="col-span-1 sm:col-span-1 flex justify-end sm:justify-center items-center gap-2">
 <ScoreBadge score={stock.score} />
 <svg
 className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 sm:hidden ${isExpanded ? 'rotate-180' : ''}`}
 viewBox="0 0 20 20"
 fill="currentColor"
 >
 <path fillRule="evenodd"d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"clipRule="evenodd"/>
 </svg>
 </div>

 {/* Mobile Key Trade Levels Bar */}
 <div className="sm:hidden col-span-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 grid grid-cols-3 gap-1.5 text-center text-[10px]">
   <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
     <span className="text-slate-500 dark:text-slate-400 block text-[9px] font-bold">Area Beli</span>
     <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-[10px]">{formatPrice(stock.entry.low)}–{formatPrice(stock.entry.high)}</span>
   </div>
   <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
     <span className="text-emerald-700 dark:text-emerald-400 block text-[9px] font-bold">Target</span>
     <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">{formatPrice(stock.target)}</span>
   </div>
   <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
     <span className="text-rose-700 dark:text-rose-400 block text-[9px] font-bold">Cut Loss ({stock.riskReward}:1)</span>
     <span className="font-extrabold text-rose-700 dark:text-rose-300 font-mono text-[10px]">{formatPrice(stock.stopLoss)}</span>
   </div>
 </div>

 {/* Sinyal Supertrend & DEMA */}
 <div className="hidden sm:flex sm:col-span-2 flex-col items-center justify-center text-center">
   {stock.supertrendDema ? (
     <div className="flex flex-col items-center">
       <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border shadow-xs ${
         stock.supertrendDema.signal === 'STRONG_BUY' || stock.supertrendDema.signal === 'BUY'
           ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
           : stock.supertrendDema.signal === 'SELL'
           ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
           : 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30'
       }`}>
         {stock.supertrendDema.badge}
       </span>
       <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[120px]">
         {stock.supertrendDema.label}
       </span>
     </div>
   ) : (
     <span className="text-xs text-slate-400">-</span>
   )}
 </div>

 {/* Entry Zone */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
 {formatPrice(stock.entry.low)} – {formatPrice(stock.entry.high)}
 </div>
 <div className="text-[10px] text-slate-600 dark:text-slate-400 capitalize font-medium">{stock.setup}</div>
 </div>

 {/* Target */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">{formatPrice(stock.target)}</div>
 <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">
 {formatPercentFromPrice(stock.price, stock.target, true)}
 </div>
 </div>

 {/* Stop Loss */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-extrabold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded leading-none inline-block mb-1 font-mono">
 {formatPrice(stock.stopLoss)}
 </div>
 <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-bold block">
 {formatPercentFromPrice(stock.price, stock.stopLoss)}
 </div>
 </div>

 {/* Risk Level */}
 <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-2">
 <span className={`text-sm font-black ${
 stock.riskLevel?.level === 'Rendah' ? 'text-emerald-700 dark:text-emerald-400' :
 stock.riskLevel?.level === 'Sedang' ? 'text-blue-700 dark:text-blue-400' :
 stock.riskLevel?.level === 'Menengah' ? 'text-amber-800 dark:text-amber-400' :
 'text-rose-700 dark:text-rose-400'
 }`}>
 {stock.riskReward}:1
 </span>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
 stock.riskLevel?.level === 'Rendah' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
 stock.riskLevel?.level === 'Sedang' ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400' :
 stock.riskLevel?.level === 'Menengah' ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' :
 'border-red-500/30 bg-red-500/10 text-rose-700 dark:text-rose-400'
 }`}>
 {stock.riskLevel?.level}
 </span>

 {/* Expand indicator */}
 <svg
 className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
 viewBox="0 0 20 20"
 fill="currentColor"
 >
 <path fillRule="evenodd"d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"clipRule="evenodd"/>
 </svg>
 </div>
 </div>

 {/* Expanded detail panel */}
 {isExpanded && (
 <div className="relative z-10 border-t border-slate-200 dark:border-slate-800/20 bg-slate-50/50 dark:bg-white/[0.01]">
 <DetailPanel stock={stock} mode={mode} styleName={style} />
 </div>
 )}
 </div>
 );
 })}
 </div>

 <StockOwnershipModal
   stock={selectedOwnershipStock}
   isOpen={Boolean(selectedOwnershipStock)}
   onClose={() => setSelectedOwnershipStock(null)}
 />
 </div>
 );
}
