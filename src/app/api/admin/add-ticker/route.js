import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTicker, getSectorByTicker, isSyariahStock } from '@/lib/sectorUniverse';

export async function POST(request) {
  try {
    const body = await request.json();
    const ticker = body.ticker;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const cleanTicker = normalizeTicker(ticker);
    const sector = getSectorByTicker(cleanTicker);
    const isSyariah = isSyariahStock(cleanTicker);

    // Upsert to database so it becomes tracked
    const stock = await prisma.stockData.upsert({
      where: { ticker: cleanTicker },
      update: {}, // Just ensure it exists
      create: {
        ticker: cleanTicker,
        name: cleanTicker, // Will be updated by Yahoo later
        sector: sector,
        isSyariah: isSyariah,
        lastPriceSync: new Date(0), // Set to epoch 0 so it's prioritized by fastSync
        lastDeepSync: new Date(0)   // Set to epoch 0 so it's prioritized by deepSync
      }
    });

    return NextResponse.json({
      success: true,
      message: `Ticker ${cleanTicker} added successfully and will be synced shortly.`,
      stock
    });
  } catch (err) {
    console.error('[Add Ticker API Error]', err);
    return NextResponse.json({ error: 'Failed to add ticker' }, { status: 500 });
  }
}
