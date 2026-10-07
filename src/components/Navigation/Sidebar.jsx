import React, { useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { NAVIGATION_MENU } from '@/lib/navigation';

const COLLAPSE_STORAGE_KEY = 'sidebar-collapsed';

/**
 * Reads the saved collapsed state. The sidebar only renders after the client-side
 * auth check, so reading localStorage here cannot cause a hydration mismatch.
 * @returns {boolean}
 */
function readCollapsed() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch (err) {
    // Storage can be blocked (private mode); fall back to expanded.
    console.warn('[Sidebar] Cannot read collapsed state', err);
    return false;
  }
}

/**
 * Desktop navigation (lg and up) in the "Bursa 1985" style: flat, hairline borders,
 * mono labels. Can be collapsed to an icon-only rail; the choice is remembered.
 *
 * @param {object} props
 * @param {string} props.activeTab - Id of the open page.
 * @param {(id: string) => void} props.setActiveTab - Opens a page.
 * @param {object|null} props.syncInfo - Result of GET /api/sync.
 * @param {() => void} props.handleManualSync - Forces a price sync.
 * @param {{ name?: string }|null} props.user - Logged-in user.
 * @param {() => void} props.handleLogout - Logs out.
 * @param {() => void} props.fetchData - Reloads dashboard data.
 * @param {boolean} props.loading - Dashboard data is loading.
 * @param {boolean} props.kseiWarning - Last month's KSEI data is missing.
 */
export default function Sidebar({
  activeTab,
  setActiveTab,
  syncInfo,
  handleManualSync,
  user,
  handleLogout,
  fetchData,
  loading,
  kseiWarning,
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        console.warn('[Sidebar] Cannot save collapsed state', err);
      }
      return next;
    });
  };

  const lastSync = syncInfo?.stats?.lastSyncTime
    ? new Date(syncInfo.stats.lastSyncTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;
  const syncLabel = syncInfo?.isSyncing ? 'Sinkronisasi...' : lastSync ? `Aktif · ${lastSync} WIB` : 'Aktif';

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 shrink-0 bg-surface border-r border-line z-40 transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      aria-label="Navigasi utama"
    >
      {/* Brand */}
      <div className={`flex items-center h-14 border-b border-line ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
        <div className="w-8 h-8 shrink-0 rounded-sm border border-line-strong flex items-center justify-center text-ink" aria-hidden="true">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 5-9" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-serif text-[15px] font-semibold leading-tight text-ink truncate">IDX Watchlist</p>
            <p className="label-mono text-[10px] truncate">Bursa · Analitik</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAVIGATION_MENU.map((group) => (
          <div key={group.category}>
            {collapsed ? (
              <div className="mx-3 mb-2 border-t border-line" aria-hidden="true" />
            ) : (
              <h3 className="label-mono px-4 mb-1.5">{group.category}</h3>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const showKseiBadge = item.id === 'ksei-upload' && kseiWarning;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`relative w-full flex items-center h-9 rounded-sm text-[13px] transition-colors focus-ring ${
                        collapsed ? 'justify-center' : 'gap-2.5 px-2.5'
                      } ${
                        isActive
                          ? 'bg-sunken text-ink font-semibold'
                          : 'text-muted hover:text-ink hover:bg-sunken'
                      }`}
                    >
                      {/* Active marker: thin accent bar on the left edge */}
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent" aria-hidden="true" />}
                      <span className="w-5 text-center font-mono text-[15px] leading-none shrink-0" aria-hidden="true">{item.icon}</span>
                      {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                      {showKseiBadge && (
                        collapsed ? (
                          <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-warn" aria-label="Data KSEI bulan lalu belum diunggah" />
                        ) : (
                          <span className="label-mono text-[9px] text-warn border border-warn px-1 py-px rounded-sm shrink-0">Update</span>
                        )
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: sync status, theme, refresh, user */}
      <div className={`border-t border-line ${collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2.5'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              aria-label={`Sinkronisasi Yahoo Finance (${syncLabel})`}
              title={`Yahoo Finance: ${syncLabel}`}
              className="w-9 h-9 rounded-sm border border-line flex items-center justify-center hover:bg-sunken focus-ring"
            >
              <span className={`w-2 h-2 rounded-full ${syncInfo?.isSyncing ? 'bg-warn animate-pulse' : 'bg-up'}`} aria-hidden="true" />
            </button>
            <ThemeToggle />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm bg-sunken">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${syncInfo?.isSyncing ? 'bg-warn animate-pulse' : 'bg-up'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="label-mono text-[9px] leading-none">Yahoo Finance</p>
                  <p className="text-[11px] font-medium text-ink truncate tabular-nums">{syncLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                aria-label="Paksa sinkronisasi data BEI"
                title="Paksa sinkronisasi data BEI"
                className="w-7 h-7 rounded-sm text-muted hover:text-ink hover:bg-surface flex items-center justify-center focus-ring"
              >
                <span className="font-mono text-sm" aria-hidden="true">↻</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-xs text-muted">Tema</span>
              </div>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="btn-secondary min-h-9 px-2.5"
                title="Segarkan data"
              >
                <span className={`font-mono ${loading ? 'animate-spin' : ''}`} aria-hidden="true">↻</span>
                <span>Refresh</span>
              </button>
            </div>
          </>
        )}

        {user && (
          <div className={`flex items-center pt-2 border-t border-line ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
            <div className="flex items-center gap-2 min-w-0" title={collapsed ? user?.name : undefined}>
              <span className="w-7 h-7 rounded-sm bg-ink text-surface font-mono text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
              {!collapsed && <span className="text-xs font-medium text-ink truncate">{user?.name}</span>}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar dari akun"
              title="Keluar dari akun"
              className="text-[11px] font-medium text-down hover:underline px-1.5 py-1 rounded-sm focus-ring shrink-0"
            >
              {collapsed ? <span className="font-mono" aria-hidden="true">⏻</span> : 'Logout'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
          aria-expanded={!collapsed}
          className={`w-full h-8 flex items-center rounded-sm text-[11px] text-muted hover:text-ink hover:bg-sunken focus-ring ${collapsed ? 'justify-center' : 'gap-2 px-2.5'}`}
        >
          <span className="font-mono" aria-hidden="true">{collapsed ? '»' : '«'}</span>
          {!collapsed && <span>Ciutkan</span>}
        </button>
      </div>
    </aside>
  );
}
