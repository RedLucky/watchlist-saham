import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';



/**
 * GET /api/pension
 * Fetch all monthly pension execution records for the authenticated user.
 */
export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ records: [], unauthenticated: true });
    }

    const records = await prisma.pensionRecord.findMany({
      where: { userId },
      orderBy: [
        { month: 'desc' },
        { category: 'asc' }
      ]
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error('[pension/GET] error:', err);
    return NextResponse.json({ error: 'Gagal memuat data pensiun' }, { status: 500 });
  }
}

/**
 * POST /api/pension
 * Save or update monthly pension record for the authenticated user.
 */
export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menyimpan data' }, { status: 401 });
    }

    const body = await request.json();
    const { month, records, sbnAvailable } = body;

    if (!month || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Data tidak lengkap (month, records required)' }, { status: 400 });
    }

    const savedRecords = [];

    for (const rec of records) {
      const { category, ticker, lots, price, amount, notes } = rec;
      const tickerVal = ticker || '';

      const existing = await prisma.pensionRecord.findFirst({
        where: {
          userId,
          month,
          category,
          ticker: tickerVal,
        }
      });

      let record;
      if (existing) {
        record = await prisma.pensionRecord.update({
          where: { id: existing.id },
          data: {
            lots: lots !== undefined ? lots : null,
            price: price !== undefined ? price : null,
            amount: amount || 0,
            notes: notes || null,
            sbnAvailable: sbnAvailable !== undefined ? sbnAvailable : true,
            date: new Date()
          }
        });
      } else {
        record = await prisma.pensionRecord.create({
          data: {
            userId,
            month,
            category,
            ticker: tickerVal,
            lots: lots !== undefined ? lots : null,
            price: price !== undefined ? price : null,
            amount: amount || 0,
            notes: notes || null,
            sbnAvailable: sbnAvailable !== undefined ? sbnAvailable : true,
            date: new Date()
          }
        });
      }

      savedRecords.push(record);
    }

    return NextResponse.json({ success: true, savedRecords });
  } catch (err) {
    console.error('[pension/POST] error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan ke database' }, { status: 500 });
  }
}

/**
 * DELETE /api/pension?month=2026-08
 * Delete records for a specific month for the authenticated user.
 */
export async function DELETE(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Parameter month diperlukan' }, { status: 400 });
    }

    await prisma.pensionRecord.deleteMany({
      where: { userId, month }
    });

    return NextResponse.json({ success: true, message: `Data bulan ${month} berhasil dihapus` });
  } catch (err) {
    console.error('[pension/DELETE] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
