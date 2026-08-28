import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { calculateFundamentalScore } from '@/lib/scoring/fundamental';
import { calculateTechnicalScore } from '@/lib/scoring/technical';
import { calculateTrendingScore } from '@/lib/scoring/trending';
import { calculateSmartMoneyScore } from '@/lib/scoring/smartMoney';

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
      orderBy: [
        { sortOrder: 'asc' },
        { addedAt: 'asc' }
      ]
    });

    const tickers = items.map(item => item.ticker);
    
    const stocks = await prisma.stockData.findMany({
      where: { ticker: { in: tickers } },
    });

    const stockMap = stocks.reduce((acc, rawStock) => {
      let parsedFundamentals = {};
      let parsedTechnicals = {};
      let parsedKseiLatest = {};

      try { parsedFundamentals = JSON.parse(rawStock.fundamentals || '{}'); } catch(e) {}
      try { parsedTechnicals = JSON.parse(rawStock.technicals || '{}'); } catch(e) {}
      try { parsedKseiLatest = JSON.parse(rawStock.kseiLatest || '{}'); } catch(e) {}

      // Pre-calculate Piotroski F-Score & Altman Z-Score for scoring consistency
      let computedFScore = 5;
      let computedZScore = 2.5;
      if (parsedFundamentals) {
        let score = 0;
        const roe = parsedFundamentals.roe || 0;
        const fcf = parsedFundamentals.freeCashflow || 0;
        const der = parsedFundamentals.der || 0;
        const currentRatio = parsedFundamentals.currentRatio || 0;
        const revenueGrowth = parsedFundamentals.revenueGrowth || 0;
        const netProfitList = Array.isArray(parsedFundamentals.netProfit) ? parsedFundamentals.netProfit : [];
        if (roe > 0) score++;
        if (fcf > 0) score++;
        if (netProfitList.length > 0 && fcf > netProfitList[netProfitList.length - 1]) score++;
        if (netProfitList.length >= 2 && netProfitList[netProfitList.length - 1] > netProfitList[netProfitList.length - 2]) score++;
        if (der > 0 && der <= 1.0) score++;
        if (currentRatio >= 1.5) score++;
        if (revenueGrowth > 0) score++;
        if (roe > 12) score++;
        computedFScore = Math.max(1, Math.min(9, score));

        const sectorUpper = (rawStock.sector || '').toUpperCase();
        if (sectorUpper === 'FINANCIALS' || sectorUpper === 'FINANCE') {
          computedZScore = 3.0;
        } else {
          let z = 0.5;
          const cr = parsedFundamentals.currentRatio || 1.2;
          const d = parsedFundamentals.der || 1.0;
          z += Math.min(1.5, cr * 0.5);
          if (d > 0) z += Math.min(1.5, 1.0 / d); else z += 1.5;
          if (roe > 0) z += Math.min(1.0, (roe / 100) * 4);
          computedZScore = Number(Math.max(0.5, Math.min(4.5, z + 1.0)).toFixed(2));
        }
      }
      parsedFundamentals.piotroskiFScore = computedFScore;
      parsedFundamentals.altmanZScore = computedZScore;

      const parsedStock = {
        ...rawStock,
        fundamentals: parsedFundamentals,
        technicals: parsedTechnicals,
        kseiLatest: parsedKseiLatest,
      };

      let fScore = 50;
      let tScore = 50;
      let trendScore = 50;
      let smartMoneyScore = 50;

      try {
        const fs = calculateFundamentalScore(parsedStock);
        fScore = typeof fs === 'object' ? (fs?.score ?? 50) : Number(fs) || 50;
      } catch (e) {}

      try {
        const ts = calculateTechnicalScore(parsedStock);
        tScore = typeof ts === 'object' ? (ts?.score ?? 50) : Number(ts) || 50;
      } catch (e) {}

      try {
        const trs = calculateTrendingScore(parsedStock);
        trendScore = typeof trs === 'object' ? (trs?.score ?? 50) : Number(trs) || 50;
      } catch (e) {}

      try {
        const sms = calculateSmartMoneyScore(parsedStock);
        smartMoneyScore = typeof sms === 'object' ? (sms?.score ?? 50) : Number(sms) || 50;
      } catch (e) {}

      const compositeScore = Math.round(
        (fScore * 0.45) + (tScore * 0.35) + (trendScore * 0.10) + (smartMoneyScore * 0.10)
      );

      acc[rawStock.ticker] = {
        ticker: rawStock.ticker,
        name: rawStock.name,
        price: rawStock.price,
        changePercent: rawStock.changePercent,
        sector: rawStock.sector,
        score: compositeScore,
        scores: {
          fundamental: fScore,
          technical: tScore,
          trending: trendScore,
          smartMoney: smartMoneyScore,
          composite: compositeScore,
        }
      };
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
    const { collectionId, ticker, notes, targetBuy, targetSell } = body;

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

    const parsedTargetBuy = targetBuy != null && targetBuy !== '' ? parseFloat(targetBuy) : null;
    const parsedTargetSell = targetSell != null && targetSell !== '' ? parseFloat(targetSell) : null;

    const item = await prisma.collectionItem.create({
      data: {
        collectionId,
        ticker: normalizedTicker,
        notes: notes || null,
        targetBuy: Number.isFinite(parsedTargetBuy) ? parsedTargetBuy : null,
        targetSell: Number.isFinite(parsedTargetSell) ? parsedTargetSell : null,
        sortOrder: count,
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
    const { id, notes, targetBuy, targetSell } = body;

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

    const parsedTargetBuy = targetBuy != null && targetBuy !== '' ? parseFloat(targetBuy) : null;
    const parsedTargetSell = targetSell != null && targetSell !== '' ? parseFloat(targetSell) : null;

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes || null;
    if (targetBuy !== undefined) updateData.targetBuy = Number.isFinite(parsedTargetBuy) ? parsedTargetBuy : null;
    if (targetSell !== undefined) updateData.targetSell = Number.isFinite(parsedTargetSell) ? parsedTargetSell : null;

    const updated = await prisma.collectionItem.update({
      where: { id },
      data: updateData
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

export async function PATCH(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, orderedIds } = body;

    if (!collectionId || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'collectionId dan orderedIds diperlukan' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tidak valid' }, { status: 403 });
    }

    // Update each item's sortOrder in transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.collectionItem.update({
          where: { id },
          data: { sortOrder: index }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering collection items:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
