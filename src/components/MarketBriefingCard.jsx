'use client';

/**
 * @fileoverview Executive Market Briefing Card for Stock Analysis Page.
 * Synthesizes index movement, market breadth, foreign flow, and liquidity
 * into 4 clear executive takeaways and actionable tactical advice.
 * Follows Bursa 1985 design token guidelines strictly.
 */

import React from 'react';

/**
 * Maps briefing tone to semantic Bursa 1985 badge and text classes.
 *
 * @param {string} tone - Semantic tone ('up' | 'down' | 'warn' | 'ink' | 'muted').
 * @returns {{ badgeClass: string, textClass: string, indicatorIcon: string }} Token classes.
 */
function getToneMeta(tone) {
  switch (tone) {
    case 'up':
      return {
        badgeClass: 'bg-up-soft text-up border-up',
        textClass: 'text-up',
        indicatorIcon: '▲',
      };
    case 'down':
      return {
        badgeClass: 'bg-down-soft text-down border-down',
        textClass: 'text-down',
        indicatorIcon: '▼',
      };
    case 'warn':
      return {
        badgeClass: 'bg-warn-soft text-warn border-warn',
        textClass: 'text-warn',
        indicatorIcon: '◆',
      };
    default:
      return {
        badgeClass: 'bg-sunken text-muted border-line',
        textClass: 'text-ink',
        indicatorIcon: '■',
      };
  }
}

/**
 * Renders the Executive Market Briefing card.
 *
 * @param {object} props - Component props.
 * @param {object} props.briefing - Market briefing object from GET /api/market.
 * @returns {React.ReactElement|null} Executive market briefing card.
 */
export default function MarketBriefingCard({ briefing }) {
  if (!briefing || !Array.isArray(briefing.keyPoints) || briefing.keyPoints.length === 0) {
    return null;
  }

  const sentimentMeta = getToneMeta(briefing.sentimentTone);

  return (
    <div className="bg-surface border border-line rounded-md p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Header with Title and Summary Badge */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted" aria-hidden="true">§</span>
            <h3 className="label-mono">Ringkasan Perkembangan Pasar Hari Ini</h3>
          </div>
          <p className="font-serif text-base sm:text-lg font-semibold text-ink mt-0.5">
            {briefing.headline}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-sm border ${sentimentMeta.badgeClass}`}>
            <span aria-hidden="true" className="mr-1">{sentimentMeta.indicatorIcon}</span>
            {briefing.summaryBadge || 'Analisis Pasar'}
          </span>
        </div>
      </div>

      {/* 4 Executive Key Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {briefing.keyPoints.map((item, idx) => {
          const itemMeta = getToneMeta(item.tone);
          const isTactical = idx === briefing.keyPoints.length - 1;

          return (
            <div
              key={item.category || idx}
              className={`p-3 rounded-sm border ${
                isTactical
                  ? 'bg-sunken border-line md:col-span-2'
                  : 'bg-surface border-line'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                  <span className={itemMeta.textClass} aria-hidden="true">
                    {itemMeta.indicatorIcon}
                  </span>
                  <span>{item.category}</span>
                </span>
                {isTactical && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-surface border border-line text-muted">
                    Rekomendasi AI
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed ${isTactical ? 'text-ink font-medium' : 'text-ink'}`}>
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

