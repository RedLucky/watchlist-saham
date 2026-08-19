import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ params: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { riskProfile: true, customPreset: true }
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[user/pension-params GET] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const { riskProfile } = body;

    if (userId && riskProfile) {
      await prisma.user.update({
        where: { id: userId },
        data: { riskProfile }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[user/pension-params POST] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
