import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper: Cek apakah kuartal ini sudah ada riset untuk ticker tersebut
function getStartOfCurrentQuarter() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), quarter * 3, 1);
}

export async function POST(req) {
  try {
    const body = await req.json();
    let { ticker } = body;

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

    // 2. Cek apakah batas kuartalan sudah tercapai
    const startOfQuarter = getStartOfCurrentQuarter();
    const existingResearch = await prisma.aiStockResearch.findFirst({
      where: {
        ticker,
        createdAt: { gte: startOfQuarter }
      }
    });

    if (existingResearch) {
      return NextResponse.json({ 
        error: 'Quarterly limit reached. Already analyzed this quarter.',
        research: existingResearch
      }, { status: 429 });
    }

    // 3. Cek antrian yang masih aktif
    const activeQueue = await prisma.aiResearchQueue.findFirst({
      where: {
        ticker,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (activeQueue) {
      return NextResponse.json({ 
        message: 'Already in queue', 
        queue: activeQueue 
      }, { status: 200 });
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

