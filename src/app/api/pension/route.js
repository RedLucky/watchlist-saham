import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

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
        { date: 'desc' },
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
 * Save, update, or append monthly pension record for the authenticated user.
 */
export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menyimpan data' }, { status: 401 });
    }

    const body = await request.json();
    const { month, date, editingDate, records, sbnAvailable } = body;

    const dateStr = (date || editingDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const monthStr = month || dateStr.slice(0, 7);

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Data records tidak boleh kosong' }, { status: 400 });
    }

    // Parse target execution date
    const executionDate = new Date(`${dateStr}T12:00:00.000Z`);

    // If editing a specific execution date, clear previous records for that exact date first
    if (editingDate) {
      const editDateStr = editingDate.slice(0, 10);
      const startOfDay = new Date(`${editDateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${editDateStr}T23:59:59.999Z`);

      await prisma.pensionRecord.deleteMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
    }

    // Insert new/updated execution records
    const savedRecords = [];
    for (const rec of records) {
      const { category, ticker, lots, price, amount, notes } = rec;
      const tickerVal = ticker || '';
      const safeLots = lots !== undefined && lots !== null ? Math.max(0, Math.round(Number(lots) || 0)) : null;
      const safePrice = price !== undefined && price !== null ? Math.max(0, Number(price) || 0) : null;
      const safeAmount = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;

      const record = await prisma.pensionRecord.create({
        data: {
          userId,
          month: monthStr,
          date: executionDate,
          category,
          ticker: tickerVal,
          lots: safeLots,
          price: safePrice,
          amount: safeAmount,
          notes: notes || null,
          sbnAvailable: sbnAvailable !== undefined ? sbnAvailable : true,
        }
      });

      savedRecords.push(record);
    }

    return NextResponse.json({ success: true, savedRecords });
  } catch (err) {
    console.error('[pension/POST] error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan ke database' }, { status: 500 });
  }
}

/**
 * DELETE /api/pension?id=123 | ?date=2026-09-02 | ?month=2026-08
 */
export async function DELETE(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (id) {
      await prisma.pensionRecord.deleteMany({
        where: { userId, id: Number(id) }
      });
      return NextResponse.json({ success: true, message: 'Catatan berhasil dihapus' });
    }

    if (date) {
      const dateStr = date.slice(0, 10);
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      await prisma.pensionRecord.deleteMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
      return NextResponse.json({ success: true, message: `Catatan eksekusi tanggal ${dateStr} berhasil dihapus` });
    }

    if (month) {
      await prisma.pensionRecord.deleteMany({
        where: { userId, month }
      });
      return NextResponse.json({ success: true, message: `Data bulan ${month} berhasil dihapus` });
    }

    return NextResponse.json({ error: 'Parameter id, date, atau month diperlukan' }, { status: 400 });
  } catch (err) {
    console.error('[pension/DELETE] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
