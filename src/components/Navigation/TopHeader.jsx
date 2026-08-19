import React from 'react';

export default function TopHeader({ user, handleLogout }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0f1a]/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 transition-colors">
      <div className="w-full px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 4 5-9"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                IDX Watchlist
              </h1>
            </div>
          </div>

          <div className="hidden lg:block flex-1"></div>

          {/* Right Side: ONLY User Info & Logout Button */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 flex-shrink-0 ml-auto">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px] sm:max-w-none">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex-shrink-0"
                title="Keluar dari Akun"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
