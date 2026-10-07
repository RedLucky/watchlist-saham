import React, { useEffect, useRef, useState } from 'react';
import { splitMobileNav } from '@/lib/navigation';

const { primary: PRIMARY_ITEMS, more: MORE_ITEMS } = splitMobileNav();

/**
 * Slim mobile bottom bar (hidden on lg+): 4 pinned pages + "Lainnya".
 * "Lainnya" opens a bottom sheet with the remaining pages and account actions.
 * Bar height is 56px (plus the device safe area); every target is at least 44px tall.
 *
 * @param {object} props
 * @param {string} props.activeTab - Id of the open page.
 * @param {(id: string) => void} props.setActiveTab - Opens a page.
 * @param {{ name?: string }|null} props.user - Logged-in user.
 * @param {() => void} props.handleLogout - Logs out.
 * @param {boolean} props.kseiWarning - Last month's KSEI data is missing.
 */
export default function MobileNav({ activeTab, setActiveTab, user, handleLogout, kseiWarning }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreButtonRef = useRef(null);
  const sheetRef = useRef(null);
  const isMoreActive = MORE_ITEMS.some((item) => item.id === activeTab);

  // While the sheet is open: close on Escape, move focus into it, and stop the page behind
  // from scrolling. Focus returns to the "Lainnya" button when it closes.
  useEffect(() => {
    if (!isMoreOpen) return undefined;
    const trigger = moreButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector('button, a')?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isMoreOpen]);

  const openPage = (id) => {
    setActiveTab(id);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-5 h-14">
          {PRIMARY_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openPage(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative w-full h-full flex flex-col items-center justify-center gap-0.5 focus-ring ${
                    isActive ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {isActive && <span className="absolute top-0 inset-x-4 h-0.5 bg-accent" aria-hidden="true" />}
                  <span className="font-mono text-[17px] leading-none" aria-hidden="true">{item.icon}</span>
                  <span className={`text-[10px] leading-tight truncate max-w-full px-1 ${isActive ? 'font-semibold' : ''}`}>
                    {item.shortLabel}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setIsMoreOpen((open) => !open)}
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              className={`relative w-full h-full flex flex-col items-center justify-center gap-0.5 focus-ring ${
                isMoreActive || isMoreOpen ? 'text-ink' : 'text-muted'
              }`}
            >
              {isMoreActive && <span className="absolute top-0 inset-x-4 h-0.5 bg-accent" aria-hidden="true" />}
              <span className="relative font-mono text-[17px] leading-none" aria-hidden="true">
                ☰
                {kseiWarning && <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-warn" />}
              </span>
              <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-semibold' : ''}`}>Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop: tap to close */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setIsMoreOpen(false)}
            className="absolute inset-0 w-full h-full bg-black/40 cursor-default"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            className="absolute bottom-0 inset-x-0 bg-surface border-t border-line rounded-t-md max-h-[80vh] overflow-y-auto animate-fade-in"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            <div className="flex items-center justify-between px-4 h-12 rule-double">
              <p className="font-serif text-sm font-semibold text-ink">Menu Lainnya</p>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Tutup menu"
                className="w-9 h-9 -mr-2 rounded-sm text-muted hover:text-ink hover:bg-sunken flex items-center justify-center focus-ring"
              >
                <span className="font-mono" aria-hidden="true">×</span>
              </button>
            </div>

            <ul className="py-1">
              {MORE_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openPage(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full min-h-11 px-4 flex items-center gap-3 text-sm text-left focus-ring ${
                        isActive ? 'bg-sunken text-ink font-semibold' : 'text-ink hover:bg-sunken'
                      }`}
                    >
                      <span className="w-5 text-center font-mono text-[15px] text-muted" aria-hidden="true">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.id === 'ksei-upload' && kseiWarning && (
                        <span className="label-mono text-[9px] text-warn border border-warn px-1 py-px rounded-sm">Update</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mx-4 mt-1 pt-3 border-t border-line space-y-1">
              <a
                href="/admin/ksei"
                className="min-h-11 flex items-center gap-3 text-sm text-ink hover:underline focus-ring rounded-sm"
              >
                <span className="w-5 text-center font-mono text-muted" aria-hidden="true">⇪</span>
                <span>Kelola Data KSEI (Admin)</span>
              </a>
              {user && (
                <div className="min-h-11 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-sm bg-ink text-surface font-mono text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="text-sm text-ink truncate">{user?.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsMoreOpen(false); handleLogout(); }}
                    className="btn-secondary text-down"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
