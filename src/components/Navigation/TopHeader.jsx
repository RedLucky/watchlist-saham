import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { findMenuItem } from '@/lib/navigation';

/**
 * Compact sticky header for mobile and tablet (hidden on lg+, where the sidebar shows).
 * Shows the brand, the name of the open page and the theme toggle. Account actions
 * (KSEI, logout) live in the "Lainnya" sheet of the bottom bar.
 *
 * @param {object} props
 * @param {string} props.activeTab - Id of the open page (used for the title).
 */
export default function TopHeader({ activeTab }) {
  const page = findMenuItem(activeTab);

  return (
    <header className="lg:hidden sticky top-0 z-30 w-full bg-surface border-b border-line">
      <div className="h-12 px-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-sm border border-line-strong flex items-center justify-center text-ink" aria-hidden="true">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 5-9" />
            </svg>
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-serif text-sm font-semibold text-ink truncate">IDX Watchlist</p>
            {page && <p className="label-mono text-[9px] truncate">{page.label}</p>}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
