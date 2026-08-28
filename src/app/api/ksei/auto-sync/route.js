import { NextResponse } from 'next/server';
import { getAvailableKseiPublications, autoSyncKseiData } from '@/lib/kseiAutoSyncService';
import { getKseiStoredPeriods } from '@/lib/kseiService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for Puppeteer & zip ingestion

/**
 * GET /api/ksei/auto-sync
 * Checks available publications on KSEI portal against database stored periods
 */
export async function GET() {
  try {
    const storedPeriods = await getKseiStoredPeriods();
    const publications = await getAvailableKseiPublications();

    const items = publications.map(pub => {
      const isSynced = storedPeriods.some(sp => {
        if (!sp) return false;
        const str = String(sp).toUpperCase();
        if (pub.dateFormatted && str.includes(pub.dateFormatted)) return true;
        if (pub.monthCode && str.includes(pub.monthCode)) return true;
        return false;
      });

      return {
        ...pub,
        isSynced,
      };
    });

    const unsyncedCount = items.filter(i => !i.isSynced).length;

    return NextResponse.json({
      success: true,
      publications: items,
      storedPeriods,
      unsyncedCount,
      totalAvailable: items.length,
    });
  } catch (error) {
    console.error('[API /api/ksei/auto-sync GET error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memeriksa daftar publikasi KSEI.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ksei/auto-sync
 * Automatically downloads, extracts, and ingests missing KSEI ZIP datasets
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { specificZipUrl, targetMonthCode } = body;

    const syncResult = await autoSyncKseiData({
      specificZipUrl,
      targetMonthCode
    });

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error('[API /api/ksei/auto-sync POST error]:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat sinkronisasi otomatis KSEI.' },
      { status: 500 }
    );
  }
}
