import React from 'react';
import { ThemeToggle } from '../ThemeToggle';

export const NAVIGATION_MENU = [
  {
    category: 'Pasar & Analisis',
    items: [
      { id: 'watchlist', label: 'Analisis Saham', icon: '📊' },
      { id: 'explorer', label: 'Stock Explorer', icon: '🧭' },
      { id: 'movers', label: 'Market Movers', icon: '🔥' },
      { id: 'screener', label: 'Stock Screener', icon: '🔍' },
      { id: 'alpha-legend', label: 'Alpha Legends Screener', icon: '👑' },
    ]
  },
  {
    category: 'Alat & Manajemen',
    items: [
      { id: 'portfolio', label: 'Portofolio Saya', icon: '💼' },
      { id: 'backtest', label: 'Riwayat & Win Rate', icon: '📈' },
      { id: 'pension', label: 'Kalkulator Pensiun', icon: '🏖️' },
      { id: 'ksei-upload', label: 'Upload Data KSEI', icon: '🏛️' },
    ]
  }
];

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  syncInfo, 
  handleManualSync, 
  user, 
  handleLogout, 
  fetchData, 
  loading 
}) {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white/70 dark:bg-[#0a0f1a]/70 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/60 transition-colors z-40">
      {/* Brand / Logo Area */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 5-9" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              IDX Watchlist
            </h1>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">Analisis Saham Pintar</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {NAVIGATION_MENU.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {group.category}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer Area / Controls & Utilities */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 space-y-3 bg-slate-50/50 dark:bg-black/20">
        
        {/* Database Sync Status Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${syncInfo?.isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 leading-none">Yahoo Finance</span>
              <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold leading-tight truncate">
                {syncInfo?.isSyncing ? 'Syncing...' : (syncInfo?.stats?.lastSyncTime ? `Aktif (${new Date(syncInfo.stats.lastSyncTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : 'Aktif')}
              </span>
            </div>
          </div>
          <button 
            onClick={handleManualSync}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex-shrink-0"
            title="Paksa Sinkronisasi Data BEI"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6m12-4a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </button>
        </div>

        {/* Action Buttons: Refresh & Theme Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mode Gelap</span>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
            title="Segarkan data"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* User Profile Bar */}
        {user && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex-shrink-0"
              title="Keluar dari Akun"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
