import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    let ticker = resolvedParams?.ticker;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    ticker = ticker.toUpperCase().replace(/\.JK$/, '');

    // Ambil hasil riset terbaru (jika ada)
    const research = await prisma.aiStockResearch.findFirst({
      where: { ticker },
      orderBy: { createdAt: 'desc' }
    });

    // Ambil status antrian aktif (jika ada)
    const activeQueue = await prisma.aiResearchQueue.findFirst({
      where: {
        ticker,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      research: research || null,
      queue: activeQueue || null
    }, { status: 200 });
  } catch (error) {
    console.error(`API /ai/research error for ${ticker}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

