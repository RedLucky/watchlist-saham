import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customPreset } = await request.json(); // This will be an array of tickers or null

    await prisma.user.update({
      where: { id: userId },
      data: { 
        customPreset: customPreset ? JSON.stringify(customPreset) : null 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[user/preset] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
