/**
 * Maps trading values to "Bursa 1985" theme classes (see docs/wiki/en/architecture/design-system.md).
 * Keeping these mappings in one place means "buy" or "high risk" looks the same on every page.
 */

/**
 * Badge class for a Supertrend + DEMA signal.
 * BUY / STRONG_BUY → up, SELL / STRONG_SELL → down, anything else (HOLD, WAIT, …) → warn.
 *
 * @param {string|null|undefined} signal - Signal code from the API.
 * @returns {'badge-up'|'badge-down'|'badge-warn'}
 */
export function getSignalBadgeClass(signal) {
  const code = String(signal || '').toUpperCase();
  if (code === 'BUY' || code === 'STRONG_BUY') return 'badge-up';
  if (code === 'SELL' || code === 'STRONG_SELL') return 'badge-down';
  return 'badge-warn';
}

/**
 * Text and badge classes for a risk level label from the scoring engine.
 * Rendah (low) → up, Sedang (medium) → ink, Menengah (elevated) → warn, anything else → down.
 *
 * @param {string|null|undefined} level - "Rendah" | "Sedang" | "Menengah" | "Tinggi" | …
 * @returns {{ text: string, badge: string }}
 */
export function getRiskTone(level) {
  switch (level) {
    case 'Rendah': return { text: 'text-up', badge: 'badge-up' };
    case 'Sedang': return { text: 'text-ink', badge: '' };
    case 'Menengah': return { text: 'text-warn', badge: 'badge-warn' };
    default: return { text: 'text-down', badge: 'badge-down' };
  }
}

/**
 * Text class for a price change: positive → up, negative → down, zero/unknown → muted.
 *
 * @param {number|string|null|undefined} change - Change value or percentage.
 * @returns {'text-up'|'text-down'|'text-muted'}
 */
export function getChangeTone(change) {
  const n = Number(change);
  if (!Number.isFinite(n) || n === 0) return 'text-muted';
  return n > 0 ? 'text-up' : 'text-down';
}
