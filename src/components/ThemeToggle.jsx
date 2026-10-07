"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/** No-op subscription: the "is mounted" value never changes after hydration. */
function subscribeNoop() {
  return () => {};
}

/**
 * Button that switches between the light ("Kertas Bursa") and dark ("Terminal Fosfor")
 * themes. The first visit follows the device setting (defaultTheme="system" in layout.js);
 * clicking stores an explicit choice.
 *
 * @returns {JSX.Element}
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  // The resolved theme is only known in the browser: `mounted` is false during server
  // rendering and hydration, true afterwards. Render a placeholder until then to avoid
  // a hydration mismatch.
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-sm border border-line bg-sunken" aria-hidden="true"></div>;
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-sm border border-line bg-surface text-ink hover:bg-sunken transition-colors flex items-center justify-center focus-ring"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>
      )}
    </button>
  );
}
