import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceCollectionId, targetCollectionId, ticker, forceOverwrite = false } = body;

    if (!sourceCollectionId || !targetCollectionId || !ticker) {
      return NextResponse.json({ error: 'sourceCollectionId, targetCollectionId, dan ticker diperlukan' }, { status: 400 });
    }

    const srcId = parseInt(sourceCollectionId, 10);
    const tgtId = parseInt(targetCollectionId, 10);

    if (srcId === tgtId) {
      return NextResponse.json({ error: 'Koleksi asal dan tujuan tidak boleh sama' }, { status: 400 });
    }

    const normalizedTicker = ticker.toUpperCase().replace(/\.JK$/, '');

    // Verify ownership of both source and target collections
    const [sourceCollection, targetCollection] = await Promise.all([
      prisma.collection.findUnique({ where: { id: srcId } }),
      prisma.collection.findUnique({ where: { id: tgtId } })
    ]);

    if (!sourceCollection || sourceCollection.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi asal tidak valid' }, { status: 403 });
    }
    if (!targetCollection || targetCollection.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tujuan tidak valid' }, { status: 403 });
    }

    // Check if stock exists in source collection
    const sourceItem = await prisma.collectionItem.findUnique({
      where: {
        collectionId_ticker: {
          collectionId: srcId,
          ticker: normalizedTicker
        }
      }
    });

    if (!sourceItem) {
      return NextResponse.json({ error: `Saham ${normalizedTicker} tidak ditemukan di koleksi "${sourceCollection.name}"` }, { status: 404 });
    }

    // Check if stock already exists in target collection
    const existingInTarget = await prisma.collectionItem.findUnique({
      where: {
        collectionId_ticker: {
          collectionId: tgtId,
          ticker: normalizedTicker
        }
      }
    });

    if (existingInTarget && !forceOverwrite) {
      return NextResponse.json({
        duplicate: true,
        sourceCollectionName: sourceCollection.name,
        targetCollectionName: targetCollection.name,
        ticker: normalizedTicker,
        message: `Saham ${normalizedTicker} sudah ada di koleksi "${targetCollection.name}".`
      }, { status: 409 });
    }

    const targetCount = await prisma.collectionItem.count({
      where: { collectionId: tgtId }
    });

    if (!existingInTarget && targetCount >= 100) {
      return NextResponse.json({ error: 'Koleksi tujuan sudah mencapai batas maksimal 100 saham' }, { status: 400 });
    }

    // Perform Move in Transaction
    await prisma.$transaction(async (tx) => {
      // 1. If existing in target and forceOverwrite: update target item with source item's notes/targets
      if (existingInTarget) {
        await tx.collectionItem.update({
          where: {
            collectionId_ticker: {
              collectionId: tgtId,
              ticker: normalizedTicker
            }
          },
          data: {
            notes: sourceItem.notes || existingInTarget.notes,
            targetBuy: sourceItem.targetBuy != null ? sourceItem.targetBuy : existingInTarget.targetBuy,
            targetSell: sourceItem.targetSell != null ? sourceItem.targetSell : existingInTarget.targetSell,
          }
        });
      } else {
        // 2. If not existing: create new item in target collection
        await tx.collectionItem.create({
          data: {
            collectionId: tgtId,
            ticker: normalizedTicker,
            notes: sourceItem.notes,
            targetBuy: sourceItem.targetBuy,
            targetSell: sourceItem.targetSell,
            sortOrder: targetCount,
          }
        });
      }

      // 3. Delete from source collection
      await tx.collectionItem.delete({
        where: {
          collectionId_ticker: {
            collectionId: srcId,
            ticker: normalizedTicker
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      moved: true,
      ticker: normalizedTicker,
      sourceCollectionName: sourceCollection.name,
      targetCollectionName: targetCollection.name,
      message: `Saham ${normalizedTicker} berhasil dipindahkan ke koleksi "${targetCollection.name}"`
    });
  } catch (error) {
    console.error('Error moving stock between collections:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memindahkan saham' }, { status: 500 });
  }
}
