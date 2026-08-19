'use client';

export default function MarketBadge({ market }) {
 if (!market) return null;

 const formatNumber = (value, digits = 2) => {
 const n = Number(value);
 if (!Number.isFinite(n)) return '-';
 return n.toLocaleString('id-ID', {
 minimumFractionDigits: 0,
 maximumFractionDigits: digits,
 });
 };

 const formatPercent = (value) => {
 const n = Number(value);
 if (!Number.isFinite(n)) return '-';
 const sign = n > 0 ? '+' : '';
 return `${sign}${n.toFixed(2)}%`;
 };

 const trendLabel = market.index?.trend === 'up'
 ? 'Menguat'
 : market.index?.trend === 'down'
 ? 'Melemah'
 : 'Stagnan';

 const getTrendStyle = (trend) => {
 switch (trend) {
 case 'up': return { icon: '▲', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
 case 'down': return { icon: '▼', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
 default: return { icon: '■', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
 }
 };

 const trendStyle = getTrendStyle(market.index?.trend);

 return (
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Indeks Pasar</div>
 <div className="flex items-baseline gap-3">
 <span className="text-2xl font-bold text-slate-900 dark:text-white">{market.index?.name}</span>
 <span className="text-xl font-semibold text-slate-900 dark:text-white">
 {formatNumber(market.index?.value)}
 </span>
 </div>
 <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Status: {trendLabel}</div>
 </div>

 <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${trendStyle.bg} border ${trendStyle.border}`}>
 <span className={`text-lg ${trendStyle.color}`}>{trendStyle.icon}</span>
 <span className={`text-lg font-bold ${trendStyle.color}`}>
 {formatPercent(market.index?.change)}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50 overflow-x-auto whitespace-nowrap pb-1">
 <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
 <span className="text-emerald-400 text-xs">▲</span>
 <span className="text-sm text-slate-400 dark:text-slate-500">
 {market.advanceDecline?.advance} menguat
 </span>
 </div>
 <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
 <span className="text-red-400 text-xs">▼</span>
 <span className="text-sm text-slate-400 dark:text-slate-500">
 {market.advanceDecline?.decline} melemah
 </span>
 </div>
 <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
 <span className="text-slate-400 text-xs">■</span>
 <span className="text-sm text-slate-400 dark:text-slate-500">
 {market.advanceDecline?.unchanged} stagnan
 </span>
 </div>
 </div>
 </div>
 );
}
