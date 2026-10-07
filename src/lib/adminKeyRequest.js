/** Admin endpoints that may be called with an admin API key instead of a login session. */
export const ADMIN_KEY_PATHS = ['/api/ksei/ingest'];

/**
 * Tells whether a request targets an admin-key endpoint and carries an admin key header
 * ('x-admin-key' or 'Authorization: Bearer ...'). Used by src/proxy.js to skip the
 * session-cookie check for these requests.
 *
 * This only checks that a key is PRESENT. The route handler must still check that the
 * key is CORRECT (via verifyAdminAccess in src/lib/auth.js).
 *
 * @param {{ nextUrl: { pathname: string }, headers: { get: (name: string) => string | null } }} request - Incoming request.
 * @returns {boolean} True when the request should skip the session-cookie check.
 */
export function isAdminKeyRequest(request) {
  if (!ADMIN_KEY_PATHS.includes(request.nextUrl.pathname)) return false;
  const headerKey = request.headers.get('x-admin-key');
  const authHeader = request.headers.get('authorization');
  return Boolean(headerKey) || Boolean(authHeader?.startsWith('Bearer '));
}
