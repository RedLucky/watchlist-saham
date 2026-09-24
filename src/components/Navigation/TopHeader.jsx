import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '../ThemeToggle';

export default function TopHeader({ user, handleLogout }) {
  const [kseiWarning, setKseiWarning] = useState(false);

  useEffect(() => {
    fetch('/api/ksei/periods')
      .then(res => res.json())
      .then(data => {
        const periods = data.periods || [];
        const now = new Date();
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonthNumStr = String(prevDate.getMonth() + 1).padStart(2, '0');
        const enShortMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const prevEngShort = enShortMonths[prevDate.getMonth()];
        const hasData = periods.some(p => {
          if (!p) return false;
          const str = String(p).toUpperCase();
          return str.includes(`${prevYear}-${prevMonthNumStr}`) || 
                 str.includes(`${prevEngShort}-${prevYear}`) || 
                 str.includes(`${prevEngShort} ${prevYear}`);
        });
        setKseiWarning(!hasData);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="lg:hidden sticky top-0 z-30 w-full bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="w-full px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left Side: Mobile Logo & Title */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 4 5-9"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                IDX Watchlist
              </h1>
              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 leading-none">Smart Analytics</p>
            </div>
          </div>

          {/* Right Side: ThemeToggle, KSEI Upload, User Profile & Logout */}
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
            {/* Dark / Light Mode Toggle Button */}
            <div className="flex items-center flex-shrink-0">
              <ThemeToggle />
            </div>

            {/* Upload KSEI Button */}
            <a
              href="/admin/ksei"
              className="relative text-[11px] font-bold p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-all flex items-center gap-1 flex-shrink-0 shadow-2xs"
              title="Kelola & Upload Data Kepemilikan KSEI Bulanan"
            >
              <span>🏛️</span>
              <span className="hidden sm:inline text-[10px]">KSEI</span>
              {kseiWarning && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
              )}
            </a>

            {/* User Profile & Logout Button */}
            {user && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 pl-1.5 pr-1 py-1 rounded-xl border border-slate-200 dark:border-white/10 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-black text-white text-[10px] flex-shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate max-w-[65px] hidden xs:inline">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-extrabold px-1.5 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex-shrink-0"
                  title="Keluar dari Akun"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
