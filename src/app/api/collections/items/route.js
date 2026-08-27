import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function serializeData(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = parseInt(searchParams.get('collectionId'), 10);

    if (!collectionId) {
      return NextResponse.json({ error: 'collectionId diperlukan' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Koleksi tidak ditemukan' }, { status: 404 });
    }

    const userId = await getUserIdFromRequest(request);
    if (!collection.isPublic && collection.userId !== userId) {
      return NextResponse.json({ error: 'Tidak ada akses ke koleksi ini' }, { status: 403 });
    }

    const items = await prisma.collectionItem.findMany({
      where: { collectionId },
      orderBy: { addedAt: 'desc' }
    });

    const tickers = items.map(item => item.ticker);
    
    const stocks = await prisma.stockData.findMany({
      where: { ticker: { in: tickers } },
      select: {
        ticker: true,
        name: true,
        price: true,
        changePercent: true,
        sector: true
      }
    });

    const stockMap = stocks.reduce((acc, stock) => {
      acc[stock.ticker] = stock;
      return acc;
    }, {});

    const enrichedItems = items.map(item => ({
      ...item,
      stock: stockMap[item.ticker] || null
    }));

    return NextResponse.json(serializeData(enrichedItems));
  } catch (error) {
    console.error('Error fetching collection items:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, ticker, notes } = body;

    if (!collectionId || !ticker) {
      return NextResponse.json({ error: 'collectionId dan ticker diperlukan' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tidak valid' }, { status: 403 });
    }

    const count = await prisma.collectionItem.count({ where: { collectionId } });
    if (count >= 100) {
      return NextResponse.json({ error: 'Maksimal 100 saham per koleksi' }, { status: 400 });
    }

    const normalizedTicker = ticker.toUpperCase().replace(/\.JK$/, '');

    const item = await prisma.collectionItem.create({
      data: {
        collectionId,
        ticker: normalizedTicker,
        notes
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Saham sudah ada di koleksi ini' }, { status: 400 });
    }
    console.error('Error adding item:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { id, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID item diperlukan' }, { status: 400 });
    }

    const item = await prisma.collectionItem.findUnique({
      where: { id },
      include: { collection: true }
    });

    if (!item || item.collection.userId !== userId) {
      return NextResponse.json({ error: 'Item tidak valid' }, { status: 403 });
    }

    const updated = await prisma.collectionItem.update({
      where: { id },
      data: { notes }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, ticker } = body;

    if (!collectionId || !ticker) {
      return NextResponse.json({ error: 'collectionId dan ticker diperlukan' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tidak valid' }, { status: 403 });
    }

    const normalizedTicker = ticker.toUpperCase().replace(/\.JK$/, '');

    await prisma.collectionItem.delete({
      where: {
        collectionId_ticker: {
          collectionId,
          ticker: normalizedTicker
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
