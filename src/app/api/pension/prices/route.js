import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/prices
 * Lightweight endpoint: returns only prices for pension stocks (BMRI, BBRI, KLBF, ANTM)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');
    let tickers = ['BMRI', 'BBRI', 'KLBF', 'ANTM'];
    
    if (tickersParam) {
      tickers = tickersParam.split(',').map(t => t.trim().toUpperCase());
    }

    const stocks = await prisma.stockData.findMany({
      where: { ticker: { in: tickers } },
      select: { ticker: true, price: true, name: true, sector: true },
    });

    const prices = {};
    stocks.forEach((s) => {
      prices[s.ticker] = { price: s.price, name: s.name };
    });

    return NextResponse.json({ prices, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[pension/prices] error:', err);
    return NextResponse.json({ error: 'Gagal memuat harga' }, { status: 500 });
  }
}
