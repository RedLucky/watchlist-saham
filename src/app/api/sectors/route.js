// GET /api/sectors
// Returns sector strength rankings

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { calculateSectorStrengths } from '@/lib/sectorRotation';
import { calculateSectorRrg } from '@/lib/sectorRrgEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const provider = getActiveProvider();
  const sectorPerformance = await provider.getSectorPerformance();
  const { ranked } = calculateSectorStrengths(sectorPerformance);
  const rrg = calculateSectorRrg({ sectorPerformance });

  return NextResponse.json({
    sectors: ranked,
    rrg,
    lastUpdated: new Date().toISOString(),
  });
}
