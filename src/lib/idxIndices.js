/**
 * Static reference data for the IDX indices this app tracks.
 * Membership itself is stored in the database (see prisma/schema.prisma); this file only
 * holds the stable metadata so the UI can explain each index even before the first sync.
 */

/** The five indices tracked, in display order. */
export const TRACKED_INDICES = [
  {
    code: 'LQ45',
    name: 'LQ45',
    description: '45 saham dengan kapitalisasi besar dan likuiditas tertinggi di BEI.',
  },
  {
    code: 'IDX30',
    name: 'IDX30',
    description: '30 perusahaan berkapitalisasi besar, likuid, dengan fundamental baik.',
  },
  {
    code: 'IDXVALUE30',
    name: 'IDX Value 30',
    description: '30 saham dengan valuasi relatif murah dibanding sektor sejenisnya.',
  },
  {
    code: 'HIDV20',
    name: 'High Dividend 20',
    description: '20 saham dengan tingkat dividen kas tertinggi dan konsisten.',
  },
  {
    code: 'ISSI',
    name: 'ISSI (Syariah)',
    description: 'Indeks saham yang memenuhi prinsip pengelolaan dana syariah.',
  },
];

/** Codes that must be tracked, used by the sync script and the admin upload. */
export const TRACKED_INDEX_CODES = TRACKED_INDICES.map((i) => i.code);

/** Membership older than this many days is shown as "stale" in the UI. */
export const STALE_AFTER_DAYS = 60;

/**
 * Normalises and validates an index code coming from a URL or form.
 *
 * @param {string} code - Raw code, e.g. "lq45".
 * @returns {string} Upper-case tracked code, e.g. "LQ45".
 * @throws {Error} When the code is not one of the tracked indices.
 */
export function assertIndexCode(code) {
  const normalised = String(code || '').trim().toUpperCase();
  if (!TRACKED_INDEX_CODES.includes(normalised)) {
    throw new Error(
      `Kode indeks "${code}" tidak dikenal. Yang tersedia: ${TRACKED_INDEX_CODES.join(', ')}`,
    );
  }
  return normalised;
}

/**
 * Normalises and validates a single stock ticker.
 *
 * @param {string} ticker - Raw ticker, e.g. " bbca ".
 * @returns {string} Upper-case ticker, e.g. "BBCA".
 * @throws {Error} When the ticker is empty or not a valid IDX symbol.
 */
export function assertTicker(ticker) {
  const normalised = String(ticker || '').trim().toUpperCase();
  if (!/^[A-Z]{1,6}$/.test(normalised)) {
    throw new Error(`Ticker "${ticker}" tidak valid. Gunakan kode saham IDX, contoh: BBCA`);
  }
  return normalised;
}

/**
 * Whether the stored membership is old enough to warn the user.
 * @param {Date|string|number|null|undefined} lastSyncedAt
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isStaleSync(lastSyncedAt, now = new Date()) {
  if (!lastSyncedAt) return true;
  const date = lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) return true;
  const days = (now.getTime() - date.getTime()) / 86_400_000;
  return days > STALE_AFTER_DAYS;
}

/**
 * Groups ticker → index codes and index code → tickers, from a flat membership list.
 *
 * @param {Array<{ indexCode: string, ticker: string }>} rows - Flat membership rows.
 * @returns {{ byTicker: Record<string, string[]>, byIndex: Record<string, string[]> }}
 */
export function buildMembershipMaps(rows = []) {
  /** @type {Record<string, string[]>} */
  const byTicker = {};
  /** @type {Record<string, string[]>} */
  const byIndex = {};
  for (const row of rows) {
    if (!row?.ticker || !row?.indexCode) continue;
    (byTicker[row.ticker] ||= []).push(row.indexCode);
    (byIndex[row.indexCode] ||= []).push(row.ticker);
  }
  for (const map of [byTicker, byIndex]) {
    for (const key of Object.keys(map)) map[key].sort();
  }
  return { byTicker, byIndex };
}

/**
 * Parses pasted/uploaded membership text into rows.
 * Accepts one ticker per line, or `INDEX_CODE<TAB or comma>TICKER` per line.
 * Lines starting with # and empty lines are ignored.
 *
 * @param {string} text - Raw text from an admin upload.
 * @returns {Array<{ indexCode: string, ticker: string }>}
 * @throws {Error} When a ticker is not a valid IDX symbol.
 */
export function parseMembershipText(text, { defaultIndex } = {}) {
  const rows = [];
  const invalid = [];

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/[\t,;]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    let indexCode;
    let ticker;
    if (parts.length >= 2) {
      [indexCode, ticker] = parts;
    } else {
      indexCode = defaultIndex;
      ticker = parts[0];
    }

    if (!indexCode || !ticker) continue;
    const normalisedCode = indexCode.toUpperCase();
    const normalisedTicker = ticker.toUpperCase();
    if (!TRACKED_INDEX_CODES.includes(normalisedCode)) {
      invalid.push(`${line} (kode indeks tidak dikenal)`);
      continue;
    }
    if (!/^[A-Z]{1,6}$/.test(normalisedTicker)) {
      invalid.push(`${line} (ticker tidak valid)`);
      continue;
    }
    rows.push({ indexCode: normalisedCode, ticker: normalisedTicker });
  }

  if (invalid.length > 0) {
    throw new Error(`Baris tidak valid: ${invalid.slice(0, 5).join('; ')}${invalid.length > 5 ? ' …' : ''}`);
  }
  return rows;
}