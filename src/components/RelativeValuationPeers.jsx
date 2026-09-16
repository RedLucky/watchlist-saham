'use client';

import React, { useMemo } from 'react';

export default function RelativeValuationPeers({
  currentStock,
  peers = [],
  onSelectTicker,
  onAddAllToCompare
}) {
  if (!currentStock) return null;

  const f = currentStock.fundamentals || {};
  const proj = currentStock.projections || {};
  const scores = currentStock.scores || {};

  // Use same 2-factor formula as backend peer scores (55% fundamental, 45% technical)
  // to ensure apple-to-apple comparison in the RV matrix
  const FUNDAMENTAL_WEIGHT = 0.55;
  const TECHNICAL_WEIGHT = 0.45;
  const currentCompositeScore = Math.round(
    ((scores.fundamental ?? 50) * FUNDAMENTAL_WEIGHT) +
    ((scores.technical ?? 50) * TECHNICAL_WEIGHT)
  );

  // Combine target stock and peers into a single comparison list
  const allPeers = useMemo(() => {
    const currentFormatted = {
      ticker: currentStock.ticker,
      name: currentStock.name,
      price: currentStock.price,
      changePercent: currentStock.changePercent,
      sector: currentStock.sector,
      subSector: currentStock.subSector,
      marketCap: f.marketCap || 0,
      per: f.per ?? null,
      pbv: f.pbv ?? null,
      roe: f.roe ?? null,
      npm: f.npm ?? null,
      der: f.der ?? null,
      dividendYield: f.dividendYield ?? 0,
      grahamNumber: proj.grahamNumber ?? 0,
      marginOfSafety: proj.marginOfSafety ?? null,
      score: currentCompositeScore,
      isTarget: true
    };

    return [currentFormatted, ...(peers || []).map(p => ({ ...p, isTarget: false }))];
  }, [currentStock, peers, f, proj, currentCompositeScore]);

  // Compute best-in-class values
  const stats = useMemo(() => {
    const validPer = allPeers.filter(p => p.per != null && p.per > 0).map(p => p.per);
    const validPbv = allPeers.filter(p => p.pbv != null && p.pbv > 0).map(p => p.pbv);
    const validRoe = allPeers.filter(p => p.roe != null).map(p => p.roe);
    const validYield = allPeers.filter(p => p.dividendYield != null).map(p => p.dividendYield);
    const validScores = allPeers.map(p => p.score || 0);

    return {
      lowestPer: validPer.length > 0 ? Math.min(...validPer) : null,
      lowestPbv: validPbv.length > 0 ? Math.min(...validPbv) : null,
      highestRoe: validRoe.length > 0 ? Math.max(...validRoe) : null,
      highestYield: validYield.length > 0 ? Math.max(...validYield) : null,
      highestScore: validScores.length > 0 ? Math.max(...validScores) : null,
      medianPer: validPer.length > 0 ? [...validPer].sort((a,b) => a-b)[Math.floor(validPer.length/2)] : null,
      medianPbv: validPbv.length > 0 ? [...validPbv].sort((a,b) => a-b)[Math.floor(validPbv.length/2)] : null,
    };
  }, [allPeers]);

  // Generate automated comparative insight
  const insight = useMemo(() => {
    if (allPeers.length <= 1) {
      return `Belum ada data emiten pembanding langsung di sub-sektor ${currentStock.subSector || currentStock.sector || 'ini'}.`;
    }

    const current = allPeers[0];
    const insights = [];

    if (current.roe != null && stats.highestRoe != null) {
      if (current.roe === stats.highestRoe) {
        insights.push(`ROE tertinggi di antara kompetitor (${Number(current.roe).toFixed(1)}%) 👑`);
      } else {
        insights.push(`ROE ${Number(current.roe).toFixed(1)}% (tertinggi: ${Number(stats.highestRoe).toFixed(1)}%)`);
      }
    }

    if (current.per != null && stats.medianPer != null) {
      if (current.per < stats.medianPer) {
        insights.push(`Valuasi PER ${Number(current.per).toFixed(1)}x berada di bawah median peers (${Number(stats.medianPer).toFixed(1)}x) ✨`);
      } else {
        insights.push(`Valuasi PER ${Number(current.per).toFixed(1)}x di atas median peers (${Number(stats.medianPer).toFixed(1)}x)`);
      }
    }

    if (current.dividendYield > 0 && stats.highestYield > 0) {
      if (current.dividendYield === stats.highestYield) {
        insights.push(`Dividend yield tertinggi (${Number(current.dividendYield).toFixed(1)}%) 💰`);
      } else {
        insights.push(`Yield dividen ${Number(current.dividendYield).toFixed(1)}%`);
      }
    }

    return insights.join(' • ');
  }, [allPeers, stats, currentStock]);

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Relative Valuation (RV) — Matriks Peers Sektor
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Bloomberg RV
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Komparasi valuasi & profitabilitas {currentStock.ticker} terhadap kompetitor di sektor <strong className="text-slate-700 dark:text-slate-300">{currentStock.sector}</strong>
            {currentStock.subSector && <span> (Sub-sektor: <strong className="text-slate-700 dark:text-slate-300 capitalize">{currentStock.subSector}</strong>)</span>}
          </p>
        </div>

        {onAddAllToCompare && allPeers.length > 1 && (
          <button
            onClick={() => onAddAllToCompare(allPeers.map(p => p.ticker))}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
            title="Buka seluruh saham pembanding di tab Komparasi Head-to-Head"
          >
            <span>⚖️</span> Buka Komparasi Lengkap
          </button>
        )}
      </div>

      {/* Automated Relative Insight Banner */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
        <span className="text-sm flex-shrink-0">💡</span>
        <div className="flex-1 font-medium leading-relaxed">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Ringkasan Posisi Relatif:</span>
          {insight}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-2.5 sm:p-3 min-w-[140px] sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">Emiten</th>
              <th className="p-2.5 sm:p-3 text-right">Harga (Rp)</th>
              <th className="p-2.5 sm:p-3 text-right">Market Cap</th>
              <th className="p-2.5 sm:p-3 text-right" title="Price to Earnings Ratio">PER (TTM)</th>
              <th className="p-2.5 sm:p-3 text-right" title="Price to Book Value">PBV</th>
              <th className="p-2.5 sm:p-3 text-right" title="Return on Equity">ROE (%)</th>
              <th className="p-2.5 sm:p-3 text-right" title="Net Profit Margin">NPM (%)</th>
              <th className="p-2.5 sm:p-3 text-right" title="Dividend Yield">Div Yield</th>
              <th className="p-2.5 sm:p-3 text-right" title="Debt to Equity Ratio">DER</th>
              <th className="p-2.5 sm:p-3 text-right" title="Margin of Safety Graham">MoS Graham</th>
              <th className="p-2.5 sm:p-3 text-center">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {allPeers.map((p) => {
              const isTarget = p.isTarget;
              const isUp = (p.changePercent || 0) >= 0;
              const isBestPer = p.per != null && p.per === stats.lowestPer && stats.lowestPer != null;
              const isBestPbv = p.pbv != null && p.pbv === stats.lowestPbv && stats.lowestPbv != null;
              const isBestRoe = p.roe != null && p.roe === stats.highestRoe && stats.highestRoe != null;
              const isBestYield = p.dividendYield != null && p.dividendYield === stats.highestYield && stats.highestYield > 0;
              const isBestScore = p.score === stats.highestScore && stats.highestScore != null;

              return (
                <tr
                  key={p.ticker}
                  className={`transition-colors ${
                    isTarget
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Ticker & Name */}
                  <td className={`p-2.5 sm:p-3 sticky left-0 z-10 ${isTarget ? 'bg-indigo-50 dark:bg-indigo-950/70' : 'bg-white dark:bg-slate-900'}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectTicker && onSelectTicker(p.ticker)}
                        className={`font-black hover:underline cursor-pointer flex items-center gap-1 ${
                          isTarget ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                        }`}
                        title="Klik untuk menganalisis saham ini"
                      >
                        <span>{p.ticker}</span>
                        {isTarget && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
                            Target
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]" title={p.name}>
                      {p.name}
                    </div>
                  </td>

                  {/* Price & Change */}
                  <td className="p-2.5 sm:p-3 text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Rp {p.price ? Number(p.price).toLocaleString('id-ID') : '-'}
                    </div>
                    {p.changePercent != null && (
                      <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isUp ? '+' : ''}{Number(p.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </td>

                  {/* Market Cap */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.marketCap ? `Rp ${(p.marketCap / 1e12).toFixed(1)} T` : '-'}
                  </td>

                  {/* PER */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestPer ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}`}>
                    {p.per != null ? `${Number(p.per).toFixed(1)}x` : '-'}
                    {isBestPer && <span className="ml-1 text-[10px]" title="PER Termurah">✨</span>}
                  </td>

                  {/* PBV */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestPbv ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}`}>
                    {p.pbv != null ? `${Number(p.pbv).toFixed(2)}x` : '-'}
                    {isBestPbv && <span className="ml-1 text-[10px]" title="PBV Termurah">💎</span>}
                  </td>

                  {/* ROE */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestRoe ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}`}>
                    {p.roe != null ? `${Number(p.roe).toFixed(1)}%` : '-'}
                    {isBestRoe && <span className="ml-1 text-[10px]" title="ROE Tertinggi">👑</span>}
                  </td>

                  {/* NPM */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.npm != null ? `${Number(p.npm).toFixed(1)}%` : '-'}
                  </td>

                  {/* Dividend Yield */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestYield ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}`}>
                    {p.dividendYield > 0 ? `${Number(p.dividendYield).toFixed(1)}%` : '-'}
                    {isBestYield && <span className="ml-1 text-[10px]" title="Yield Tertinggi">💰</span>}
                  </td>

                  {/* DER */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.der != null ? Number(p.der).toFixed(2) : '-'}
                  </td>

                  {/* MoS Graham */}
                  <td className="p-2.5 sm:p-3 text-right font-mono">
                    {p.marginOfSafety != null ? (
                      <span className={`font-bold ${p.marginOfSafety >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {p.marginOfSafety >= 0 ? '+' : ''}{p.marginOfSafety}%
                      </span>
                    ) : '-'}
                  </td>

                  {/* Composite Score */}
                  <td className="p-2.5 sm:p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                      isBestScore
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : (p.score || 0) >= 70
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : (p.score || 0) >= 50
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {p.score || 0}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

