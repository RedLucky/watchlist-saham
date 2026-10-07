import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { verifyAdminAccess, isAdminUser, signToken } from '../src/lib/auth.js';
import { isAdminKeyRequest } from '../src/lib/adminKeyRequest.js';

/**
 * Builds a minimal fake request with the given headers and cookies.
 * @param {{ headers?: Record<string, string>, cookies?: Record<string, string> }} [opts]
 */
function makeRequest({ headers = {}, cookies = {} } = {}) {
  return {
    headers: { get: (key) => headers[key] ?? null },
    cookies: { get: (key) => (cookies[key] ? { value: cookies[key] } : undefined) },
  };
}

/**
 * Builds a fake Prisma client whose user.findUnique returns `user` (or throws `error`).
 * Records every call in `calls` so tests can check the query.
 */
function makePrismaMock({ user = null, error = null } = {}) {
  const calls = [];
  return {
    calls,
    user: {
      findUnique: async (args) => {
        calls.push(args);
        if (error) throw error;
        return user;
      },
    },
  };
}

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
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_SECRET_KEY = 'unit-test-admin-secret-key-12345';
  delete process.env.ADMIN_EMAIL;

  await t.test('Menolak request tanpa API Key dan tanpa sesi user', async () => {
    const db = makePrismaMock();
    const res = await verifyAdminAccess(makeRequest(), { prisma: db });
    assert.equal(res.authorized, false);
    assert.equal(db.calls.length, 0);
  });

  await t.test('Menerima request dengan header x-admin-key yang valid', async () => {
    const req = makeRequest({ headers: { 'x-admin-key': 'unit-test-admin-secret-key-12345' } });
    const res = await verifyAdminAccess(req, { prisma: makePrismaMock() });
    assert.equal(res.authorized, true);
    assert.equal(res.type, 'API_KEY');
  });

  await t.test('Menerima request dengan Authorization Bearer token yang valid', async () => {
    const req = makeRequest({ headers: { authorization: 'Bearer unit-test-admin-secret-key-12345' } });
    const res = await verifyAdminAccess(req, { prisma: makePrismaMock() });
    assert.equal(res.authorized, true);
    assert.equal(res.type, 'API_KEY');
  });

  await t.test('Menolak request dengan API Key yang salah', async () => {
    const req = makeRequest({ headers: { 'x-admin-key': 'wrong-secret-key' } });
    const res = await verifyAdminAccess(req, { prisma: makePrismaMock() });
    assert.equal(res.authorized, false);
  });

  await t.test('Menerima sesi lama TANPA role di JWT bila role di DB adalah ADMIN', async () => {
    // Token format lama: tidak ada field `role`
    const token = signToken({ userId: 7, email: 'admin@example.test', name: 'Admin' });
    const db = makePrismaMock({ user: { id: 7, email: 'admin@example.test', role: 'ADMIN' } });

    const res = await verifyAdminAccess(makeRequest({ cookies: { auth_token: token } }), { prisma: db });

    assert.equal(res.authorized, true);
    assert.equal(res.type, 'ADMIN_SESSION');
    assert.equal(res.userId, 7);
    assert.equal(db.calls[0].where.id, 7);
  });

  await t.test('Menolak bila JWT mengklaim ADMIN tetapi role di DB sudah USER', async () => {
    const token = signToken({ userId: 8, email: 'user@example.test', name: 'User', role: 'ADMIN' });
    const db = makePrismaMock({ user: { id: 8, email: 'user@example.test', role: 'USER' } });

    const res = await verifyAdminAccess(makeRequest({ cookies: { auth_token: token } }), { prisma: db });
    assert.equal(res.authorized, false);
  });

  await t.test('Menolak bila user di token sudah tidak ada di DB', async () => {
    const token = signToken({ userId: 9, email: 'gone@example.test', name: 'Gone' });
    const db = makePrismaMock({ user: null });

    const res = await verifyAdminAccess(makeRequest({ cookies: { auth_token: token } }), { prisma: db });
    assert.equal(res.authorized, false);
  });

  await t.test('Menolak token dengan signature tidak valid tanpa query DB', async () => {
    const token = signToken({ userId: 10, email: 'x@example.test', name: 'X' });
    const tampered = `${token.slice(0, -2)}xx`;
    const db = makePrismaMock({ user: { id: 10, email: 'x@example.test', role: 'ADMIN' } });

    const res = await verifyAdminAccess(makeRequest({ cookies: { auth_token: tampered } }), { prisma: db });
    assert.equal(res.authorized, false);
    assert.equal(db.calls.length, 0);
  });

  await t.test('Fail closed (menolak) bila query DB gagal', async () => {
    const token = signToken({ userId: 11, email: 'a@example.test', name: 'A' });
    const db = makePrismaMock({ error: new Error('connection refused') });
    const originalError = console.error;
    console.error = () => {}; // keep test output clean; error logging is expected here

    try {
      const res = await verifyAdminAccess(makeRequest({ cookies: { auth_token: token } }), { prisma: db });
      assert.equal(res.authorized, false);
      assert.match(res.error, /Gagal memverifikasi/);
    } finally {
      console.error = originalError;
    }
  });

  // Restore env
  process.env.ADMIN_SECRET_KEY = originalAdminKey;
  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalAdminEmail;
});

test('3. isAdminUser', async (t) => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;

  await t.test('true untuk role ADMIN', () => {
    delete process.env.ADMIN_EMAIL;
    assert.equal(isAdminUser({ email: 'a@example.test', role: 'ADMIN' }), true);
  });

  await t.test('false untuk role USER tanpa ADMIN_EMAIL', () => {
    delete process.env.ADMIN_EMAIL;
    assert.equal(isAdminUser({ email: 'a@example.test', role: 'USER' }), false);
  });

  await t.test('true bila email cocok ADMIN_EMAIL, tidak peka huruf besar/kecil', () => {
    process.env.ADMIN_EMAIL = 'Boss@Example.test';
    assert.equal(isAdminUser({ email: 'boss@example.TEST', role: 'USER' }), true);
  });

  await t.test('false untuk user kosong', () => {
    process.env.ADMIN_EMAIL = 'boss@example.test';
    assert.equal(isAdminUser(null), false);
  });

  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalAdminEmail;
});

test('4. isAdminKeyRequest (proxy bypass)', async (t) => {
  /** Fake NextRequest with a pathname and headers. */
  const req = (pathname, headers = {}) => ({
    nextUrl: { pathname },
    headers: { get: (key) => headers[key] ?? null },
  });

  await t.test('true untuk /api/ksei/ingest dengan x-admin-key', () => {
    assert.equal(isAdminKeyRequest(req('/api/ksei/ingest', { 'x-admin-key': 'k' })), true);
  });

  await t.test('true untuk /api/ksei/ingest dengan Authorization Bearer', () => {
    assert.equal(isAdminKeyRequest(req('/api/ksei/ingest', { authorization: 'Bearer k' })), true);
  });

  await t.test('false untuk /api/ksei/ingest tanpa header key', () => {
    assert.equal(isAdminKeyRequest(req('/api/ksei/ingest')), false);
    assert.equal(isAdminKeyRequest(req('/api/ksei/ingest', { authorization: 'Basic k' })), false);
  });

  await t.test('false untuk path lain walau membawa key', () => {
    assert.equal(isAdminKeyRequest(req('/api/portfolio', { 'x-admin-key': 'k' })), false);
  });
});
