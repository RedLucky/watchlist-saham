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
 <div className="glass rounded-2xl overflow-hidden">
 {/* Header */}
 <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800/50">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
 Pilihan Teratas
 <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
 {stocks.length} saham
 </span>
 </h2>
 <span className="text-xs text-slate-500 dark:text-slate-400">Klik saham untuk detail</span>
 </div>
 </div>

 {/* Table header */}
 <div className="hidden sm:grid grid-cols-14 gap-4 px-4 sm:px-6 py-3 bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-200 dark:border-slate-800/30 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 <div className="col-span-3 cursor-pointer hover:text-slate-900 dark:text-white"onClick={() => handleSort('ticker')}>
 Saham <SortIcon active={sortBy === 'ticker'} asc={sortAsc} />
 </div>
 <div className="col-span-2 text-right">
 Harga Sekarang
 </div>
 <div className="col-span-1 text-center cursor-pointer hover:text-slate-900 dark:text-white"onClick={() => handleSort('score')}>
 <Tooltip term="score">Skor</Tooltip> <SortIcon active={sortBy === 'score'} asc={sortAsc} />
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
 <div className="col-span-2 text-right cursor-pointer hover:text-slate-900 dark:text-white"onClick={() => handleSort('riskReward')}>
 <Tooltip term="riskLevel">Risiko</Tooltip> <SortIcon active={sortBy === 'riskReward'} asc={sortAsc} />
 </div>
 </div>

 {/* Stock rows */}
 <div className="divide-y divide-slate-200 dark:divide-slate-800/30">
 {sortedStocks.map((stock, index) => {
 const isExpanded = expandedTicker === stock.ticker;

 return (
 <div
 key={stock.ticker}
 className={`animate-fade-in stagger-${Math.min(index + 1, 10)}`}
 style={{ opacity: 0 }}
 >
 {/* Main row */}
 <div
 className={`stock-row grid grid-cols-2 sm:grid-cols-14 gap-3 sm:gap-4 px-4 sm:px-6 py-4 items-center ${
 isExpanded ? 'bg-slate-50 dark:bg-white/[0.02]' : ''
 }`}
 onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
 >
 {/* Stock info */}
 <div className="col-span-1 sm:col-span-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
 stock.score >= 85 ? 'bg-emerald-500/10 text-emerald-400' :
 stock.score >= 70 ? 'bg-blue-500/10 text-blue-400' :
 'bg-slate-500/10 text-slate-400'
 }`}>
 {stock.ticker.substring(0, 2)}
 </div>
 <div>
 <div className="flex items-center gap-2">
   <span className="font-semibold text-slate-900 dark:text-white text-sm">{stock.ticker}</span>
   <button
     onClick={(e) => {
       e.stopPropagation();
       setSelectedOwnershipStock(stock);
     }}
     className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 font-bold transition-all flex items-center gap-1 shadow-sm"
     title="Lihat Struktur & Riwayat Kepemilikan KSEI"
   >
     👥 Kepemilikan
   </button>
 </div>
 <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{stock.name}</div>
 <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400">{stock.sector}</div>
 <div className="sm:hidden text-xs text-slate-900 dark:text-white mt-0.5">
 Harga: {formatPrice(stock.price)}
 </div>
 </div>
 </div>
 </div>

 {/* Current Price - hidden on mobile */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatPrice(stock.price)}</div>
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

 {/* Entry - hidden on mobile */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-medium text-slate-900 dark:text-white">
 {formatPrice(stock.entry.low)} – {formatPrice(stock.entry.high)}
 </div>
 <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{stock.setup}</div>
 </div>

 {/* Target */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-medium text-emerald-400">{formatPrice(stock.target)}</div>
 <div className="text-[10px] text-emerald-400/60">
 {formatPercentFromPrice(stock.price, stock.target, true)}
 </div>
 </div>

 {/* Stop Loss */}
 <div className="hidden sm:block sm:col-span-2 text-right">
 <div className="text-sm font-medium text-red-600 dark:text-red-300 bg-red-500/10 px-2 py-0.5 rounded leading-none inline-block mb-1">
 {formatPrice(stock.stopLoss)}
 </div>
 <div className="text-[10px] text-red-400/60 block">
 {formatPercentFromPrice(stock.price, stock.stopLoss)}
 </div>
 </div>

 {/* Risk Level */}
 <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-2">
 <span className={`text-sm font-medium ${
 stock.riskLevel?.level === 'Rendah' ? 'text-emerald-400' :
 stock.riskLevel?.level === 'Sedang' ? 'text-blue-400' :
 stock.riskLevel?.level === 'Menengah' ? 'text-amber-400' :
 'text-red-400'
 }`}>
 {stock.riskReward}:1
 </span>
 <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
 stock.riskLevel?.level === 'Rendah' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
 stock.riskLevel?.level === 'Sedang' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' :
 stock.riskLevel?.level === 'Menengah' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
 'border-red-500/20 bg-red-500/10 text-red-400'
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
