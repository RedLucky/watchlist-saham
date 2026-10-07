'use client';

import React from 'react';

/**
 * Standard container for a whole page: full available width (no max-width cap) with a
 * consistent vertical rhythm, so every page lines up the same way.
 *
 * Horizontal gutters are owned by the page container (`<main>` in Dashboard), which is why
 * this adds no padding of its own — double padding would misalign PageToolbar.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Page content.
 * @param {string} [props.className] - Extra classes.
 */
export function PageShell({ children, className = '' }) {
  return <div className={`w-full space-y-5 ${className}`}>{children}</div>;
}

/**
 * Page heading: serif title over a newspaper double rule, an optional subtitle and an
 * optional actions area on the right.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - Page title.
 * @param {React.ReactNode} [props.subtitle] - One line explaining the page.
 * @param {React.ReactNode} [props.badge] - Small mono label next to the title (e.g. "REALTIME").
 * @param {React.ReactNode} [props.actions] - Buttons or controls shown on the right.
 */
export function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <header className="rule-double pb-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </header>
  );
}

/**
 * Sticky control bar for search, filters and view switches. Controls come before results,
 * and they stay reachable while scrolling a long table.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Controls.
 * @param {React.ReactNode} [props.meta] - Right-aligned counts or status text.
 */
export function PageToolbar({ children, meta }) {
  return (
    <div className="sticky top-12 lg:top-0 z-20 -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 py-2 bg-canvas border-b border-line">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">{children}</div>
        {meta && <div className="flex items-center gap-2 shrink-0">{meta}</div>}
      </div>
    </div>
  );
}

/**
 * Title for a block of content, with an optional right-aligned note.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Heading text.
 * @param {React.ReactNode} [props.note] - Right-aligned note.
 * @param {string} [props.level='2'] - Heading level for document outline.
 */
export function SectionTitle({ children, note, level = 2 }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2.5">
      <Heading className="section-title">{children}</Heading>
      {note && <span className="text-[11px] text-muted shrink-0">{note}</span>}
    </div>
  );
}