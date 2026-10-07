/**
 * Applies curated IDX index membership from src/data/idxMembers.seed.json into the database.
 *
 * Run with:  node src/scripts/seed-indices.js
 *
 * Why a seed file instead of the scraper: IDX now sits behind a bot protection layer that
 * rejects headless browsers and plain HTTP clients, so `sync-indices.js` cannot read the page.
 * This file is the fallback — a human-verified list, reviewable in git, that the admin can
 * still correct through the Indeks BEI page.
 *
 * Each index in the file carries the date IDX published that membership, which is what the UI
 * shows. Re-running the script is safe: it replaces the member list of every seeded index.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SEED_PATH = path.join(__dirname, '..', 'data', 'idxMembers.seed.json');

/** Index wording, kept in step with src/lib/idxIndices.js (this script stays CommonJS). */
const INDEX_META = {
  LQ45: { name: 'LQ45', description: '45 saham dengan kapitalisasi besar dan likuiditas tertinggi di BEI.' },
  IDX30: { name: 'IDX30', description: '30 perusahaan berkapitalisasi besar, likuid, dengan fundamental baik.' },
  IDXVALUE30: { name: 'IDX Value 30', description: '30 saham dengan valuasi relatif murah dibanding sektor sejenisnya.' },
  HIDV20: { name: 'High Dividend 20', description: '20 saham dengan tingkat dividen kas tertinggi dan konsisten.' },
  ISSI: { name: 'ISSI (Syariah)', description: 'Indeks saham yang memenuhi prinsip pengelolaan dana syariah.' },
};

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  console.log(`[IDX-SEED] Membaca ${seed.indices.length} indeks dari ${path.basename(SEED_PATH)}`);

  for (const entry of seed.indices) {
    const meta = INDEX_META[entry.code];
    if (!meta) {
      console.warn(`[IDX-SEED] ${entry.code}: bukan indeks yang dilacak, dilewati.`);
      continue;
    }
    if (!Array.isArray(entry.members) || entry.members.length === 0) {
      console.warn(`[IDX-SEED] ${entry.code}: tidak ada anggota, dilewati.`);
      continue;
    }

    const tickers = [...new Set(entry.members.map((t) => String(t).trim().toUpperCase()))];

    await prisma.$transaction(async (tx) => {
      await tx.idxIndex.upsert({
        where: { code: entry.code },
        create: {
          code: entry.code,
          name: meta.name,
          description: meta.description,
          effectiveFrom: entry.effectiveFrom ? new Date(entry.effectiveFrom) : null,
          lastSyncedAt: new Date(),
          memberCount: tickers.length,
          source: entry.source || 'seed',
        },
        update: {
          name: meta.name,
          description: meta.description,
          effectiveFrom: entry.effectiveFrom ? new Date(entry.effectiveFrom) : null,
          lastSyncedAt: new Date(),
          memberCount: tickers.length,
          source: entry.source || 'seed',
        },
      });
      await tx.idxConstituent.deleteMany({ where: { indexCode: entry.code } });
      await tx.idxConstituent.createMany({
        data: tickers.map((ticker, i) => ({ indexCode: entry.code, ticker, position: i + 1 })),
      });
    });

    console.log(`[IDX-SEED] ${entry.code}: ${tickers.length} anggota, berlaku sejak ${entry.effectiveFrom || 'tidak dicatat'}`);
    if (entry.verifiedFrom?.length) {
      console.log(`[IDX-SEED]   verifikasi ${entry.verifiedOn}: ${entry.verifiedFrom.join(' | ')}`);
    }
  }

  const total = await prisma.idxConstituent.count();
  console.log(`[IDX-SEED] Selesai. Total anggota di database: ${total}`);
}

main()
  .catch((error) => {
    console.error('[IDX-SEED] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });