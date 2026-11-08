const config = require("../config");
const { HttpError } = require("../lib/http");
const { matchesType } = require("../lib/jobFilters");
const { normalizeJob, sortNewestFirst } = require("../lib/jobs");

// Our job types -> the provider's employment-type values.
const PROVIDER_TYPES = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

// Live LinkedIn postings through a RapidAPI provider (default: Fantastic.jobs).
async function search({ position, location, type, remote, posted, page, limit }) {
  const endpoint = { "1h": config.endpoint1h, "24h": config.endpoint24h }[posted] || config.endpoint7d; // shortcut: provider has no 30-day endpoint, so "30d" returns the last 7 days; add one if your plan has it
  const qs = new URLSearchParams({
    title_filter: `"${position.replace(/"/g, "")}"`,
    limit: String(limit),
    offset: String((page - 1) * limit),
    description_type: "text",
  });
  if (location) qs.set("location_filter", `"${location.replace(/"/g, "")}"`);
  if (remote) qs.set("remote", "true");
  // Ask the provider to filter by type so pages aren't mostly empty; the title/type check below is a safety net.
  if (PROVIDER_TYPES[type]) qs.set("type_filter", PROVIDER_TYPES[type]);

  let res;
  try {
    res = await fetch(`https://${config.apiHost}${endpoint}?${qs}`, {
      headers: { "x-rapidapi-key": config.apiKey, "x-rapidapi-host": config.apiHost },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new HttpError(504, "The job data provider timed out. Please try again.");
  }

  if (res.status === 401 || res.status === 403) throw new HttpError(502, "Job provider rejected the API key. Check RAPIDAPI_KEY.");
  if (res.status === 429) throw new HttpError(503, "Job provider quota reached. Try again later.");
  if (!res.ok) throw new HttpError(502, `Job provider error (${res.status}).`);

  // The body can still fail after a 200: an HTML/empty/truncated payload, or the timeout firing mid-download.
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw err?.name === "TimeoutError"
      ? new HttpError(504, "The job data provider timed out. Please try again.")
      : new HttpError(502, "The job data provider returned an unreadable response.");
  }

  const list = Array.isArray(data) ? data : data?.data || data?.jobs || [];
  const jobs = sortNewestFirst(list.map(normalizeJob).filter(Boolean).filter((j) => matchesType(j, type)));

  // hasMore follows the provider's raw page size, since filtering can leave a page short.
  return { jobs, hasMore: list.length >= limit };
}

module.exports = { search };
