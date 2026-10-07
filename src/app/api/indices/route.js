import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/auth';
import { TRACKED_INDICES, parseMembershipText } from '@/lib/idxIndices';

export const dynamic = 'force-dynamic';

/**
 * GET /api/indices
 *
 * Returns every tracked IDX index with its members, plus a flat ticker → codes map so the
 * client can label any stock without one request per row.
 *
 * @returns {Promise<NextResponse>} `{ indices: [...], byTicker: { BBCA: ['LQ45', ...] } }`
 */
export async function GET() {
  try {
    const indices = await prisma.idxIndex.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { constituents: true } } },
    });

    const constituents = await prisma.idxConstituent.findMany({
      select: { indexCode: true, ticker: true },
    });

    /** @type {Record<string, string[]>} */
    const byTicker = {};
    for (const row of constituents) {
      (byTicker[row.ticker] ||= []).push(row.indexCode);
    }
    for (const codes of Object.values(byTicker)) {
      codes.sort();
    }

    return NextResponse.json({
      indices: indices.map((idx) => ({
        code: idx.code,
        name: idx.name,
        description: idx.description,
        effectiveFrom: idx.effectiveFrom,
        lastSyncedAt: idx.lastSyncedAt,
        source: idx.source,
        memberCount: idx._count.constituents,
      })),
      byTicker,
    });
  } catch (error) {
    console.error('[API /api/indices Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat data indeks' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/indices — admin-only manual upload of index membership.
 *
 * This is the fallback for when the scraper cannot reach IDX: the admin pastes a ticker list
 * and this replaces the stored membership, marking the index as `upload` so the UI can show
 * that the data came from a person rather than a scrape.
 *
 * Body: `{ defaultIndex: 'LQ45', text: 'BBCA\nBBRI' }` or `{ text: 'LQ45\tBBCA\nISSI\tBBRI' }`.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const auth = await verifyAdminAccess(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await request.json()
      : { text: await request.text() };

    const rows = parseMembershipText(body.text, { defaultIndex: body.defaultIndex });
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada ticker valid yang ditemukan.' }, { status: 400 });
    }

    // Group the pasted rows per index so each index is replaced in one transaction.
    /** @type {Map<string, Array<{ ticker: string }>>} */
    const perIndex = new Map();
    for (const row of rows) {
      if (!perIndex.has(row.indexCode)) perIndex.set(row.indexCode, []);
      perIndex.get(row.indexCode).push({ ticker: row.ticker });
    }

    const results = [];
    for (const [code, members] of perIndex) {
      const meta = TRACKED_INDICES.find((i) => i.code === code);
      await prisma.$transaction(async (tx) => {
        await tx.idxIndex.upsert({
          where: { code },
          create: {
            code,
            name: meta?.name || code,
            description: meta?.description,
            lastSyncedAt: new Date(),
            memberCount: members.length,
            source: 'upload',
          },
          update: {
            name: meta?.name || code,
            description: meta?.description,
            lastSyncedAt: new Date(),
            memberCount: members.length,
            source: 'upload',
          },
        });
        await tx.idxConstituent.deleteMany({ where: { indexCode: code } });
        await tx.idxConstituent.createMany({
          data: members.map((m) => ({ indexCode: code, ticker: m.ticker })),
          skipDuplicates: true,
        });
      });
      results.push({ code, memberCount: members.length });
    }

    return NextResponse.json({
      message: `Tersimpan ${rows.length} anggota untuk ${results.length} indeks.`,
      results,
    });
  } catch (error) {
    console.error('[API /api/indices POST Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan data indeks' },
      { status: error.message?.includes('tidak valid') ? 400 : 500 },
    );
  }
}