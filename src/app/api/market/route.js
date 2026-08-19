// GET /api/market
// Returns market overview and auto-detected mode

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { detectMarketMode, getModeConfig } from '@/lib/modes';

export const dynamic = 'force-dynamic';

export async function GET() {
  const provider = getActiveProvider();
  const marketData = await provider.getMarketData();
  
  const detectedMode = detectMarketMode(marketData);
  const modeConfig = getModeConfig(detectedMode);

  return NextResponse.json({
    index: {
      name: marketData.indexName,
      value: marketData.indexValue,
      change: marketData.indexChange,
      trend: marketData.indexTrend,
    },
    volume: {
      vsAverage: marketData.volumeVsAvg,
    },
    advanceDecline: marketData.advanceDecline,
    autoMode: {
      name: modeConfig.name,
      label: modeConfig.label,
      emoji: modeConfig.emoji,
      description: modeConfig.description,
    },
    lastUpdated: new Date().toISOString(),
  });
}
