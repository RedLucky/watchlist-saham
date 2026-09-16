'use client';

import React from 'react';

/**
 * Bloomberg BI & NSENT:
 * Bloomberg Intelligence AI Research Integration & News Sentiment Analysis
 */
export default function BloombergIntelligencePanel({
  aiResearch = null,
  newsSentiment = null,
  ticker = '',
  onOpenFullResearch = null
}) {
  if (!aiResearch && !newsSentiment) return null;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Bloomberg Intelligence (BI) & Sentimen Berita AI (NSENT)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                Bloomberg BI & NSENT
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Sintesis intelijen pasar AI, skor sentimen berita real-time (-100 s/d +100), dan katalis penggerak emiten {ticker}.
          </p>
        </div>

        {newsSentiment?.verdict && (
          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
            newsSentiment.badgeColor === 'emerald'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : newsSentiment.badgeColor === 'rose'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
          }`}>
            {newsSentiment.verdict}
          </span>
        )}
      </div>

      {/* Main Grid: Left = NSENT News Sentiment, Right = BI AI Research Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: News Sentiment Score (NSENT) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📰</span> Skor Sentimen Berita (NSENT)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {newsSentiment?.articlesCount || 0} Berita Dianalisis
              </span>
            </div>

            {newsSentiment ? (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Indeks Sentimen:</span>
                  <span className={`text-xl font-black font-mono ${
                    newsSentiment.score > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    newsSentiment.score < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'
                  }`}>
                    {newsSentiment.score > 0 ? `+${newsSentiment.score}` : newsSentiment.score} / 100
                  </span>
                </div>

                {/* Progress Bar from -100 to +100 */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.max(0, (newsSentiment.score + 100) / 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>-100 (Ekstrem Bearish)</span>
                    <span>0 (Netral)</span>
                    <span>+100 (Ekstrem Bullish)</span>
                  </div>
                </div>

                {/* Catalyst Tags */}
                {newsSentiment.catalystTags?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Katalis Pasar Terdeteksi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {newsSentiment.catalystTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Belum ada data berita untuk emiten ini.</p>
            )}
          </div>
        </div>

        {/* Right: Bloomberg Intelligence AI Dossier (BI) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📑</span> AI Research Dossier (BI)
              </span>
              {aiResearch?.buyHoldSell && (
                <span className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border uppercase tracking-wide ${
                  aiResearch.buyHoldSell === 'BUY'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
                    : aiResearch.buyHoldSell === 'SELL'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                }`}>
                  Konsensus: {aiResearch.buyHoldSell}
                </span>
              )}
            </div>

            {aiResearch ? (
              <div className="space-y-2 mt-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Valuasi & Proyeksi AI:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                    {aiResearch.valuation || 'Analisis valuasi konsensus fundamental emiten.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Tren & Momentum:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                    {aiResearch.trend || 'Tren akumulasi dan arah aliran dana emiten.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Riset AI komprehensif belum dibuat untuk emiten ini. Klik tombol di bawah untuk meminta pekerja AI menganalisis.
              </p>
            )}
          </div>

          {onOpenFullResearch && (
            <button
              onClick={onOpenFullResearch}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>✨</span> Buka Laporan Riset Bloomberg Intelligence Lengkap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

