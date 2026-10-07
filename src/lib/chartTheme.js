/**
 * Colours for the TradingView Lightweight Charts in StockChart, derived from the
 * "Bursa 1985" theme tokens (src/app/globals.css). The chart library needs plain colour
 * strings, so the tokens are read from CSS variables at runtime and turned into a palette.
 *
 * Indicator lines avoid extra hues: they use ink, muted and warn with different line
 * styles (solid / dashed / dotted), so green and red keep meaning "up" and "down".
 */

/** Token values used when CSS variables cannot be read (server render, tests). */
export const FALLBACK_TOKENS = {
  light: {
    ink: '#1a1a1a', muted: '#5e574b', line: '#d6ccb8', lineStrong: '#1a1a1a',
    up: '#2f6b3a', down: '#a3302a', warn: '#80580f', accent: '#1a1a1a',
  },
  dark: {
    ink: '#e8dfcc', muted: '#9c9384', line: '#2e2a22', lineStrong: '#6b6355',
    up: '#7bc96f', down: '#ff6b5a', warn: '#ffb000', accent: '#ffb000',
  },
};

const TOKEN_VARS = {
  ink: '--c-ink', muted: '--c-muted', line: '--c-line', lineStrong: '--c-line-strong',
  up: '--c-up', down: '--c-down', warn: '--c-warn', accent: '--c-accent',
};

/**
 * Adds transparency to a #rrggbb colour.
 * @param {string} hex - Colour like "#2f6b3a" (other formats are returned unchanged).
 * @param {number} alpha - 0–1.
 * @returns {string} "rgba(r, g, b, a)" or the input when it is not #rrggbb.
 */
export function withAlpha(hex, alpha) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Reads the current theme tokens from CSS variables on <html>.
 * Falls back to FALLBACK_TOKENS when not in a browser or a variable is empty.
 *
 * @param {boolean} isDark - Whether the dark theme is active.
 * @param {Element} [root] - Element to read variables from (defaults to document.documentElement).
 * @returns {typeof FALLBACK_TOKENS.light}
 */
export function readThemeTokens(isDark, root) {
  const fallback = isDark ? FALLBACK_TOKENS.dark : FALLBACK_TOKENS.light;
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
  const el = root || document.documentElement;
  const styles = getComputedStyle(el);
  const tokens = {};
  for (const [key, cssVar] of Object.entries(TOKEN_VARS)) {
    tokens[key] = styles.getPropertyValue(cssVar).trim() || fallback[key];
  }
  return tokens;
}

/**
 * Builds every colour the chart needs from theme tokens.
 *
 * @param {typeof FALLBACK_TOKENS.light} tokens
 * @returns {{
 *   text: string, grid: string, border: string,
 *   up: string, down: string, warn: string,
 *   volumeUp: string, volumeDown: string,
 *   ma20: string, ma50: string, ma200: string,
 *   bbBand: string, bbMid: string,
 *   rsi: string, rsiOverbought: string, rsiOversold: string,
 *   macd: string, macdSignal: string,
 * }}
 */
export function buildChartPalette(tokens) {
  return {
    text: tokens.muted,
    grid: withAlpha(tokens.line, 0.5),
    border: tokens.line,
    up: tokens.up,
    down: tokens.down,
    warn: tokens.warn,
    volumeUp: withAlpha(tokens.up, 0.35),
    volumeDown: withAlpha(tokens.down, 0.35),
    ma20: tokens.ink,
    ma50: tokens.muted,
    ma200: tokens.warn,
    bbBand: withAlpha(tokens.muted, 0.8),
    bbMid: withAlpha(tokens.muted, 0.5),
    rsi: tokens.ink,
    rsiOverbought: withAlpha(tokens.down, 0.6),
    rsiOversold: withAlpha(tokens.up, 0.6),
    macd: tokens.ink,
    macdSignal: tokens.warn,
  };
}

/**
 * Convenience: palette for the theme currently applied to the page.
 * @returns {ReturnType<typeof buildChartPalette>}
 */
export function getCurrentChartPalette() {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return buildChartPalette(readThemeTokens(isDark));
}
