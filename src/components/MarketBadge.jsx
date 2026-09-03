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

  const isUp = market.index?.trend === 'up' || (market.index?.change || 0) > 0;
  const isDown = market.index?.trend === 'down' || (market.index?.change || 0) < 0;

  const trendLabel = isUp ? 'Bullish Uptrend' : isDown ? 'Bearish Correction' : 'Konsolidasi Stagnan';

  const advance = Number(market.advanceDecline?.advance) || 0;
  const decline = Number(market.advanceDecline?.decline) || 0;
  const unchanged = Number(market.advanceDecline?.unchanged) || 0;
  const totalStocks = advance + decline + unchanged || 1;
  const advanceRatio = Math.round((advance / totalStocks) * 100);
  const declineRatio = Math.round((decline / totalStocks) * 100);

  const isBullishDominant = advance >= decline;

  return (
    <div className="space-y-3">
      {/* 4-Card Executive Market Cockpit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: IHSG Index & Momentum */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              🏛️ Indeks Acuan BEI
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUp ? 'bg-emerald-400' : isDown ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isUp ? 'bg-emerald-500' : isDown ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatNumber(market.index?.value)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                {market.index?.name || 'IHSG Composite'}
              </div>
            </div>

            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-2xs ${
              isUp 
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                : isDown 
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' 
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
            }`}>
              <span>{isUp ? '▲' : isDown ? '▼' : '■'}</span>
              <span>{formatPercent(market.index?.change)}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Status Arah:</span>
            <span className={`font-extrabold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {trendLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Market Breadth (Kedalaman Pasar) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ⚖️ Kedalaman Pasar
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
              isBullishDominant 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              {isBullishDominant ? 'Dominan Beli' : 'Tekanan Jual'}
            </span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex my-2 border border-slate-200/60 dark:border-slate-700/60">
            <div 
              style={{ width: `${advanceRatio}%` }} 
              className="bg-emerald-500 transition-all duration-500" 
              title={`${advanceRatio}% Emiten Menguat`}
            />
            <div 
              style={{ width: `${declineRatio}%` }} 
              className="bg-rose-500 transition-all duration-500" 
              title={`${declineRatio}% Emiten Melemah`}
            />
          </div>

          {/* Numbers breakdown */}
          <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold mt-2">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <span className="block font-black font-mono text-xs">{advance}</span>
              <span className="text-[9px]">Naik</span>
            </div>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400">
              <span className="block font-black font-mono text-xs">{decline}</span>
              <span className="text-[9px]">Turun</span>
            </div>
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className="block font-black font-mono text-xs">{unchanged}</span>
              <span className="text-[9px]">Tetap</span>
            </div>
          </div>
        </div>

        {/* Card 3: Likuiditas & Aktivitas Transaksi */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              💧 Likuiditas Pasar
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
              Real-time
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {market.volume?.vsAverage ? `${market.volume.vsAverage > 0 ? '+' : ''}${market.volume.vsAverage}%` : 'Normal'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Volume vs Rata-rata 3 Bulan
              </div>
            </div>
            <span className="text-2xl">📊</span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Aktivitas Transaksi:</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
              {(market.volume?.vsAverage || 0) > 10 ? 'Partisipasi Tinggi' : 'Partisipasi Moderat'}
            </span>
          </div>
        </div>

        {/* Card 4: Rezim Strategi AI (Auto-Detected) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-cyan-50/30 to-white dark:from-indigo-950/40 dark:via-cyan-950/20 dark:to-slate-900/90 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              🤖 Rekomendasi Rezim AI
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
              Aktif
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{market.autoMode?.emoji || '🎯'}</span>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {market.autoMode?.label || 'Strategi Seimbang'}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium line-clamp-1">
                {market.autoMode?.description || 'Optimalkan rasio valuasi dan momentum'}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-[10px] text-indigo-900 dark:text-indigo-200 font-bold flex items-center justify-between">
            <span>Actionable Setup:</span>
            <span className="underline decoration-indigo-400">Fokus Swing Emiten Top</span>
          </div>
        </div>

      </div>
    </div>
  );
}
