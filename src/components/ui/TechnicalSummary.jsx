'use client';

import React, { useState } from 'react';

/**
 * Collapsible block for secondary detail ("Ringkasan Teknis"): keeps the main page short
 * while the information stays one click away. Closed by default.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - Summary line shown on the collapsed bar.
 * @param {React.ReactNode} [props.badge] - Small mono label on the bar (e.g. "6 METRIK").
 * @param {React.ReactNode} props.children - Detail content, rendered only when open.
 * @param {boolean} [props.defaultOpen=false] - Start expanded.
 */
export function TechnicalSummary({ title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border border-line rounded-sm bg-surface">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full min-h-11 px-3 py-2 flex items-center justify-between gap-3 text-left hover:bg-sunken transition-colors focus-ring rounded-sm"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-muted text-xs" aria-hidden="true">{open ? '−' : '+'}</span>
          <span className="label-mono truncate">{title}</span>
          {badge}
        </span>
        <span className="text-[11px] text-muted shrink-0">{open ? 'Sembunyikan' : 'Tampilkan'}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-3 animate-fade-in">{children}</div>}
    </section>
  );
}