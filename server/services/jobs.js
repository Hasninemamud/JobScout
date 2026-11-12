const config = require("../config");
const { HttpError } = require("../lib/http");
const { TTLCache } = require("../lib/cache");
const { sortNewestFirst } = require("../lib/jobs");
const providers = {
  api: require("../providers/rapidapi"),
  demo: require("../providers/demo"),
  scrape: require("../providers/linkedinScrape"),
  bdjobs: require("../providers/bdjobs"),
  remote: require("../providers/remote"),
};

// LinkedIn + bdjobs + the remote job boards together. One failing site must not hide the other's jobs.
const SITE_PROVIDER = { linkedin: "scrape", bdjobs: "bdjobs", remote: "remote" }; // other sites are single remote boards
const SITES = [...Object.keys(SITE_PROVIDER), "remotive", "remoteok", "weworkremotely", "himalayas"];
providers.all = {
  async search(query) {
    const chosen = query.site ? [providers[SITE_PROVIDER[query.site] || "remote"]] : [providers.scrape, providers.bdjobs, providers.remote];
    const parts = await Promise.allSettled(chosen.map((p) => p.search(query)));
    const ok = parts.filter((p) => p.status === "fulfilled").map((p) => p.value);
    if (!ok.length) throw parts[0].reason;
    return { jobs: sortNewestFirst(ok.flatMap((r) => r.jobs)), hasMore: ok.some((r) => r.hasMore), partial: ok.length < parts.length || ok.some((r) => r.partial) };
  },
};

const TYPES = ["full-time", "part-time", "contract", "internship", "temporary"];
const cache = new TTLCache(config.cacheTtlMs);
const partialCache = new TTLCache(30_000); // half-failed searches: short, so a throttled site is not asked again on every click
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
  const company = clean(sp.get("company"), 100);
  if (!position && !company) throw new HttpError(400, "Please enter a position or company to search for.");
  const type = clean(sp.get("type"), 20).toLowerCase();
  return {
    position,
    company,
    site: SITES.includes(sp.get("site")) ? sp.get("site") : "", // only used when several sites are searched together
    location: clean(sp.get("location"), 100),
    type: TYPES.includes(type) ? type : "",
    remote: ["1", "true"].includes(sp.get("remote")),
    posted: ["1h", "24h", "7d", "30d"].includes(sp.get("posted")) ? sp.get("posted") : "7d",
    page: clamp(sp.get("page"), 1, 50, 1),
    limit: clamp(sp.get("limit"), 1, 25, 12),
  };
}

async function search(query) {
  const source = config.source;
  const key = source + JSON.stringify(query);
  const cached = cache.get(key) || partialCache.get(key);
  if (cached) return cached;

  return dedupe(inflightSearches, key, async () => {
    const { jobs, hasMore, partial } = await providers[source].search(query);
    const result = { source, demo: source === "demo", page: query.page, hasMore, jobs, ...(partial && { partial }) };
    (partial ? partialCache : cache).set(key, result); // a half-failed search must not hide a site for the whole TTL
    return result;
  });
}

// Full description for a scraped job (fetched on demand to keep request volume low).
async function details(id) {
  const bd = id.startsWith("bd-"); // bdjobs ids are prefixed so they never clash with LinkedIn's
  const source = bd ? "bdjobs" : ["scrape", "all"].includes(config.source) ? "scrape" : null;
  const raw = bd ? id.slice(3) : id;
  if (!source || (bd && !["bdjobs", "all"].includes(config.source))) throw new HttpError(404, "Not found.");
  if (!/^\d{5,15}$/.test(raw)) throw new HttpError(400, "Invalid job id.");
  const cached = detailCache.get(id);
  if (cached) return cached;
  return dedupe(inflightDetails, id, async () => {
    const result = await providers[source].details(raw);
    detailCache.set(id, result);
    return result;
  });
}

module.exports = { parseQuery, search, details };
