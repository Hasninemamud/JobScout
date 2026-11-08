const config = require("../config");
const { HttpError } = require("../lib/http");
const { TTLCache } = require("../lib/cache");
const providers = {
  api: require("../providers/rapidapi"),
  demo: require("../providers/demo"),
  scrape: require("../providers/linkedinScrape"),
};

const TYPES = ["full-time", "part-time", "contract", "internship", "temporary"];
const cache = new TTLCache(config.cacheTtlMs);
const detailCache = new TTLCache(60 * 60 * 1000, 500); // job descriptions rarely change
const inflightSearches = new Map(); // concurrent identical requests share one upstream call
const inflightDetails = new Map();

// Runs `run` once per key at a time; callers that arrive while it is pending share its result.
function dedupe(inflight, key, run) {
  if (!inflight.has(key)) inflight.set(key, run().finally(() => inflight.delete(key)));
  return inflight.get(key);
}

const clean = (v, max) => (v || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const clamp = (v, min, max, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

// Validate and normalise query-string input.
function parseQuery(sp) {
  const position = clean(sp.get("position"), 100);
  if (!position) throw new HttpError(400, "Please enter a position to search for.");
  const type = clean(sp.get("type"), 20).toLowerCase();
  return {
    position,
    location: clean(sp.get("location"), 100),
    type: TYPES.includes(type) ? type : "",
    remote: ["1", "true"].includes(sp.get("remote")),
    posted: ["1h", "24h", "7d"].includes(sp.get("posted")) ? sp.get("posted") : "7d",
    page: clamp(sp.get("page"), 1, 50, 1),
    limit: clamp(sp.get("limit"), 1, 25, 12),
  };
}

async function search(query) {
  const source = config.source;
  const key = source + JSON.stringify(query);
  const cached = cache.get(key);
  if (cached) return cached;

  return dedupe(inflightSearches, key, async () => {
    const { jobs, hasMore } = await providers[source].search(query);
    const result = { source, demo: source === "demo", page: query.page, hasMore, jobs };
    cache.set(key, result);
    return result;
  });
}

// Full description for a scraped job (fetched on demand to keep request volume low).
async function details(id) {
  if (config.source !== "scrape") throw new HttpError(404, "Not found.");
  if (!/^\d{5,15}$/.test(id)) throw new HttpError(400, "Invalid job id.");
  const cached = detailCache.get(id);
  if (cached) return cached;
  return dedupe(inflightDetails, id, async () => {
    const result = await providers.scrape.details(id);
    detailCache.set(id, result);
    return result;
  });
}

module.exports = { parseQuery, search, details };
