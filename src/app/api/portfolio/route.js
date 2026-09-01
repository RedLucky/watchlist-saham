import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveProvider } from '@/lib/dataService';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const portfolio = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });

    // We only care about active positions (shares > 0)
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
      const floatingPnLPercent = pos.investedValue > 0 ? (floatingPnL / pos.investedValue) * 100 : 0;

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

    const totalFloatingPnL = totalCurrentValue - totalInvested;
    const totalReturnPercent = totalInvested > 0 ? (totalFloatingPnL / totalInvested) * 100 : 0;

    // Calculate Realized PnL from transactions where type === 'SELL'
    let realizedPnL = 0;
    try {
      const sellTransactions = await prisma.transaction.findMany({
        where: {
          portfolio: { userId },
          type: 'SELL'
        }
      });
      realizedPnL = sellTransactions.reduce((acc, t) => acc + (t.totalValue || 0), 0);
    } catch (e) {
      console.warn("Could not query sell transactions:", e.message);
    }

    return NextResponse.json({
      summary: {
        totalInvested,
        totalCurrentValue,
        totalFloatingPnL,
        totalPnL: totalFloatingPnL,
        totalReturnPercent,
        totalPnLPercent: totalReturnPercent,
        realizedPnL
      },
      positions: enrichedPositions
    });

  } catch (error) {
    console.error("Portfolio Fetch Error:", error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
