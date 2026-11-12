const { HttpError, fetchText } = require("../lib/http");
const { matchesType, matchesCompany, REMOTE_RE, TYPE_RULES } = require("../lib/jobFilters");
const { mapType, safeHttpUrl, sortNewestFirst } = require("../lib/jobs");
const { decode, stripTags, htmlToText } = require("../lib/html");

// Reads LinkedIn's public, logged-in-free "guest" job pages (the same HTML fragments its own
// job search page loads for signed-out visitors). No account or cookies are used.
// NOTE: automated access is against LinkedIn's Terms of Service, and the markup can change
// without notice. Keep volume low; results are cached by the service layer.
const BASE = "https://www.linkedin.com/jobs-guest/jobs/api";
const PAGE_SIZE = 10; // LinkedIn returns 10 cards per request
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};
// LinkedIn honours the date filter for signed-out visitors but silently ignores job-type and
// remote filters (verified: identical results with and without them). So those two are applied
// here instead: a keyword is added to the search and results are kept only if the title matches.
const TPR = { "1h": "r3600", "24h": "r86400", "7d": "r604800", "30d": "r2592000" };
// "17 minutes ago" / "2 days ago" -> ISO timestamp (LinkedIn's datetime attribute has no time of day).
function parseRelativeTime(text, fallback) {
  const t = text || "";
  if (/just now|moments? ago/i.test(t)) return new Date().toISOString();
  const m = /(\d+)\s*(minute|hour|day|week|month)s?\s+ago/i.exec(t);
  if (!m) return fallback || null;
  const unit = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 }[m[2].toLowerCase()];
  return new Date(Date.now() - Number(m[1]) * unit).toISOString();
}

// Apply the filters LinkedIn ignores. Type labels are only set when the title confirms them.
function applyFilters(jobs, { type, remote, company }) {
  let out = jobs.map((j) => ({ ...j, remote: REMOTE_RE.test(`${j.title} ${j.location}`) }));
  if (remote) out = out.filter((j) => j.remote);
  out = out.filter((j) => matchesType(j, type) && matchesCompany(j, company));
  // Cards carry no type, so a label is only set when the title confirmed one.
  return TYPE_RULES[type] ? out.map((j) => ({ ...j, type: mapType(type) })) : out;
}

// ---------- HTML helpers ----------
const pick = (s, re) => (s.match(re) || [])[1];

// ---------- parsing (exported for tests) ----------
function parseSearchResults(html) {
  const jobs = [];
  for (const block of html.split(/<li[\s>]/).slice(1)) {
    const id = pick(block, /jobPosting:(\d+)/);
    const title = pick(block, /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/);
    if (!id || !title) continue;
    const subtitle = pick(block, /base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/) || "";
    const companyHref = pick(subtitle, /href="([^"]+)"/);
    const logo = pick(block, /data-delayed-url="(https:\/\/media\.licdn\.com[^"]+)"/);
    jobs.push({
      id,
      title: stripTags(title),
      company: stripTags(subtitle) || "Unknown company",
      companyUrl: companyHref ? safeHttpUrl(decode(companyHref).split("?")[0]) : null,
      logo: logo ? safeHttpUrl(decode(logo)) : null,
      location: stripTags(pick(block, /job-search-card__location[^>]*>([\s\S]*?)<\/span>/) || "") || "Not specified",
      remote: false,
      type: "",
      postedAt: (() => {
        const t = block.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);
        return t ? parseRelativeTime(stripTags(t[2]), t[1]) : null;
      })(),
      description: "",
      needsDetails: true, // full description is fetched when the user opens the job
      url: `https://www.linkedin.com/jobs/view/${id}`,
    });
  }
  return jobs;
}

// Inner HTML of the first <div> whose tag contains `marker`, honouring nested <div>s (a lazy regex would stop
// at the first inner </div> and truncate the text).
function extractDivContent(html, marker) {
  const open = new RegExp(`<div[^>]*${marker}[^>]*>`).exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  for (let t; (t = tag.exec(html)); ) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, t.index);
  }
  return html.slice(start); // unbalanced markup: use everything that follows
}

function parseJobDetails(html) {
  const markup = extractDivContent(html, "show-more-less-html__markup");
  if (!markup?.trim()) return null;
  const criteria = {};
  const re = /description__job-criteria-subheader[^>]*>([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/g;
  for (let m; (m = re.exec(html)); ) criteria[stripTags(m[1]).toLowerCase()] = stripTags(m[2]);
  return {
    description: htmlToText(markup).slice(0, 8000),
    type: criteria["employment type"] ? mapType(criteria["employment type"]) : "",
    seniority: criteria["seniority level"] || "",
    industry: criteria["industries"] || "",
  };
}

// ---------- network ----------
const fetchHtml = (url) => fetchText(url, "LinkedIn", { headers: HEADERS, throttled: [429, 999] });

async function search({ position, company, location, type, remote, posted, page }) {
  const keywords = [position, company, TYPE_RULES[type]?.keyword, remote ? "remote" : ""].filter(Boolean).join(" ");
  const qs = new URLSearchParams({
    keywords,
    location,
    f_TPR: TPR[posted] || TPR["7d"],
    sortBy: "DD", // most recent first
    start: String((page - 1) * PAGE_SIZE),
  });

  const raw = parseSearchResults(await fetchHtml(`${BASE}/seeMoreJobPostings/search?${qs}`));
  // hasMore reflects LinkedIn's raw page size, since filtering may leave a page with few or no matches.
  // LinkedIn's "most recent" ordering is only approximate, so order by the posted time it reports.
  return { jobs: sortNewestFirst(applyFilters(raw, { type, remote, company })), hasMore: raw.length >= PAGE_SIZE && page < 40 };
}

async function details(id) {
  const parsed = parseJobDetails(await fetchHtml(`${BASE}/jobPosting/${id}`));
  if (!parsed) throw new HttpError(404, "This job posting is no longer available.");
  return parsed;
}

module.exports = { search, details, parseSearchResults, parseJobDetails, applyFilters, parseRelativeTime, extractDivContent };
