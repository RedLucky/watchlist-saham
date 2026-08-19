"use client";

import * as React from"react";
import { useTheme } from"next-themes";

export function ThemeToggle() {
 const { theme, setTheme, resolvedTheme } = useTheme();
 const [mounted, setMounted] = React.useState(false);

 React.useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) {
 return <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse"></div>;
 }

 const isDark = resolvedTheme ==="dark";

 return (
    <button
      onClick={() => setTheme(isDark ?"light":"dark")}
      className="p-2 rounded-full hover:bg-slate-100 dark:bg-white/5 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white flex items-center justify-center border border-slate-300 dark:border-white/10"
      title={`Switch to ${isDark ?"light":"dark"} mode`}
    >
 {isDark ? (
 <svg xmlns="http://www.w3.org/2000/svg"width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="12"cy="12"r="4"></circle>
 <path d="M12 2v2"></path>
 <path d="M12 20v2"></path>
 <path d="m4.93 4.93 1.41 1.41"></path>
 <path d="m17.66 17.66 1.41 1.41"></path>
 <path d="M2 12h2"></path>
 <path d="M20 12h2"></path>
 <path d="m6.34 17.66-1.41 1.41"></path>
 <path d="m19.07 4.93-1.41 1.41"></path>
 </svg>
 ) : (
 <svg xmlns="http://www.w3.org/2000/svg"width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
 </svg>
 )}
 </button>
 );
}
