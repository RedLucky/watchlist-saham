'use client';

import React from 'react';

function formatPreviewSnippet(rawText) {
  if (!rawText) return '';
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !/^(\-{3,}|\*{3,}|_{3,})$/.test(l));

  if (lines.length === 0) return '';

  return lines
    .join(' ')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+[-*•]\s+/g, '; ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">◈</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Bloomberg Intelligence (BI) & Sentimen Berita AI (NSENT)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
                Bloomberg BI & NSENT
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Sintesis intelijen pasar AI, skor sentimen berita real-time (-100 s/d +100), dan katalis penggerak emiten {ticker}.
          </p>
        </div>

        {newsSentiment?.verdict && (
          <span className={`px-3 py-1 rounded-sm text-xs font-black uppercase tracking-wide border self-start sm:self-auto ${
 newsSentiment.badgeColor === 'emerald'
 ? 'bg-up-soft text-up border-up '
 : newsSentiment.badgeColor === 'rose'
 ? 'bg-down-soft text-down border-down '
 : 'bg-sunken text-ink border-line '
 }`}>
            {newsSentiment.verdict}
          </span>
        )}
      </div>

      {/* Main Grid: Left = NSENT News Sentiment, Right = BI AI Research Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: News Sentiment Score (NSENT) */}
        <div className="p-4 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>▤</span> Skor Sentimen Berita (NSENT)
              </span>
              <span className="text-[11px] font-mono text-muted">
                {newsSentiment?.articlesCount || 0} Berita Dianalisis
              </span>
            </div>

            {newsSentiment ? (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Indeks Sentimen:</span>
                  <span className={`text-xl font-black font-mono ${
 newsSentiment.score > 0 ? 'text-up ' :
 newsSentiment.score < 0 ? 'text-down ' : 'text-muted'
 }`}>
                    {newsSentiment.score > 0 ? `+${newsSentiment.score}` : newsSentiment.score} / 100
                  </span>
                </div>

                {/* Progress Bar from -100 to +100 */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-sunken rounded-full overflow-hidden flex">
                    <div
                      className="bg-up transition-all duration-300"
                      style={{ width: `${Math.max(0, (newsSentiment.score + 100) / 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>-100 (Ekstrem Bearish)</span>
                    <span>0 (Netral)</span>
                    <span>+100 (Ekstrem Bullish)</span>
                  </div>
                </div>

                {/* Catalyst Tags */}
                {newsSentiment.catalystTags?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Katalis Pasar Terdeteksi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {newsSentiment.catalystTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs font-semibold rounded-md bg-surface border border-line text-ink "
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted mt-2">Belum ada data berita untuk emiten ini.</p>
            )}
          </div>
        </div>

        {/* Right: Bloomberg Intelligence AI Dossier (BI) */}
        <div className="p-4 rounded-sm bg-sunken border border-line flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>▤</span> AI Research Dossier (BI)
              </span>
              {aiResearch?.buyHoldSell && (
                <span className={`px-2.5 py-0.5 text-[11px] font-black rounded-sm border uppercase tracking-wide ${
 aiResearch.buyHoldSell === 'BUY'
 ? 'bg-up-soft text-up border-up'
 : aiResearch.buyHoldSell === 'SELL'
 ? 'bg-down-soft text-down border-down'
 : 'bg-warn-soft text-warn border-warn'
 }`}>
                  Konsensus: {aiResearch.buyHoldSell}
                </span>
              )}
            </div>

            {aiResearch ? (
              <div className="space-y-2 mt-3">
                <div className="p-2.5 rounded-sm bg-surface border border-line text-xs">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                    Valuasi & Proyeksi AI:
                  </span>
                  <p className="text-ink mt-0.5 line-clamp-2 leading-relaxed">
                    {formatPreviewSnippet(aiResearch.valuation) || 'Analisis valuasi konsensus fundamental emiten.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-sm bg-surface border border-line text-xs">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                    Tren & Momentum:
                  </span>
                  <p className="text-ink mt-0.5 line-clamp-2 leading-relaxed">
                    {formatPreviewSnippet(aiResearch.trend) || 'Tren akumulasi dan arah aliran dana emiten.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted mt-2">
                Riset AI komprehensif belum dibuat untuk emiten ini. Klik tombol di bawah untuk meminta pekerja AI menganalisis.
              </p>
            )}
          </div>

          {onOpenFullResearch && (
            <button
              onClick={onOpenFullResearch}
              className="btn-secondary w-full"
            >
              <span>✦</span> Buka Laporan Riset Bloomberg Intelligence Lengkap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

