import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, riskProfile: true, lastLoginAt: true }
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Update lastLoginAt daily to track Daily Active Users (DAU) accurately despite 30-day JWT
    const now = new Date();
    const isNewDay = !user.lastLoginAt || 
      user.lastLoginAt.getDate() !== now.getDate() || 
      user.lastLoginAt.getMonth() !== now.getMonth() || 
      user.lastLoginAt.getFullYear() !== now.getFullYear();

    if (isNewDay) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now }
      });
    }

    // Remove lastLoginAt from response to keep payload clean
    const { lastLoginAt, ...userResponse } = user;

    return NextResponse.json({ user: userResponse });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
