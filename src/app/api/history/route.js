import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: {
        date: 'desc',
      },
      take: 50, // Last 50 recommendations
    });

    // Calculate Win Rate (Simple logic for now)
    const closed = recommendations.filter(r => r.status !== 'OPEN');
    const wins = closed.filter(r => r.status === 'WIN').length;
    const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

    return NextResponse.json({
      recommendations,
      stats: {
        total: recommendations.length,
        closed: closed.length,
        wins,
        winRate: `${winRate}%`,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat riwayat' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { stock, style, mode } = data;

    if (!stock || !stock.ticker) {
      return NextResponse.json({ error: 'Missing stock data' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prevent duplicate saves on the same day for the same style for the SAME user
    const existing = await prisma.recommendation.findFirst({
      where: {
        userId,
        ticker: stock.ticker,
        style: style,
        date: {
          gte: today,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already saved today', recommendation: existing });
    }

    const rec = await prisma.recommendation.create({
      data: {
        userId,
        ticker: stock.ticker,
        name: stock.name,
        date: new Date(),
        mode: mode || 'auto',
        style: style || 'swing',
        score: stock.score || 0,
        priceAtRecommend: stock.price,
        entryLow: stock.entry?.low || stock.price,
        entryHigh: stock.entry?.high || stock.price,
        targetPrice: stock.target,
        stopLoss: stock.stopLoss,
        rrRatio: stock.riskReward || 0,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ success: true, recommendation: rec });
  } catch (error) {
    console.error("Manual Save History Error:", error);
    return NextResponse.json({ error: 'Failed to record to Win Rate History' }, { status: 500 });
  }
}
