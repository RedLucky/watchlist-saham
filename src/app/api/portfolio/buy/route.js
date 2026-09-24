import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const IDX_LOT_SIZE = 100;
    if (!ticker || typeof price !== 'number' || typeof shares !== 'number' || price <= 0 || shares <= 0) {
      return NextResponse.json({ error: 'Data input tidak valid' }, { status: 400 });
    }

    if (shares % IDX_LOT_SIZE !== 0) {
      return NextResponse.json({ 
        error: `Jumlah saham harus kelipatan 1 lot (${IDX_LOT_SIZE} lembar). Contoh: ${Math.round(shares / IDX_LOT_SIZE) * IDX_LOT_SIZE} lembar.` 
      }, { status: 400 });
    }

    const totalValue = price * shares;

    // Use a transaction since we update both Portfolio and create Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create portfolio item
      let portfolio = await tx.portfolio.findFirst({
        where: { userId, ticker }
      });

      if (!portfolio) {
        portfolio = await tx.portfolio.create({
          data: {
            userId,
            ticker,
            name,
            sector: sector || '',
            totalShares: shares,
            investedValue: totalValue,
            averagePrice: price
          }
        });
      } else {
        // Calculate new average price
        const newTotalShares = portfolio.totalShares + shares;
        const newInvestedValue = portfolio.investedValue + totalValue;
        const newAveragePrice = newInvestedValue / newTotalShares;

        portfolio = await tx.portfolio.update({
          where: { id: portfolio.id },
          data: {
            totalShares: newTotalShares,
            investedValue: newInvestedValue,
            averagePrice: newAveragePrice
          }
        });
      }

      // Create transaction log
      await tx.transaction.create({
        data: {
          portfolioId: portfolio.id,
          ticker,
          type: 'BUY',
          price,
          shares,
          totalValue,
          notes: notes || 'Pelian manual dari Dashboard'
        }
      });

      return portfolio;
    });

    return NextResponse.json({ success: true, portfolio: result });
  } catch (error) {
    console.error("Portfolio Buy Error:", error);
    return NextResponse.json({ error: 'Failed to record buy transaction' }, { status: 500 });
  }
}
