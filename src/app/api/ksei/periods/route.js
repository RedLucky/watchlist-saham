import { NextResponse } from 'next/server';
import { getKseiStoredPeriods } from '@/lib/kseiService';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const periods = await getKseiStoredPeriods();
    
    const countWithKsei = await prisma.stockData.count({
      where: { kseiLatest: { not: null }, isDelisted: false }
    });

    return NextResponse.json({
      periods,
      totalStocksWithKsei: countWithKsei,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API /api/ksei/periods Error]:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar periode KSEI' },
      { status: 500 }
    );
  }
}

