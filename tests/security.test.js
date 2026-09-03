import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { verifyAdminAccess } from '../src/lib/auth.js';

test('1. Rate Limiter Security Suite', async (t) => {
  await t.test('Mengizinkan request dalam batas maksimum dan memblokir saat melebihi batas', () => {
    const testId = `ip_test_${Date.now()}`;
    const opts = { max: 3, windowMs: 1000 };

    const req1 = checkRateLimit(testId, opts);
    assert.equal(req1.isLimited, false);
    assert.equal(req1.remaining, 2);

    const req2 = checkRateLimit(testId, opts);
    assert.equal(req2.isLimited, false);
    assert.equal(req2.remaining, 1);

    const req3 = checkRateLimit(testId, opts);
    assert.equal(req3.isLimited, false);
    assert.equal(req3.remaining, 0);

    // Attempt ke-4 harus terblokir
    const req4 = checkRateLimit(testId, opts);
    assert.equal(req4.isLimited, true);
    assert.equal(req4.remaining, 0);
  });
});

test('2. Admin Access Control Security Suite', async (t) => {
  const originalAdminKey = process.env.ADMIN_SECRET_KEY;
  process.env.ADMIN_SECRET_KEY = 'unit-test-admin-secret-key-12345';

  await t.test('Menolak request tanpa API Key dan tanpa sesi user', () => {
    const mockRequest = {
      headers: new Map(),
      cookies: new Map()
    };
    mockRequest.headers.get = (k) => null;
    mockRequest.cookies.get = (k) => null;

    const res = verifyAdminAccess(mockRequest);
    assert.equal(res.authorized, false);
  });

  await t.test('Menerima request dengan header x-admin-key yang valid', () => {
    const mockRequest = {
      headers: {
        get: (key) => {
          if (key === 'x-admin-key') return 'unit-test-admin-secret-key-12345';
          return null;
        }
      },
      cookies: { get: () => null }
    };

    const res = verifyAdminAccess(mockRequest);
    assert.equal(res.authorized, true);
    assert.equal(res.type, 'API_KEY');
  });

  await t.test('Menerima request dengan Authorization Bearer token yang valid', () => {
    const mockRequest = {
      headers: {
        get: (key) => {
          if (key === 'authorization') return 'Bearer unit-test-admin-secret-key-12345';
          return null;
        }
      },
      cookies: { get: () => null }
    };

    const res = verifyAdminAccess(mockRequest);
    assert.equal(res.authorized, true);
    assert.equal(res.type, 'API_KEY');
  });

  await t.test('Menolak request dengan API Key yang salah', () => {
    const mockRequest = {
      headers: {
        get: (key) => {
          if (key === 'x-admin-key') return 'wrong-secret-key';
          return null;
        }
      },
      cookies: { get: () => null }
    };

    const res = verifyAdminAccess(mockRequest);
    assert.equal(res.authorized, false);
  });

  // Restore env
  process.env.ADMIN_SECRET_KEY = originalAdminKey;
});
