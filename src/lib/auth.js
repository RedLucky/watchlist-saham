import crypto from 'crypto';
import { prisma } from './prisma.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return 'build_time_static_dummy_secret_not_valid_for_runtime';
    }
    if (process.env.NODE_ENV === 'test') {
      return 'test_environment_temporary_jwt_secret_key_123';
    }
    throw new Error("FATAL SECURITY CONFIGURATION: process.env.JWT_SECRET must be defined in production runtime!");
  }
  return secret;
}

function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signToken(payload) {
  const secret = getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(tokenPayload));
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const secret = getJwtSecret();
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(encodedPayload));

    // Check token expiry
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

export function getUserIdFromRequest(request) {
  const token = request.cookies?.get?.('auth_token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

/**
 * Checks whether a request is allowed to use admin-only endpoints.
 *
 * Access is granted when either:
 * 1. The request sends the admin API key (process.env.ADMIN_SECRET_KEY) via the
 *    'x-admin-key' header or 'Authorization: Bearer <KEY>'.
 * 2. The request has a valid 'auth_token' session cookie AND the user stored in the
 *    database currently has role 'ADMIN' or the email in process.env.ADMIN_EMAIL.
 *
 * The role is read from the database instead of the JWT on purpose: tokens live for
 * 30 days, so a role inside the token goes stale (older tokens have no role at all,
 * and a role change in the database would not take effect until the next login).
 *
 * @param {Request} request - Incoming Next.js request (needs `headers.get` and `cookies.get`).
 * @param {{ prisma?: { user: { findUnique: Function } } }} [deps] - Optional dependencies, used by unit tests to inject a mocked Prisma client.
 * @returns {Promise<{ authorized: boolean, type?: 'API_KEY' | 'ADMIN_SESSION', userId?: number, error?: string }>}
 */
export async function verifyAdminAccess(request, deps = {}) {
  const db = deps.prisma || prisma;
  const adminKey = process.env.ADMIN_SECRET_KEY;
  
  // 1. Check API Key header
  const headerKey = request.headers?.get?.('x-admin-key');
  const authHeader = request.headers?.get?.('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const providedKey = headerKey || bearerKey;

  if (adminKey && providedKey) {
    const bufA = Buffer.from(providedKey);
    const bufB = Buffer.from(adminKey);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return { authorized: true, type: 'API_KEY' };
    }
  }

  // 2. Check logged-in user session. The token only proves WHO the user is;
  // whether they are an admin is looked up fresh from the database.
  const token = request.cookies?.get?.('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (payload?.userId) {
    try {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true },
      });
      if (user && isAdminUser(user)) {
        return { authorized: true, userId: user.id, type: 'ADMIN_SESSION' };
      }
    } catch (err) {
      // Fail closed: if the database is unreachable we cannot confirm admin rights.
      console.error('[verifyAdminAccess] Failed to load user role', { userId: payload.userId, error: err.message });
      return { authorized: false, error: 'Unauthorized: Gagal memverifikasi akses Admin' };
    }
  }

  return { authorized: false, error: 'Unauthorized: Login sebagai Admin atau sertakan Admin Key diperlukan' };
}

/**
 * Decides whether a database user record counts as an admin.
 * A user is an admin when their role is 'ADMIN', or when their email matches
 * process.env.ADMIN_EMAIL (compared case-insensitively, same as registration).
 *
 * @param {{ email?: string, role?: string }} user - User record from the database.
 * @returns {boolean} True when the user has admin rights.
 */
export function isAdminUser(user) {
  if (user?.role === 'ADMIN') return true;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !user?.email) return false;
  return user.email.toLowerCase() === adminEmail.toLowerCase();
}
