import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveProvider } from '@/lib/dataService';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const portfolio = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });

    // We only care about active positions (shares > 0) or simply all history
    const activePositions = portfolio.filter(p => p.totalShares > 0);

    // Fetch live prices for active positions
    const provider = getActiveProvider();
    const liveStocks = await provider.getStocks();
    
    let totalInvested = 0;
    let totalCurrentValue = 0;

    const enrichedPositions = activePositions.map(pos => {
      const liveData = liveStocks.find(s => s.ticker === pos.ticker);
      const currentPrice = liveData ? liveData.price : pos.averagePrice;
      
      const currentValue = pos.totalShares * currentPrice;
      const floatingPnL = currentValue - pos.investedValue;
      const floatingPnLPercent = (floatingPnL / pos.investedValue) * 100;

      totalInvested += pos.investedValue;
      totalCurrentValue += currentValue;

      return {
        ...pos,
        currentPrice,
        currentValue,
        floatingPnL,
        floatingPnLPercent
      };
    });

    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalInvested,
        totalCurrentValue,
        totalPnL,
        totalPnLPercent
      },
      positions: enrichedPositions
    });

  } catch (error) {
    console.error("Portfolio Fetch Error:", error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
