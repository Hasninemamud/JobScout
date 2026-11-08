// Fixed-window per-IP rate limiter. Returns { ok, retryAfter }.
function createRateLimiter(limit, windowMs = 60_000) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref();

  return function check(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  };
}

module.exports = { createRateLimiter };
