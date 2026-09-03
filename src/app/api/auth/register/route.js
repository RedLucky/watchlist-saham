import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`register:${clientIp}`, { max: 5, windowMs: 15 * 60 * 1000 });
    if (rateCheck.isLimited) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pendaftaran dari jaringan Anda. Silakan coba lagi setelah 15 menit.' },
        { status: 429 }
      );
    }

    const { name, email, password, riskProfile, agreeTnc } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nama, Email, dan Password wajib diisi' }, { status: 400 });
    }

    if (!agreeTnc) {
      return NextResponse.json({ error: 'Anda harus menyetujui Ketentuan Layanan & Disclaimer untuk mendaftar.' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        riskProfile: riskProfile || 'MODERATE',
        hasAgreedTnc: true
      }
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
    console.error('[auth/register] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
