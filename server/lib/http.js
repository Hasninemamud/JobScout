class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(payload);
}

/**
 * The address used to rate-limit a client.
 * Behind N trusted reverse proxies (TRUST_PROXY=N) every request arrives from the proxy's address, so the real
 * client is the Nth entry from the right of X-Forwarded-For (the entries to its left can be forged by the client).
 * With no trusted proxy the header is ignored entirely.
 */
function clientIp(req, trustedProxies = 0) {
  if (trustedProxies > 0) {
    const hops = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
    const forwarded = hops[hops.length - trustedProxies];
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

module.exports = { HttpError, SECURITY_HEADERS, sendJson, clientIp };
