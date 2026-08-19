import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verifyPassword(password, storedHash) {
  if (!storedHash.includes(':')) {
    // Legacy support for SHA-256 (seamless upgrade)
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (legacyHash === storedHash) {
      return { isValid: true, needsUpgrade: true };
    }
    return { isValid: false, needsUpgrade: false };
  }
  
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  const isValid = key.length === derivedKey.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(derivedKey));
  return { isValid, needsUpgrade: false };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan Password wajib diisi' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Email atau Password salah' }, { status: 401 });
    }

    const verification = verifyPassword(password, user.password);
    
    if (!verification.isValid) {
      return NextResponse.json({ error: 'Email atau Password salah' }, { status: 401 });
    }

    // Update lastLoginAt and handle seamless password upgrade if needed
    const updateData = { lastLoginAt: new Date() };
    if (verification.needsUpgrade) {
      updateData.password = hashPassword(password);
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    const token = signToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, riskProfile: user.riskProfile }
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err) {
    console.error('[auth/login] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
