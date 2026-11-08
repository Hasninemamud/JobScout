const fs = require("fs");
const path = require("path");

// Minimal .env loader (no dependencies). Real environment variables win.
try {
  const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env file: fine */
}

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

module.exports = {
  port: int(process.env.PORT, 3000),
  apiKey: process.env.RAPIDAPI_KEY || "",
  // scrape = LinkedIn, bdjobs = bdjobs.com, all = both, api = RapidAPI provider, demo = sample data.
  // Default: api when a key is set, otherwise all.
  get source() {
    const s = (process.env.JOB_SOURCE || "").toLowerCase();
    if (["scrape", "api", "demo", "bdjobs", "all"].includes(s)) return s;
    return process.env.RAPIDAPI_KEY ? "api" : "all";
  },
  apiHost: process.env.RAPIDAPI_HOST || "linkedin-job-search-api.p.rapidapi.com",
  endpoint1h: process.env.JOBS_ENDPOINT_1H || "/active-jb-1h",
  endpoint24h: process.env.JOBS_ENDPOINT_24H || "/active-jb-24h",
  endpoint7d: process.env.JOBS_ENDPOINT_7D || "/active-jb-7d",
  cacheTtlMs: int(process.env.CACHE_TTL_SECONDS, 300) * 1000,
  rateLimitPerMinute: int(process.env.RATE_LIMIT_PER_MINUTE, 60),
  // Number of reverse proxies in front of this server (0 = none). See clientIp() in lib/http.js.
  trustProxy: int(process.env.TRUST_PROXY, 0),
  // Built React app (run `npm run build`). Override with FRONTEND_DIR.
  publicDir: path.resolve(process.env.FRONTEND_DIR || path.join(__dirname, "..", "frontend", "dist")),
};
