/**
 * App navigation config and small pure helpers shared by the desktop sidebar,
 * the mobile header and the mobile bottom bar.
 *
 * Icons are Unicode symbols (not emoji) so they follow the text colour of the
 * "Bursa 1985" theme. "\uFE0E" forces text presentation where a glyph also has
 * an emoji form.
 */

/** Menu groups shown in the sidebar, in display order. */
export const NAVIGATION_MENU = [
  {
    category: 'Pasar & Analisis',
    items: [
      { id: 'watchlist', label: 'Analisis Saham', shortLabel: 'Analisis', icon: '▤' },
      { id: 'explorer', label: 'Stock Explorer', shortLabel: 'Explorer', icon: '◎' },
      { id: 'movers', label: 'Market Movers', shortLabel: 'Movers', icon: '⇅' },
      { id: 'screener', label: 'Stock Screener', shortLabel: 'Screener', icon: '⌕' },
      { id: 'alpha-legend', label: 'Alpha Legends Screener', shortLabel: 'Legends', icon: '♛\uFE0E' },
      { id: 'corporate-calendar', label: 'Kalender Aksi Korporasi', shortLabel: 'Kalender', icon: '▦' },
      { id: 'ai-chat', label: 'Konsultasi AI', shortLabel: 'Konsultasi', icon: '◈' },
    ],
  },
  {
    category: 'Alat & Manajemen',
    items: [
      { id: 'portfolio', label: 'Portofolio Saya', shortLabel: 'Portofolio', icon: '▣' },
      { id: 'backtest', label: 'Riwayat & Win Rate', shortLabel: 'Win Rate', icon: '↗\uFE0E' },
      { id: 'pension', label: 'Kalkulator Pensiun', shortLabel: 'Pensiun', icon: '◷' },
      { id: 'ksei-upload', label: 'Upload Data KSEI', shortLabel: 'KSEI', icon: '⇪' },
    ],
  },
];

/** Menu ids pinned to the mobile bottom bar; everything else goes under "Lainnya". */
export const MOBILE_PRIMARY_IDS = ['watchlist', 'explorer', 'screener', 'portfolio'];

/**
 * Flattens the grouped menu into one list, keeping display order.
 * @param {typeof NAVIGATION_MENU} [menu=NAVIGATION_MENU]
 * @returns {Array<{ id: string, label: string, shortLabel: string, icon: string }>}
 */
export function flattenMenu(menu = NAVIGATION_MENU) {
  return menu.flatMap((group) => group.items);
}

/**
 * Splits the menu into the items pinned on the mobile bottom bar and the rest
 * (shown in the "Lainnya" sheet). Primary items follow the order of `primaryIds`.
 *
 * @param {typeof NAVIGATION_MENU} [menu=NAVIGATION_MENU]
 * @param {string[]} [primaryIds=MOBILE_PRIMARY_IDS]
 * @returns {{ primary: ReturnType<typeof flattenMenu>, more: ReturnType<typeof flattenMenu> }}
 */
export function splitMobileNav(menu = NAVIGATION_MENU, primaryIds = MOBILE_PRIMARY_IDS) {
  const items = flattenMenu(menu);
  const primary = primaryIds
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);
  const more = items.filter((item) => !primaryIds.includes(item.id));
  return { primary, more };
}

/**
 * Finds the menu item for a tab id (used for the mobile page title).
 * @param {string} id - Active tab id.
 * @param {typeof NAVIGATION_MENU} [menu=NAVIGATION_MENU]
 * @returns {{ id: string, label: string, shortLabel: string, icon: string } | null}
 */
export function findMenuItem(id, menu = NAVIGATION_MENU) {
  return flattenMenu(menu).find((item) => item.id === id) || null;
}

const EN_SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Whether KSEI ownership data for the previous calendar month has been uploaded.
 * Period labels come from /api/ksei/periods and may look like "2026-09-30",
 * "SEP-2026" or "SEP 2026", so all three formats are accepted.
 *
 * @param {Array<string|null>} periods - Stored period labels.
 * @param {Date} [now=new Date()] - Reference date (injectable for tests).
 * @returns {boolean} True when last month's data exists.
 */
export function hasPreviousMonthKseiData(periods, now = new Date()) {
  if (!Array.isArray(periods)) return false;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const monthNum = String(prev.getMonth() + 1).padStart(2, '0');
  const monthShort = EN_SHORT_MONTHS[prev.getMonth()];
  return periods.some((p) => {
    if (!p) return false;
    const label = String(p).toUpperCase();
    return label.includes(`${year}-${monthNum}`)
      || label.includes(`${monthShort}-${year}`)
      || label.includes(`${monthShort} ${year}`);
  });
}
