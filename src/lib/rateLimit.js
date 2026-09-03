/**
 * Simple in-memory sliding window rate limiter
 * Protects auth and sensitive mutation endpoints against brute-force attacks.
 */

const hitMap = new Map();

// Periodic cleanup of stale entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hitMap.entries()) {
      if (now > record.resetTime) {
        hitMap.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Check if an action by an identifier (e.g. client IP or email) is within rate limits.
 * @param {string} identifier - Unique client identifier (IP address, email, etc.)
 * @param {Object} options
 * @param {number} options.max - Maximum allowed attempts within the window (default: 5)
 * @param {number} options.windowMs - Time window in milliseconds (default: 5 minutes)
 * @returns {{ isLimited: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(identifier, { max = 5, windowMs = 5 * 60 * 1000 } = {}) {
  if (!identifier) return { isLimited: false, remaining: max, resetTime: Date.now() + windowMs };

  const now = Date.now();
  const existing = hitMap.get(identifier);

  if (!existing || now > existing.resetTime) {
    hitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { isLimited: false, remaining: max - 1, resetTime: now + windowMs };
  }

  existing.count++;
  if (existing.count > max) {
    return { isLimited: true, remaining: 0, resetTime: existing.resetTime };
  }

  return { isLimited: false, remaining: max - existing.count, resetTime: existing.resetTime };
}

/**
 * Extract client IP from Next.js request headers
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const forwarded = request.headers?.get?.('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers?.get?.('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
