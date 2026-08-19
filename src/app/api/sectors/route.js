// GET /api/sectors
// Returns sector strength rankings

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { calculateSectorStrengths } from '@/lib/sectorRotation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const provider = getActiveProvider();
  const sectorPerformance = await provider.getSectorPerformance();
  const { ranked } = calculateSectorStrengths(sectorPerformance);

  return NextResponse.json({
    sectors: ranked,
    lastUpdated: new Date().toISOString(),
  });
}
