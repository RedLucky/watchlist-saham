'use client';

import React from 'react';
import { AutoGrid } from './AutoGrid';

/**
 * Compact key-figure card. Columns grow with the viewport, so a row of these fills the
 * width on a desktop instead of stopping at four fixed cards.
 *
 * The card is a <button> when `onClick` is given (e.g. clicking a filter summary) and a
 * plain <div> otherwise.
 *
 * @param {object} props
 * @param {string} props.label - Short mono label (e.g. "RATA-RATA DIV YIELD").
 * @param {React.ReactNode} props.value - Main figure.
 * @param {React.ReactNode} [props.hint] - Secondary line under the figure.
 * @param {'neutral'|'up'|'down'|'warn'|'accent'} [props.tone='neutral'] - Value colour.
 * @param {() => void} [props.onClick] - Makes the card clickable.
 * @param {string} [props.className] - Extra classes.
 */
export function StatCard({ label, value, hint, tone = 'neutral', onClick, className = '' }) {
  const toneClass = {
    neutral: 'text-ink',
    up: 'text-up',
    down: 'text-down',
    warn: 'text-warn',
    accent: 'text-accent',
  }[tone];

  const base = `card p-3 text-left w-full ${onClick ? 'hover:border-line-strong transition-colors cursor-pointer focus-ring' : ''} ${className}`;

  const body = (
    <>
      <p className="label-mono">{label}</p>
      <p className={`mt-1 text-lg sm:text-xl font-semibold font-mono tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

/**
 * Responsive card grid: columns are added automatically as the viewport grows, so the
 * layout uses the full content width instead of a fixed column count.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Cards.
 * @param {string} [props.minWidth='240px'] - Smallest column before wrapping.
 * @param {string} [props.className] - Extra classes.
 */
export function StatGrid({ children, minWidth = '240px', className = '' }) {
  return <AutoGrid minWidth={minWidth} className={className}>{children}</AutoGrid>;
}