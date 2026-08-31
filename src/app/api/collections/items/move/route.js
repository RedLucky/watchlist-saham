import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceCollectionId, targetCollectionId, ticker, forceOverwrite } = body;

    if (!sourceCollectionId || !targetCollectionId || !ticker) {
      return NextResponse.json(
        { error: 'sourceCollectionId, targetCollectionId, dan ticker wajib diisi' },
        { status: 400 }
      );
    }

    const srcId = parseInt(sourceCollectionId, 10);
    const tgtId = parseInt(targetCollectionId, 10);
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');

    if (srcId === tgtId) {
      return NextResponse.json(
        { error: 'Koleksi asal dan koleksi tujuan tidak boleh sama' },
        { status: 400 }
      );
    }

    // Verify ownership of source collection
    const sourceCollection = await prisma.collection.findFirst({
      where: { id: srcId, userId },
    });
    if (!sourceCollection) {
      return NextResponse.json(
        { error: 'Koleksi asal tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      );
    }

    // Verify ownership of target collection
    const targetCollection = await prisma.collection.findFirst({
      where: { id: tgtId, userId },
    });
    if (!targetCollection) {
      return NextResponse.json(
        { error: 'Koleksi tujuan tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      );
    }

    // Find the item in source collection
    const sourceItem = await prisma.collectionItem.findFirst({
      where: { collectionId: srcId, ticker: cleanTicker },
    });
    if (!sourceItem) {
      return NextResponse.json(
        { error: `Saham ${cleanTicker} tidak ditemukan di koleksi "${sourceCollection.name}"` },
        { status: 404 }
      );
    }

    // Check if stock already exists in target collection
    const existingTargetItem = await prisma.collectionItem.findFirst({
      where: { collectionId: tgtId, ticker: cleanTicker },
    });

    if (existingTargetItem && !forceOverwrite) {
      return NextResponse.json(
        {
          duplicate: true,
          targetCollectionName: targetCollection.name,
          message: `Saham ${cleanTicker} sudah terdaftar di koleksi "${targetCollection.name}".`,
        },
        { status: 409 }
      );
    }

    // Check capacity if adding a new item
    if (!existingTargetItem) {
      const targetCount = await prisma.collectionItem.count({
        where: { collectionId: tgtId },
      });
      if (targetCount >= 100) {
        return NextResponse.json(
          { error: `Koleksi "${targetCollection.name}" sudah mencapai batas maksimal 100 saham.` },
          { status: 400 }
        );
      }
    }

    // Execute move transaction
    await prisma.$transaction(async (tx) => {
      if (existingTargetItem) {
        // Update existing item in target with notes/targets from source (or preserve if target has notes)
        await tx.collectionItem.update({
          where: { id: existingTargetItem.id },
          data: {
            notes: sourceItem.notes || existingTargetItem.notes,
            targetBuy: sourceItem.targetBuy || existingTargetItem.targetBuy,
            targetSell: sourceItem.targetSell || existingTargetItem.targetSell,
          },
        });
      } else {
        const targetCount = await tx.collectionItem.count({
          where: { collectionId: tgtId },
        });
        await tx.collectionItem.create({
          data: {
            collectionId: tgtId,
            ticker: cleanTicker,
            notes: sourceItem.notes,
            targetBuy: sourceItem.targetBuy,
            targetSell: sourceItem.targetSell,
            sortOrder: targetCount,
          },
        });
      }

      // Delete from source collection
      await tx.collectionItem.delete({
        where: { id: sourceItem.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Saham ${cleanTicker} berhasil dipindahkan ke "${targetCollection.name}"`,
    });
  } catch (error) {
    console.error('Error moving stock between collections:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat memindahkan saham' },
      { status: 500 }
    );
  }
}