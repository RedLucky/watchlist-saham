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
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        stats: {
          total: 0,
          waiting: 0,
          open: 0,
          closed: 0,
          wins: 0,
          losses: 0,
          expired: 0,
          winRate: '0%',
          winRateNum: 0,
        },
        systemStats: {
          total: 0,
          waiting: 0,
          open: 0,
          closed: 0,
          wins: 0,
          losses: 0,
          expired: 0,
          winRate: '0%',
          winRateNum: 0,
        },
        userStats: {
          total: 0,
          waiting: 0,
          open: 0,
          closed: 0,
          wins: 0,
          losses: 0,
          expired: 0,
          winRate: '0%',
          winRateNum: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const filterSource = searchParams.get('source'); // 'SYSTEM', 'USER', or null/ALL
    const filterStatus = searchParams.get('status'); // 'WAITING', 'OPEN', 'CLOSED', or null/ALL
    const isAll = searchParams.get('all') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    // Base query conditions: User can see their own records, system records, and legacy null user records
    const baseAccessCondition = {
      OR: [
        { userId },
        { source: 'SYSTEM' },
        { userId: null }
      ]
    };

    const andConditions = [baseAccessCondition];

    if (filterSource === 'SYSTEM') {
      andConditions.push({ source: 'SYSTEM' });
    } else if (filterSource === 'USER') {
      andConditions.push({ userId, source: { not: 'SYSTEM' } });
    }

    if (filterStatus === 'WAITING') {
      andConditions.push({ status: 'WAITING_BUY' });
    } else if (filterStatus === 'OPEN') {
      andConditions.push({ status: 'OPEN' });
    } else if (filterStatus === 'CLOSED') {
      andConditions.push({ status: { in: ['WIN', 'LOSS', 'CLOSED', 'EXPIRED'] } });
    }

    const whereClause = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    // Parallel queries: Count matching records, fetch paginated page, and fetch lightweight records for stats
    const [total, recommendations, allUserRecommendations] = await Promise.all([
      prisma.recommendation.count({ where: whereClause }),
      prisma.recommendation.findMany({
        where: whereClause,
        orderBy: {
          date: 'desc',
        },
        skip: isAll ? undefined : skip,
        take: isAll ? undefined : limit,
      }),
      prisma.recommendation.findMany({
        where: baseAccessCondition,
        select: {
          id: true,
          source: true,
          userId: true,
          status: true,
        },
      }),
    ]);

    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    // Fetch current live prices from StockData only for unique tickers in current page
    const tickers = [...new Set(recommendations.map(r => r.ticker).filter(Boolean))];
    const liveStocks = tickers.length > 0 ? await prisma.stockData.findMany({
      where: { ticker: { in: tickers } },
      select: { ticker: true, price: true, changePercent: true }
    }) : [];
    const priceMap = new Map(liveStocks.map(s => [s.ticker, { price: s.price, changePercent: s.changePercent }]));

    const enrichedRecommendations = recommendations.map(rec => {
      const live = priceMap.get(rec.ticker);
      const currentPrice = live ? live.price : null;
      const currentChangePercent = live ? live.changePercent : null;
      
      const entryPrice = rec.priceAtRecommend || rec.entryLow || 0;
      let floatingGainPercent = null;
      if (currentPrice != null && entryPrice > 0) {
        floatingGainPercent = Number((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2));
      }

      return {
        ...rec,
        currentPrice,
        currentChangePercent,
        floatingGainPercent
      };
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

    const systemItems = allUserRecommendations.filter(r => r.source === 'SYSTEM');
    const userItems = allUserRecommendations.filter(r => r.source !== 'SYSTEM' && r.userId === userId);

    return NextResponse.json({
      recommendations: enrichedRecommendations,
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        totalPages,
        hasNextPage: isAll ? false : page < totalPages,
        hasPrevPage: isAll ? false : page > 1,
      },
      stats: computeStats(allUserRecommendations),
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
