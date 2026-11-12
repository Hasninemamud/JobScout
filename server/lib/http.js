const zlib = require("zlib");

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
  let payload = JSON.stringify(body);
  // Job lists carry long descriptions (100 KB+), so compress when the client allows it.
  const gzip = payload.length > 1024 && /\bgzip\b/.test(res.req?.headers["accept-encoding"] || "");
  if (gzip) payload = zlib.gzipSync(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Accept-Encoding",
    ...(gzip && { "Content-Encoding": "gzip" }),
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(payload);
}

/** GET a URL and return its body text. Every failure becomes an HttpError that names the site. */
async function fetchText(url, name, { headers, timeoutMs = 12_000, throttled = [429] } = {}) {
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new HttpError(504, `${name} did not respond in time. Please try again.`);
  }
  if (throttled.includes(res.status)) {
    throw new HttpError(503, `${name} is temporarily throttling requests. Wait a minute and try again.`);
  }
  if (!res.ok) throw new HttpError(502, `${name} returned an unexpected response (${res.status}).`);
  try {
    return await res.text();
  } catch (err) {
    throw err?.name === "TimeoutError"
      ? new HttpError(504, `${name} did not respond in time. Please try again.`)
      : new HttpError(502, `${name} returned an unreadable response.`);
  }
}

async function fetchJson(url, name, options) {
  try {
    return JSON.parse(await fetchText(url, name, options));
  } catch (err) {
    throw err instanceof HttpError ? err : new HttpError(502, `${name} returned an unreadable response.`);
  }
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

module.exports = { HttpError, SECURITY_HEADERS, sendJson, clientIp, fetchText, fetchJson };
