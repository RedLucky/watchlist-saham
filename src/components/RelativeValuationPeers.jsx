'use client';

import React, { useMemo } from 'react';

export default function RelativeValuationPeers({
  currentStock,
  peers = [],
  onSelectTicker,
  onAddAllToCompare
}) {
  const f = currentStock?.fundamentals || {};
  const proj = currentStock?.projections || {};
  const scores = currentStock?.scores || {};

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
    if (!currentStock) return [];
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
    if (!currentStock || allPeers.length <= 1) {
      return `Belum ada data emiten pembanding langsung di sub-sektor ${currentStock?.subSector || currentStock?.sector || 'ini'}.`;
    }

    const current = allPeers[0];
    const insights = [];

    if (current.roe != null && stats.highestRoe != null) {
      if (current.roe === stats.highestRoe) {
        insights.push(`ROE tertinggi di antara kompetitor (${Number(current.roe).toFixed(1)}%) ★`);
      } else {
        insights.push(`ROE ${Number(current.roe).toFixed(1)}% (tertinggi: ${Number(stats.highestRoe).toFixed(1)}%)`);
      }
    }

    if (current.per != null && stats.medianPer != null) {
      if (current.per < stats.medianPer) {
        insights.push(`Valuasi PER ${Number(current.per).toFixed(1)}x berada di bawah median peers (${Number(stats.medianPer).toFixed(1)}x) ✦`);
      } else {
        insights.push(`Valuasi PER ${Number(current.per).toFixed(1)}x di atas median peers (${Number(stats.medianPer).toFixed(1)}x)`);
      }
    }

    if (current.dividendYield > 0 && stats.highestYield > 0) {
      if (current.dividendYield === stats.highestYield) {
        insights.push(`Dividend yield tertinggi (${Number(current.dividendYield).toFixed(1)}%) ¤`);
      } else {
        insights.push(`Yield dividen ${Number(current.dividendYield).toFixed(1)}%`);
      }
    }

    return insights.join(' • ');
  }, [allPeers, stats, currentStock]);

  if (!currentStock) return null;

  return (
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">▥</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Relative Valuation (RV) — Matriks Peers Sektor
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-warn-soft text-warn border border-warn uppercase tracking-wider">
                Bloomberg RV
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Komparasi valuasi & profitabilitas {currentStock.ticker} terhadap kompetitor di sektor <strong className="text-ink ">{currentStock.sector}</strong>
            {currentStock.subSector && <span> (Sub-sektor: <strong className="text-ink capitalize">{currentStock.subSector}</strong>)</span>}
          </p>
        </div>

        {onAddAllToCompare && allPeers.length > 1 && (
          <button
            onClick={() => onAddAllToCompare(allPeers.map(p => p.ticker))}
            className="px-3 py-1.5 bg-sunken hover:bg-sunken text-ink border border-line text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
            title="Buka seluruh saham pembanding di tab Komparasi Head-to-Head"
          >
            <span>⇄</span> Buka Komparasi Lengkap
          </button>
        )}
      </div>

      {/* Automated Relative Insight Banner */}
      <div className="p-3 rounded-sm bg-sunken border border-line flex items-center gap-2 text-xs text-ink ">
        <span className="text-sm flex-shrink-0">✦</span>
        <div className="flex-1 font-medium leading-relaxed">
          <span className="font-bold text-ink mr-1.5">Ringkasan Posisi Relatif:</span>
          {insight}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-sm border border-line ">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-sunken text-ink font-bold border-b border-line ">
              <th className="p-2.5 sm:p-3 min-w-[140px] sticky left-0 bg-sunken z-10">Emiten</th>
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
          <tbody className="divide-y divide-line text-ink ">
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
 ? 'bg-sunken font-semibold'
 : 'hover:bg-sunken '
 }`}
                >
                  {/* Ticker & Name */}
                  <td className={`p-2.5 sm:p-3 sticky left-0 z-10 ${isTarget ? 'bg-sunken ' : 'bg-surface '}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectTicker && onSelectTicker(p.ticker)}
                        className={`font-black hover:underline cursor-pointer flex items-center gap-1 ${
 isTarget ? 'text-ink ' : 'text-ink '
 }`}
                        title="Klik untuk menganalisis saham ini"
                      >
                        <span>{p.ticker}</span>
                        {isTarget && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent text-on-accent font-bold">
                            Target
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-muted truncate max-w-[130px]" title={p.name}>
                      {p.name}
                    </div>
                  </td>

                  {/* Price & Change */}
                  <td className="p-2.5 sm:p-3 text-right font-mono">
                    <div className="font-bold text-ink ">
                      Rp {p.price ? Number(p.price).toLocaleString('id-ID') : '-'}
                    </div>
                    {p.changePercent != null && (
                      <span className={`text-[10px] font-bold ${isUp ? 'text-up ' : 'text-down '}`}>
                        {isUp ? '+' : ''}{Number(p.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </td>

                  {/* Market Cap */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-ink ">
                    {p.marketCap ? `Rp ${(p.marketCap / 1e12).toFixed(1)} T` : '-'}
                  </td>

                  {/* PER */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestPer ? 'text-up font-black' : ''}`}>
                    {p.per != null ? `${Number(p.per).toFixed(1)}x` : '-'}
                    {isBestPer && <span className="ml-1 text-[10px]" title="PER Termurah">✦</span>}
                  </td>

                  {/* PBV */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestPbv ? 'text-up font-black' : ''}`}>
                    {p.pbv != null ? `${Number(p.pbv).toFixed(2)}x` : '-'}
                    {isBestPbv && <span className="ml-1 text-[10px]" title="PBV Termurah">◆</span>}
                  </td>

                  {/* ROE */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestRoe ? 'text-up font-black' : ''}`}>
                    {p.roe != null ? `${Number(p.roe).toFixed(1)}%` : '-'}
                    {isBestRoe && <span className="ml-1 text-[10px]" title="ROE Tertinggi">★</span>}
                  </td>

                  {/* NPM */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-ink ">
                    {p.npm != null ? `${Number(p.npm).toFixed(1)}%` : '-'}
                  </td>

                  {/* Dividend Yield */}
                  <td className={`p-2.5 sm:p-3 text-right font-mono ${isBestYield ? 'text-up font-black' : ''}`}>
                    {p.dividendYield > 0 ? `${Number(p.dividendYield).toFixed(1)}%` : '-'}
                    {isBestYield && <span className="ml-1 text-[10px]" title="Yield Tertinggi">¤</span>}
                  </td>

                  {/* DER */}
                  <td className="p-2.5 sm:p-3 text-right font-mono text-ink ">
                    {p.der != null ? Number(p.der).toFixed(2) : '-'}
                  </td>

                  {/* MoS Graham */}
                  <td className="p-2.5 sm:p-3 text-right font-mono">
                    {p.marginOfSafety != null ? (
                      <span className={`font-bold ${p.marginOfSafety >= 0 ? 'text-up ' : 'text-down '}`}>
                        {p.marginOfSafety >= 0 ? '+' : ''}{p.marginOfSafety}%
                      </span>
                    ) : '-'}
                  </td>

                  {/* Composite Score */}
                  <td className="p-2.5 sm:p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
 isBestScore
 ? 'bg-up text-on-accent shadow-xs'
 : (p.score || 0) >= 70
 ? 'bg-up-soft text-up '
 : (p.score || 0) >= 50
 ? 'bg-sunken text-ink '
 : 'bg-sunken text-ink '
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

