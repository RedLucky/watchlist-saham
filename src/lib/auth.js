import crypto from 'crypto';

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
 * Verifies administrative authority via:
 * 1. API Key matching process.env.ADMIN_SECRET_KEY via 'x-admin-key' or 'Authorization: Bearer <KEY>'
 * 2. An authenticated user session
 */
export function verifyAdminAccess(request) {
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

  // 2. Check logged-in user session
  const userId = getUserIdFromRequest(request);
  if (userId) {
    return { authorized: true, userId, type: 'USER_SESSION' };
  }

  return { authorized: false, error: 'Unauthorized: Kredensial administratif atau sesi login diperlukan' };
}
