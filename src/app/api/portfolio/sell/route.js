import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { ticker, price, shares, notes } = body;

    if (!ticker || typeof price !== 'number' || typeof shares !== 'number' || price <= 0 || shares <= 0) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.findFirst({
        where: { userId, ticker }
      });

      if (!portfolio) {
        throw new Error('Portfolio item not found');
      }

      if (shares > portfolio.totalShares) {
        throw new Error('Cannot sell more shares than owned');
      }

      const totalValueObj = price * shares;
      const proportionSold = shares / portfolio.totalShares;
      const originalValueSold = portfolio.investedValue * proportionSold;

      const newTotalShares = portfolio.totalShares - shares;
      const newInvestedValue = portfolio.investedValue - originalValueSold;
      
      // Average price technically remains the same on partial sells
      const newAveragePrice = newTotalShares > 0 ? portfolio.averagePrice : 0;

      const updatedPortfolio = await tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          totalShares: newTotalShares,
          investedValue: newTotalShares > 0 ? newInvestedValue : 0,
          averagePrice: newAveragePrice
        }
      });

      // Create transaction log
      await tx.transaction.create({
        data: {
          portfolioId: portfolio.id,
          ticker,
          type: 'SELL',
          price,
          shares,
          totalValue: totalValueObj,
          notes: notes || 'Jual manual dari Dashboard'
        }
      });

      return updatedPortfolio;
    });

    return NextResponse.json({ success: true, portfolio: result });
  } catch (error) {
    console.error("Portfolio Sell Error:", error);
    return NextResponse.json({ error: 'Gagal menjual saham' }, { status: 500 });
  }
}
