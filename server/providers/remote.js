const { fetchText, fetchJson } = require("../lib/http");
const { WINDOW_MS, matchesType, matchesCompany, matchesPosition } = require("../lib/jobFilters");
const { mapType, makeId, safeHttpUrl, sortNewestFirst } = require("../lib/jobs");
const { decode, htmlToText } = require("../lib/html");

// Remote-only job boards that publish a public feed/API meant for reuse: Remotive, RemoteOK,
// We Work Remotely and Himalayas. Each card links back to the original posting (their terms require it).
// Remotive asks for at most ~4 fetches a day, so whole-feed sites are fetched once, cached, and filtered here.
const HEADERS = { "User-Agent": "JobScout/1.0 (personal job search tool; links back to each source)" };
const HIMALAYAS_PAGE = 20;
const ANYWHERE_RE = /worldwide|anywhere|global/i;

const getText = (url, name) => fetchText(url, name, { headers: HEADERS, timeoutMs: 15_000 });
const getJson = (url, name) => fetchJson(url, name, { headers: HEADERS, timeoutMs: 15_000 });

const feedCache = new Map(); // name -> { at, promise }; failures are dropped so the next search retries
function cached(name, ttlMs, load) {
  const hit = feedCache.get(name);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = load();
  feedCache.set(name, { at: Date.now(), promise });
  promise.catch(() => feedCache.delete(name));
  return promise;
}

const toIso = (v) => {
  const t = typeof v === "number" || /^\d+$/.test(String(v)) ? Number(v) * 1000 : Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

function job({ title, company, logo, location, type, postedAt, description, url }) {
  const safe = safeHttpUrl(url);
  if (!safe || !title) return null;
  return {
    id: makeId(safe),
    title: String(title),
    company: String(company || "Unknown company"),
    companyUrl: null,
    logo: safeHttpUrl(logo),
    location: location || "Remote",
    remote: true,
    type: mapType(type),
    postedAt,
    description: htmlToText(String(description || "")).slice(0, 8000),
    url: safe,
  };
}

// ---------- parsers (exported for tests) ----------
const parseRemotive = (d) =>
  (d.jobs || []).map((j) =>
    job({ title: j.title, company: j.company_name, logo: j.company_logo, location: j.candidate_required_location, type: j.job_type,
      postedAt: toIso(`${j.publication_date}Z`), description: j.description, url: j.url }),
  );

const parseRemoteOk = (d) =>
  (Array.isArray(d) ? d : []).filter((j) => j.position).map((j) =>
    job({ title: j.position, company: j.company, logo: j.company_logo || j.logo, location: j.location, type: "",
      postedAt: toIso(j.date), description: j.description, url: j.url }),
  );

const parseHimalayas = (d) =>
  (d.jobs || []).map((j) =>
    job({ title: j.title, company: j.companyName, logo: j.companyLogo, location: [].concat(j.locationRestrictions || []).join(", "),
      type: j.employmentType, postedAt: toIso(j.pubDate), description: j.description, url: j.applicationLink || j.guid }),
  );

function parseWeWorkRemotely(xml) {
  const tag = (s, t) => decode((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] ?? "").trim();
  return xml.split("<item>").slice(1).map((it) => {
    const [first, ...rest] = tag(it, "title").split(": "); // titles look like "Company: Job title"
    return job({ title: rest.length ? rest.join(": ") : first, company: rest.length ? first : "", location: tag(it, "region"),
      type: tag(it, "type"), postedAt: toIso(tag(it, "pubDate")), description: tag(it, "description"), url: tag(it, "link") });
  });
}

// ---------- sites ----------
// Whole-feed sites: fetched once per TTL, then filtered and paged here.
const FEEDS = [
  { key: "remotive", name: "Remotive", ttl: 6 * 36e5, load: async () => parseRemotive(await getJson("https://remotive.com/api/remote-jobs", "Remotive")) },
  { key: "remoteok", name: "RemoteOK", ttl: 30 * 6e4, load: async () => parseRemoteOk(await getJson("https://remoteok.com/api", "RemoteOK")) },
  { key: "weworkremotely", name: "We Work Remotely", ttl: 30 * 6e4, load: async () => parseWeWorkRemotely(await getText("https://weworkremotely.com/remote-jobs.rss", "We Work Remotely")) },
];

function fits(j, { position, company, location, type, posted }) {
  const loc = location.toLowerCase();
  return (
    Date.parse(j.postedAt) >= Date.now() - WINDOW_MS[posted] &&
    matchesPosition(j, position) &&
    matchesCompany(j, company) &&
    // A remote job open "worldwide" fits any location; otherwise its allowed regions must mention it.
    (!loc || ANYWHERE_RE.test(j.location) || j.location === "Remote" || j.location.toLowerCase().includes(loc)) &&
    matchesType(j, type)
  );
}

async function searchFeed(feed, q) {
  const all = (await cached(feed.name, feed.ttl, feed.load)).filter(Boolean);
  const matches = sortNewestFirst(all.filter((j) => fits(j, q)));
  const start = (q.page - 1) * q.limit;
  return { jobs: matches.slice(start, start + q.limit), hasMore: start + q.limit < matches.length };
}

// Himalayas has too many jobs to mirror, so it is searched per query (20 per page).
async function searchHimalayas(q) {
  const qs = new URLSearchParams({ q: q.position || q.company, sort: "recent", page: String(q.page) });
  const d = await getJson(`https://himalayas.app/jobs/api/search?${qs}`, "Himalayas");
  return {
    jobs: parseHimalayas(d).filter(Boolean).filter((j) => fits(j, q)),
    hasMore: Number(d.totalCount) > q.page * HIMALAYAS_PAGE && q.page < 40,
  };
}

async function search(q) {
  // q.site is "" or "remote" for every board, or the key of one board.
  const want = (key) => !q.site || q.site === "remote" || q.site === key;
  const parts = await Promise.allSettled([
    ...FEEDS.filter((f) => want(f.key)).map((f) => searchFeed(f, q)),
    ...(want("himalayas") ? [searchHimalayas(q)] : []),
  ]);
  const ok = parts.filter((p) => p.status === "fulfilled").map((p) => p.value);
  if (!ok.length) throw parts[0].reason;
  return {
    jobs: sortNewestFirst(ok.flatMap((r) => r.jobs)),
    hasMore: ok.some((r) => r.hasMore),
    partial: ok.length < parts.length,
  };
}

module.exports = { search, parseRemotive, parseRemoteOk, parseHimalayas, parseWeWorkRemotely };
