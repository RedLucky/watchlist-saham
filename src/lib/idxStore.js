import { prisma } from './prisma.js';
import { TRACKED_INDICES, assertIndexCode, assertTicker } from './idxIndices.js';

/**
 * Database access for IDX index membership.
 *
 * Every function takes an optional `client` so unit tests can pass a fake Prisma client and
 * never touch a real database. Production callers omit it and get the shared Prisma client.
 *
 * A manual edit is treated as fresh human-entered data: it stamps `lastSyncedAt` and marks the
 * source as `upload`. Claiming a fresh date for a stale scrape would be the opposite of honest.
 */

/**
 * Finds or creates the row describing one index, filling in the wording from the reference list.
 *
 * @param {string} code - Index code, e.g. "LQ45".
 * @param {object} [client=prisma] - Prisma client (or a fake in tests).
 * @returns {Promise<object>} The `IdxIndex` row.
 * @throws {Error} When the code is not a tracked index.
 */
export async function ensureIndexRow(code, client = prisma) {
  const indexCode = assertIndexCode(code);
  const meta = TRACKED_INDICES.find((i) => i.code === indexCode);
  return client.idxIndex.upsert({
    where: { code: indexCode },
    create: {
      code: indexCode,
      name: meta?.name || indexCode,
      description: meta?.description,
      source: 'upload',
    },
    update: { name: meta?.name || indexCode, description: meta?.description },
  });
}

/**
 * Recounts members and refreshes the freshness stamp of one index.
 *
 * @param {string} code - Index code.
 * @param {object} [client=prisma] - Prisma client.
 * @returns {Promise<number>} The new member count.
 */
async function refreshIndexMeta(code, client) {
  const memberCount = await client.idxConstituent.count({ where: { indexCode: code } });
  await client.idxIndex.update({
    where: { code },
    data: { memberCount, lastSyncedAt: new Date(), source: 'upload' },
  });
  return memberCount;
}

/**
 * Adds one stock to an index. Adding a stock that is already a member is a no-op, so the UI can
 * retry freely without creating duplicates.
 *
 * @param {string} code - Index code.
 * @param {string} ticker - Stock ticker.
 * @param {object} [client=prisma] - Prisma client.
 * @returns {Promise<{ indexCode: string, ticker: string, memberCount: number, added: boolean }>}
 * @throws {Error} When the code or ticker is invalid.
 */
export async function addConstituent(code, ticker, client = prisma) {
  const indexCode = assertIndexCode(code);
  const symbol = assertTicker(ticker);
  await ensureIndexRow(indexCode, client);

  const existing = await client.idxConstituent.findUnique({
    where: { indexCode_ticker: { indexCode, ticker: symbol } },
  });

  // Re-adding an existing member changes nothing, so we must not stamp a fresh date: that would
  // make an old list look freshly verified. Only the current count is reported back.
  if (existing) {
    const memberCount = await client.idxConstituent.count({ where: { indexCode } });
    return { indexCode, ticker: symbol, memberCount, added: false };
  }

  await client.idxConstituent.create({ data: { indexCode, ticker: symbol } });
  const memberCount = await refreshIndexMeta(indexCode, client);
  return { indexCode, ticker: symbol, memberCount, added: true };
}

/**
 * Removes one stock from an index. Removing a stock that is not a member is a no-op.
 *
 * @param {string} code - Index code.
 * @param {string} ticker - Stock ticker.
 * @param {object} [client=prisma] - Prisma client.
 * @returns {Promise<{ indexCode: string, ticker: string, memberCount: number, removed: boolean }>}
 * @throws {Error} When the code or ticker is invalid.
 */
export async function removeConstituent(code, ticker, client = prisma) {
  const indexCode = assertIndexCode(code);
  const symbol = assertTicker(ticker);

  const existing = await client.idxConstituent.findUnique({
    where: { indexCode_ticker: { indexCode, ticker: symbol } },
  });

  if (!existing) {
    const memberCount = await client.idxConstituent.count({ where: { indexCode: indexCode } });
    return { indexCode, ticker: symbol, memberCount, removed: false };
  }

  await client.idxConstituent.delete({
    where: { indexCode_ticker: { indexCode, ticker: symbol } },
  });
  const memberCount = await refreshIndexMeta(indexCode, client);
  return { indexCode, ticker: symbol, memberCount, removed: true };
}