const config = require("./config");
const { HttpError, sendJson, clientIp } = require("./lib/http");
const { createRateLimiter } = require("./lib/rateLimit");
const jobs = require("./services/jobs");

const rateCheck = createRateLimiter(config.rateLimitPerMinute);

async function handleApiRequest(req, res, pathname, searchParams) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed.");
    const rl = rateCheck(clientIp(req, config.trustProxy));
    if (!rl.ok) {
      return sendJson(res, 429, { error: "Too many requests. Please slow down." }, { "Retry-After": String(rl.retryAfter) });
    }
    if (pathname === "/api/health") return sendJson(res, 200, { status: "ok", source: config.source });
    const detail = pathname.match(/^\/api\/jobs\/([^/]+)\/details$/);
    if (detail) return sendJson(res, 200, await jobs.details(detail[1]));
    if (pathname === "/api/jobs") {
      return sendJson(res, 200, await jobs.search(jobs.parseQuery(searchParams)));
    }
    throw new HttpError(404, "Not found.");
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    return sendJson(res, status, { error: status === 500 ? "Something went wrong." : err.message });
  }
}

module.exports = { handleApiRequest };
