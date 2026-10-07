import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/auth';
import { addConstituent, removeConstituent } from '@/lib/idxStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/indices/[code]
 *
 * Members of one index, enriched with the live price/score already stored in the database
 * so the page does not need a second request.
 *
 * @param {{ params: Promise<{ code: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function GET(request, context) {
  try {
    const { code } = await context.params;
    const indexCode = String(code).toUpperCase();

    const index = await prisma.idxIndex.findUnique({
      where: { code: indexCode },
      include: {
        constituents: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!index) {
      return NextResponse.json({ error: `Indeks ${indexCode} tidak ditemukan` }, { status: 404 });
    }

    const tickers = index.constituents.map((c) => c.ticker);
    const stocks = tickers.length
      ? await prisma.stockData.findMany({
          where: { ticker: { in: tickers } },
          select: { ticker: true, name: true, sector: true, price: true, changePercent: true, score: true },
        })
      : [];
    const stockByTicker = new Map(stocks.map((s) => [s.ticker, s]));

    return NextResponse.json({
      code: index.code,
      name: index.name,
      description: index.description,
      effectiveFrom: index.effectiveFrom,
      lastSyncedAt: index.lastSyncedAt,
      source: index.source,
      members: index.constituents.map((c) => {
        const stock = stockByTicker.get(c.ticker);
        return {
          ticker: c.ticker,
          position: c.position,
          name: stock?.name || '-',
          sector: stock?.sector || '-',
          price: stock?.price ?? null,
          changePercent: stock?.changePercent ?? null,
          score: stock?.score ?? null,
          tracked: Boolean(stock),
        };
      }),
    });
  } catch (error) {
    console.error('[API /api/indices/[code] Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat anggota indeks' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/indices/[code] — admin-only; adds one stock to the index.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ code: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function POST(request, context) {
  try {
    const auth = await verifyAdminAccess(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const { code } = await context.params;
    const body = await request.json();
    const result = await addConstituent(code, body.ticker);
    return NextResponse.json({
      message: result.added
        ? `${result.ticker} ditambahkan ke ${result.indexCode}.`
        : `${result.ticker} sudah ada di ${result.indexCode}.`,
      ...result,
    });
  } catch (error) {
    console.error('[API /api/indices/[code] POST Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menambahkan anggota indeks' },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/indices/[code]?ticker=BBCA — admin-only; removes one stock from the index.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ code: string }> }} context
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyAdminAccess(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const { code } = await context.params;
    const ticker = new URL(request.url).searchParams.get('ticker');
    const result = await removeConstituent(code, ticker);
    return NextResponse.json({
      message: result.removed
        ? `${result.ticker} dihapus dari ${result.indexCode}.`
        : `${result.ticker} tidak ada di ${result.indexCode}.`,
      ...result,
    });
  } catch (error) {
    console.error('[API /api/indices/[code] DELETE Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus anggota indeks' },
      { status: 400 },
    );
  }
}