import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    
    // If not authenticated, return empty stats dataset instead of breaking the UI with 401
    if (!userId) {
      return NextResponse.json({
        recommendations: [],
        stats: {
          total: 0,
          waiting: 0,
          open: 0,
          closed: 0,
          wins: 0,
          losses: 0,
          expired: 0,
          winRate: '0%',
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const filterSource = searchParams.get('source'); // 'SYSTEM', 'USER', or null/ALL

    // Base query conditions: User can see their own records, system records, and legacy null user records
    let whereClause = {
      OR: [
        { userId },
        { source: 'SYSTEM' },
        { userId: null }
      ]
    };

    if (filterSource === 'SYSTEM') {
      whereClause = { source: 'SYSTEM' };
    } else if (filterSource === 'USER') {
      whereClause = { userId, source: 'USER' };
    }

    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc',
      },
      take: 100,
    });

    // Helper to calculate Win Rate and breakdown
    const computeStats = (items) => {
      const waiting = items.filter(r => r.status === 'WAITING_BUY').length;
      const open = items.filter(r => r.status === 'OPEN').length;
      const wins = items.filter(r => r.status === 'WIN').length;
      const losses = items.filter(r => r.status === 'LOSS').length;
      const expired = items.filter(r => r.status === 'EXPIRED' || r.status === 'CANCELLED').length;
      const closed = items.filter(r => ['WIN', 'LOSS', 'CLOSED', 'EXPIRED'].includes(r.status));
      const resolvedTrades = wins + losses;
      const winRateNum = resolvedTrades > 0 ? Math.round((wins / resolvedTrades) * 100) : 0;

      return {
        total: items.length,
        waiting,
        open,
        closed: closed.length,
        wins,
        losses,
        expired,
        winRate: `${winRateNum}%`,
        winRateNum
      };
    };

    // Calculate comparative stats
    const allUserRecommendations = await prisma.recommendation.findMany({
      where: {
        OR: [
          { userId },
          { source: 'SYSTEM' },
          { userId: null }
        ]
      }
    });

    const systemItems = allUserRecommendations.filter(r => r.source === 'SYSTEM');
    const userItems = allUserRecommendations.filter(r => r.source !== 'SYSTEM' && r.userId === userId);

    return NextResponse.json({
      recommendations,
      stats: computeStats(recommendations),
      systemStats: computeStats(systemItems),
      userStats: computeStats(userItems),
    });
  } catch (error) {
    console.error("GET History Error:", error);
    return NextResponse.json({ error: 'Gagal memuat riwayat' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { stock, style, mode, isAlreadyBought } = data;

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

    const initialStatus = isAlreadyBought ? 'OPEN' : 'WAITING_BUY';
    const notes = isAlreadyBought 
      ? `Sudah beli pada harga Rp ${stock.price}`
      : `Antri beli pada harga Rp ${stock.price}. Menunggu harga pasar turun menyentuh level beli.`;

    const rec = await prisma.recommendation.create({
      data: {
        userId,
        source: 'USER',
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
        status: initialStatus,
        notes,
      },
    });

    return NextResponse.json({ success: true, recommendation: rec });
  } catch (error) {
    console.error("Manual Save History Error:", error);
    return NextResponse.json({ error: 'Failed to record to Win Rate History' }, { status: 500 });
  }
}
