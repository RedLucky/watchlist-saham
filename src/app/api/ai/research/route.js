import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CACHE_VALIDITY_DAYS = 30;
const STALE_QUEUE_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { ticker, force } = body;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    ticker = ticker.toUpperCase().replace(/\.JK$/, '');

    // 1. Cek apakah saham ada di DB
    const stock = await prisma.stockData.findUnique({
      where: { ticker }
    });

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // 2. Cek apakah batas usia riset (30 hari) masih berlaku, kecuali jika dipaksa (force: true)
    if (!force) {
      const freshnessCutoff = new Date(Date.now() - (CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000));
      const existingResearch = await prisma.aiStockResearch.findFirst({
        where: {
          ticker,
          createdAt: { gte: freshnessCutoff }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingResearch) {
        return NextResponse.json({ 
          error: 'Riset AI untuk saham ini masih valid (< 30 hari). Gunakan opsi force untuk memperbarui.',
          research: existingResearch
        }, { status: 429 });
      }
    }

    // 3. Cek antrian yang masih aktif (dengan deteksi stale task)
    const activeQueue = await prisma.aiResearchQueue.findFirst({
      where: {
        ticker,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeQueue) {
      // Jika task macet di PROCESSING lebih dari 10 menit, tandai FAILED agar antrian baru bisa dibuat
      const isStale = activeQueue.status === 'PROCESSING' && 
        (Date.now() - new Date(activeQueue.updatedAt).getTime() > STALE_QUEUE_TIMEOUT_MS);

      if (isStale) {
        await prisma.aiResearchQueue.update({
          where: { id: activeQueue.id },
          data: { status: 'FAILED', error: 'Stale task recovered on new request', updatedAt: new Date() }
        });
      } else {
        return NextResponse.json({ 
          message: 'Already in queue', 
          queue: activeQueue 
        }, { status: 200 });
      }
    }

    // 4. Masukkan ke antrian
    const newQueue = await prisma.aiResearchQueue.create({
      data: {
        ticker,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ message: 'Added to queue', queue: newQueue }, { status: 201 });
  } catch (error) {
    console.error('API /ai/research error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

