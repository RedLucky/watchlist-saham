/**
 * Syncs IDX index membership (LQ45, IDX30, IDXValue30, HIDV20, ISSI) into the database.
 *
 * Run with:  node src/scripts/sync-indices.js
 *
 * Design notes:
 * - IDX publishes constituents per index on its statistics pages and as downloadable files.
 *   The page layout changes occasionally, so every index keeps its own source config below
 *   and a failed index never aborts the others.
 * - Membership is stored per sync: whatever the scraper finds replaces the stored list for
 *   that index only, so a partial failure keeps the previous (older) data in place.
 * - When the scrape yields nothing for an index, the script logs a warning and leaves the
 *   stored membership untouched. The UI marks stale data instead of showing an empty index.
 */

const fs = require('fs');
const puppeteer =require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Membership older than this many days is reported as stale by the UI. */
const STALE_AFTER_DAYS = 60;

/**
 * The indices this script fetches, with the source page to read them from.
 * The user-facing wording for each index lives in src/lib/idxIndices.js (ESM, app side);
 * this list is the script's own copy so the CommonJS script stays dependency-free.
 */
const TRACKED_INDICES = [
  {
    code: 'LQ45',
    name: 'LQ45',
    description: '45 saham dengan kapitalisasi besar dan likuiditas tertinggi di BEI.',
    url: 'https://www.idx.co.id/idx-data/idx-stock-composition',
  },
  {
    code: 'IDX30',
    name: 'IDX30',
    description: '30 perusahaan berkapitalisasi besar, likuid, dengan fundamental baik.',
    url: 'https://www.idx.co.id/idx-data/idx-stock-composition',
  },
  {
    code: 'IDXVALUE30',
    name: 'IDX Value 30',
    description: '30 saham dengan valuasi relatif murah dibanding sektor sejenisnya.',
    url: 'https://www.idx.co.id/idx-data/idx-stock-composition',
  },
  {
    code: 'HIDV20',
    name: 'High Dividend 20',
    description: '20 saham dengan tingkat dividen kas tertinggi dan konsisten.',
    url: 'https://www.idx.co.id/idx-data/idx-stock-composition',
  },
  {
    code: 'ISSI',
    name: 'ISSI (Syariah)',
    description: 'Indeks saham yang memenuhi prinsip pengelolaan dana syariah.',
    url: 'https://www.idx.co.id/idx-data/idx-stock-composition',
  },
];

/** Executable used by the scraper container, mirroring src/scripts/sync-ksei.js. */
function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fs.existsSync('/usr/bin/chromium-browser')) return '/usr/bin/chromium-browser';
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  return undefined;
}

/**
 * Extracts ticker codes from any table on the current page.
 * Runs in the browser, so it must stay self-contained.
 * @returns {Array<{ ticker: string, position: number|null }>}
 */
function scrapeTableTickers() {
  const found = new Map();
  for (const table of document.querySelectorAll('table')) {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').trim().toLowerCase(),
    );
    const tickerIndex = headers.findIndex(
      (h) => h.includes('kode saham') || h === 'ticker' || h === 'kode',
    );
    if (tickerIndex === -1) continue;

    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = Array.from(row.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
      const raw = (cells[tickerIndex] || '').toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z]{2,6}$/.test(raw)) continue;
      if (!found.has(raw)) {
        const positionCell = cells[0] ? parseInt(cells[0], 10) : NaN;
        found.set(raw, { ticker: raw, position: Number.isFinite(positionCell) ? positionCell : null });
      }
    }
  }
  return Array.from(found.values());
}

/**
 * Opens a browser, reads every configured index page and returns the members found.
 * @returns {Promise<Record<string, Array<{ ticker: string, position: number|null }>>>}
 */
async function scrapeAllIndices() {
  const executablePath = resolveExecutablePath();
  /** @type {Record<string, Array<{ ticker: string, position: number|null }>>} */
  const results = {};
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    const visited = new Set();
    for (const meta of TRACKED_INDICES) {
      const code = meta.code;
      try {
        if (!visited.has(meta.url)) {
          console.log(`[IDX-SYNC] Membuka ${meta.url}`);
          await page.goto(meta.url, { waitUntil: 'networkidle2', timeout: 60000 });
          visited.add(meta.url);
        }
        // The page may load members per selected index; give it a moment before reading.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const members = await page.evaluate(scrapeTableTickers);
        results[code] = members;
        console.log(`[IDX-SYNC] ${code}: ${members.length} anggota ditemukan`);
      } catch (error) {
        console.error(`[IDX-SYNC] Gagal membaca ${code}: ${error.message}`);
        results[code] = [];
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return results;
}

/**
 * Replaces the stored membership of one index.
 * @param {{ code: string, name: string, description?: string }} meta
 * @param {Array<{ ticker: string, position: number|null }>} members
 */
async function saveIndex(meta, members) {
  await prisma.idxIndex.upsert({
    where: { code: meta.code },
    create: {
      code: meta.code,
      name: meta.name,
      description: meta.description,
      lastSyncedAt: new Date(),
      memberCount: members.length,
      source: 'scrape',
    },
    update: {
      name: meta.name,
      description: meta.description,
      lastSyncedAt: new Date(),
      memberCount: members.length,
      source: 'scrape',
    },
  });

  await prisma.idxConstituent.deleteMany({ where: { indexCode: meta.code } });
  if (members.length > 0) {
    await prisma.idxConstituent.createMany({
      data: members.map((m) => ({ indexCode: meta.code, ticker: m.ticker, position: m.position })),
      skipDuplicates: true,
    });
  }
  console.log(`[IDX-SYNC] ${meta.code} tersimpan: ${members.length} anggota`);
}

async function main() {
  console.log('[IDX-SYNC] Mulai sinkronisasi indeks BEI');
  const scraped = await scrapeAllIndices();

  let saved = 0;
  let failed = 0;
  for (const meta of TRACKED_INDICES) {
    const members = scraped[meta.code] || [];
    if (members.length === 0) {
      // Keep whatever is already stored; the UI will mark it as stale.
      const existing = await prisma.idxIndex.findUnique({ where: { code: meta.code } });
      const age = existing ? Math.round((Date.now() - existing.lastSyncedAt.getTime()) / 86_400_000) : null;
      console.warn(
        `[IDX-SYNC] ${meta.code}: tidak ada data. Data lama dipertahankan${
          age == null ? '' : ` (umur ${age} hari, batas ${STALE_AFTER_DAYS})`
        }`,
      );
      failed += 1;
      continue;
    }
    await saveIndex(meta, members);
    saved += 1;
  }

  console.log(`[IDX-SYNC] Selesai: ${saved} indeks tersimpan, ${failed} gagal.`);
}

main()
  .catch((error) => {
    console.error('[IDX-SYNC] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });