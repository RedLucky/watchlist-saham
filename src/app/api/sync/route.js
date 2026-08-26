import { NextResponse } from 'next/server';
import { fastSyncPrices, deepSyncStock, getTargetTickers } from '@/lib/syncService';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Simple global status tracker (in-memory, works for local single-instance)
let isSyncing = false;
const defaultStatus = {
  current: 0,
  total: 0,
  ticker: '',
  type: '',
  processed: 0,
  success: 0,
  failed: 0,
  lastError: null
};
let syncStatus = { ...defaultStatus };

function resetSyncStatus() {
  syncStatus = { ...defaultStatus };
}

export async function GET() {
  const stats = await prisma.stockData.count();
  const lastSync = await prisma.stockData.findFirst({
    orderBy: { lastPriceSync: 'desc' }
  });

  return NextResponse.json({
    isSyncing,
    syncStatus,
    stats: {
      dbCount: stats,
      lastSyncTime: lastSync?.lastPriceSync || null
    }
  });
}

export async function POST(request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSyncing) {
    return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch (_err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  const { type, ticker } = payload;

  if (type === 'price') {
    void runFastSync();
    return NextResponse.json({ message: 'Fast sync started' });
  }

  if (type === 'deep_all') {
    void runDeepSyncAll();
    return NextResponse.json({ message: 'Deep sync for all started' });
  }

  if (type === 'deep_single' && ticker) {
    isSyncing = true;
    syncStatus = {
      ...defaultStatus,
      type: 'DEEP_SINGLE',
      total: 1,
      current: 1,
      processed: 0,
      ticker: String(ticker).toUpperCase()
    };
    try {
      const result = await deepSyncStock(ticker);
      syncStatus = {
        ...syncStatus,
        processed: 1,
        success: result?.success ? 1 : 0,
        failed: result?.success ? 0 : 1,
        lastError: result?.success ? null : (result?.error || 'Unknown deep sync error')
      };
      return NextResponse.json(result);
    } finally {
      isSyncing = false;
      resetSyncStatus();
    }
  }

  return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
}

async function runFastSync() {
  isSyncing = true;
  let all = [];
  
  try {
    all = await getTargetTickers();
    syncStatus = {
      ...defaultStatus,
      type: 'FAST',
      total: all.length,
      ticker: 'Starting...',
    };
    const updatedCount = await fastSyncPrices(null);
    syncStatus = {
      ...syncStatus,
      current: all.length,
      processed: all.length,
      success: updatedCount,
      failed: Math.max(0, all.length - updatedCount),
      ticker: 'Completed'
    };
  } catch (err) {
    syncStatus = {
      ...syncStatus,
      failed: all.length || 1,
      lastError: err?.message || 'Fast sync failed'
    };
    console.error('[Sync API] runFastSync failed:', err?.message || err);
  } finally {
    isSyncing = false;
    resetSyncStatus();
  }
}

async function runDeepSyncAll() {
  isSyncing = true;
  let tickers = [];

  try {
    tickers = await getTargetTickers();
    syncStatus = {
      ...defaultStatus,
      type: 'DEEP',
      total: tickers.length,
      ticker: 'Starting...'
    };

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      syncStatus = { ...syncStatus, current: i + 1, ticker };
      
      const result = await deepSyncStock(ticker);
      const didSucceed = Boolean(result?.success);
      syncStatus = {
        ...syncStatus,
        processed: i + 1,
        success: syncStatus.success + (didSucceed ? 1 : 0),
        failed: syncStatus.failed + (didSucceed ? 0 : 1),
        lastError: didSucceed ? syncStatus.lastError : (result?.error || 'Unknown deep sync error')
      };
      
      // Delay 2s between deep syncs to be extremely safe
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    syncStatus = {
      ...syncStatus,
      failed: Math.max(syncStatus.failed, 1),
      lastError: err?.message || 'Deep sync loop failed'
    };
    console.error('[Sync API] runDeepSyncAll failed:', err?.message || err);
  } finally {
    isSyncing = false;
    resetSyncStatus();
  }
}
