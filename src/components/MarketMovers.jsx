'use client';

// ── Formatting Helpers ────────────────────────────────────────────────────────

const formatPrice = (price) => {
 const value = Number(price);
 if (!Number.isFinite(value)) return '-';
 return new Intl.NumberFormat('id-ID').format(value);
};

/** Format volume (lembar saham) seperti RTI: 459,9jt / 12,3jt / 800rb */
const formatVolume = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v) || v <= 0) return '-';
 if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
 if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}jt`;
 if (v >= 1_000) return `${(v / 1_000).toFixed(1)}rb`;
 return v.toLocaleString('id-ID');
};

/** Format turnover (nilai IDR) — T / M / jt */
const formatTurnover = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v) || v <= 0) return '-';
 if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}T`;
 if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
 if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
 return v.toLocaleString('id-ID');
};

const formatPercent = (val) => {
 const v = Number(val);
 if (!Number.isFinite(v)) return '-';
 const sign = v > 0 ? '+' : '';
 return `${sign}${v.toFixed(2)}%`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Format absolute price change: +125 / -50 */
const formatPriceChange = (price, prevClose) => {
 const diff = Number(price) - Number(prevClose);
 if (!Number.isFinite(diff) || diff === 0) return null;
 const sign = diff > 0 ? '+' : '';
 return `${sign}${formatPrice(diff)}`;
};

function MoverRow({ item, type, index }) {
 const isTrending = type === 'trending';
 const isGainer = type === 'gainers';
 const isUnusual = type === 'unusual';

 const pct = Number(item.changePercent);
 const changeColor =
 pct > 0 ? 'text-emerald-400' :
 pct < 0 ? 'text-red-400' : 'text-slate-500 dark:text-slate-400';

 const pctBg =
 pct > 0 ? 'bg-emerald-500/10 border-emerald-500/20' :
 pct < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5';

 // Avatar color per type
 const avatarStyle = isTrending
 ? 'from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-300'
 : isGainer
 ? 'from-emerald-500/15 to-teal-500/15 text-emerald-300'
 : isUnusual
 ? 'from-cyan-500/15 to-blue-500/15 text-cyan-300'
 : 'from-red-500/15 to-rose-500/15 text-red-300';

 const priceChange = formatPriceChange(item.price, item.prevClose);

 return (
 <div
 className={`grid grid-cols-12 items-center gap-2 py-2.5 px-3 rounded-lg
 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors duration-150 group
 animate-fade-in stagger-${Math.min(index + 1, 10)}`}
 style={{ opacity: 0 }}
 >
 {/* Rank */}
 <div className="col-span-1 text-xs text-slate-500 dark:text-slate-400 font-mono text-right pr-1 tabular-nums">
 {index + 1}
 </div>

 {/* Avatar + Ticker + Name */}
 <div className="col-span-4 flex items-center gap-2.5 min-w-0">
 <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarStyle}
 flex items-center justify-center text-[11px] font-bold shrink-0`}>
 {item.ticker.substring(0, 2)}
 </div>
 <div className="min-w-0">
 <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">
 {item.ticker}
 </div>
 <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
 {item.name}
 </div>
 </div>
 </div>

 {/* Volume (lembar) — metric utama Trending & info tambahan */}
 <div className="col-span-3 text-right">
 <div className="text-[12px] font-mono text-slate-400 dark:text-slate-500 leading-tight">
 {formatVolume(item.volume)}
 </div>
 <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
 {isUnusual && item.volumeRatio
 ? <span className="text-cyan-400 font-bold">{item.volumeRatio}x avg</span>
 : formatTurnover(item.turnover)
 }
 </div>
 </div>

 {/* Harga + Perubahan + % */}
 <div className="col-span-4 text-right">
 <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight tabular-nums">
 {formatPrice(item.price)}
 </div>
 <div className="flex items-center justify-end gap-1.5 mt-0.5">
 {priceChange && (
 <span className={`text-[11px] font-mono ${changeColor} leading-tight tabular-nums`}>
 {priceChange}
 </span>
 )}
 <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${pctBg} ${changeColor} leading-tight inline-block`}>
 {formatPercent(item.changePercent)}
 </span>
 </div>
 </div>
 </div>
 );
}

function MoverCard({ title, subtitle, icon, items, type, accentGradient, borderColor, loading }) {
 return (
 <div className={`glass rounded-2xl overflow-hidden flex flex-col border ${borderColor}`}
 style={{ minHeight: 0 }}
 >
 {/* Header */}
 <div className={`px-5 py-3.5 shrink-0 bg-gradient-to-r ${accentGradient} border-b border-slate-200 dark:border-white/5`}>
 <div className="flex items-center gap-2.5">
 <span className="text-lg leading-none">{icon}</span>
 <div>
 <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</p>
 </div>
 {!loading && (
 <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-mono">
 Top {items.length}
 </span>
 )}
 </div>

 {/* Column labels */}
 {!loading && items.length > 0 && (
 <div className="grid grid-cols-12 gap-2 mt-2.5 px-3">
 <div className="col-span-1"/>
 <div className="col-span-4 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Saham</div>
 <div className="col-span-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Vol / Nilai</div>
 <div className="col-span-4 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Harga / ± / %</div>
 </div>
 )}
 </div>

 {/* Scrollable Body */}
 <div className="overflow-y-auto flex-1 px-3 py-1.5"
 style={{ maxHeight: '480px', scrollbarWidth: 'thin' }}
 >
 {loading ? (
 Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="grid grid-cols-12 items-center gap-2 py-2.5 px-3">
 <div className="col-span-1 skeleton h-3.5 w-5 rounded"/>
 <div className="col-span-4 flex items-center gap-2.5">
 <div className="skeleton w-8 h-8 rounded-lg shrink-0"/>
 <div className="space-y-1.5 flex-1">
 <div className="skeleton h-3.5 w-14 rounded"/>
 <div className="skeleton h-2.5 w-24 rounded"/>
 </div>
 </div>
 <div className="col-span-3 space-y-1 text-right">
 <div className="skeleton h-3 w-14 rounded ml-auto"/>
 <div className="skeleton h-2.5 w-12 rounded ml-auto"/>
 </div>
 <div className="col-span-4 space-y-1 text-right">
 <div className="skeleton h-3 w-14 rounded ml-auto"/>
 <div className="skeleton h-3 w-16 rounded ml-auto"/>
 </div>
 </div>
 ))
 ) : items.length === 0 ? (
 <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
 Belum ada data tersedia
 </div>
 ) : (
 items.map((item, i) => (
 <MoverRow key={item.ticker} item={item} type={type} index={i} />
 ))
 )}
 </div>
 </div>
 );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function MarketMovers({ data, loading }) {
 return (
 <section className="space-y-2">
 {/* Section Label */}
 <div className="flex items-center gap-2">
 <div className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 shrink-0"/>
 <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
 Market Movers Hari Ini
 </h2>
 <span className="text-[10px] text-slate-500 dark:text-slate-400">(data real-time dari BEI)</span>
 </div>

 {/* 2-column grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <MoverCard
 title="Top Trending"
 subtitle="Saham paling aktif diperdagangkan (volume lembar)"
 icon="🔥"
 type="trending"
 items={data?.trending ?? []}
 loading={loading}
 accentGradient="from-amber-500/5 to-orange-500/5"
 borderColor="border-amber-500/15"
 />
 <MoverCard
 title="Top Gainer"
 subtitle="Kenaikan % harga tertinggi hari ini"
 icon="🚀"
 type="gainers"
 items={data?.gainers ?? []}
 loading={loading}
 accentGradient="from-emerald-500/5 to-teal-500/5"
 borderColor="border-emerald-500/15"
 />
 <MoverCard
 title="Top Loser"
 subtitle="Penurunan % harga terdalam hari ini"
 icon="📉"
 type="losers"
 items={data?.losers ?? []}
 loading={loading}
 accentGradient="from-red-500/5 to-rose-500/5"
 borderColor="border-red-500/15"
 />
 <MoverCard
 title="Unusual Volume"
 subtitle="Volume transaksi jauh di atas rata-rata 3 bulan"
 icon="⚡"
 type="unusual"
 items={data?.unusualVolume ?? []}
 loading={loading}
 accentGradient="from-cyan-500/5 to-blue-500/5"
 borderColor="border-cyan-500/15"
 />
 </div>
 </section>
 );
}
