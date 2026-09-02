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
    <header className="lg:hidden sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0a0f1a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 transition-colors">
      <div className="w-full px-3 py-2">
        <div className="flex items-center justify-between gap-1.5">
          {/* Left Side: Mobile Logo & Title */}
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 4 5-9"/>
              </svg>
            </div>
            <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              IDX Watchlist
            </h1>
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
              className="relative text-[11px] font-bold p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 transition-all flex items-center gap-1 flex-shrink-0"
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
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 pl-1.5 pr-1 py-1 rounded-lg border border-slate-200 dark:border-white/10 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white text-[10px] flex-shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate max-w-[65px] hidden xs:inline">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex-shrink-0"
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
