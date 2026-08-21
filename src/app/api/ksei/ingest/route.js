import { NextResponse } from 'next/server';
import { ingestKseiText } from '@/lib/kseiService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    let rawText = '';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      rawText = body.data || body.text || '';
    } else {
      rawText = await request.text();
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Payload data kosong. Silakan kirimkan teks KSEI pipe-delimited.' },
        { status: 400 }
      );
    }

    const result = await ingestKseiText(rawText);

    return NextResponse.json({
      message: `Berhasil memproses ${result.updatedCount} saham untuk periode ${result.snapshotDate}`,
      result,
    });
  } catch (error) {
    console.error('[API /api/ksei/ingest Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses data KSEI' },
      { status: 500 }
    );
  }
}

