const { HttpError } = require("../lib/http");
const { matchesType, REMOTE_RE } = require("../lib/jobFilters");
const { mapType, safeHttpUrl, sortNewestFirst } = require("../lib/jobs");
const { htmlToText } = require("../lib/html");

// bdjobs.com's own public search/detail JSON (what its website calls; no account or cookies).
// NOTE: undocumented, so it can change without notice. Keep volume low; the service layer caches.
const API = "https://api.bdjobs.com/jobs/api/v1";
const WINDOW_MS = { "1h": 36e5, "24h": 864e5, "7d": 6048e5, "30d": 2592e6 };

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new HttpError(504, "bdjobs did not respond in time. Please try again.");
  }
  if (res.status === 429) throw new HttpError(503, "bdjobs is temporarily throttling requests. Wait a minute and try again.");
  if (!res.ok) throw new HttpError(502, `bdjobs returned an unexpected response (${res.status}).`);
  return res.json().catch(() => {
    throw new HttpError(502, "bdjobs returned an unreadable response.");
  });
}

const toJob = (j) => ({
  id: `bd-${j.Jobid}`,
  title: String(j.jobTitle || "Untitled role"),
  company: String(j.companyName || "Unknown company"),
  companyUrl: null,
  logo: safeHttpUrl(j.logoUrl),
  location: j.location || "Not specified",
  remote: REMOTE_RE.test(`${j.jobTitle} ${j.location} ${j.WorkPlace}`),
  type: mapType(j.JobType),
  postedAt: j.publishDate || null,
  description: "",
  needsDetails: true, // full text is fetched when the user opens the job
  url: `https://bdjobs.com/h/details/${j.Jobid}?ln=1`,
});

async function search({ position, location, type, remote, posted, page, limit }) {
  const qs = new URLSearchParams({ keyword: position, pg: String(page), rpp: String(limit) });
  const body = await getJson(`${API}/JobSearch/GetJobSearch?${qs}`);
  const seen = new Set();
  const since = Date.now() - WINDOW_MS[posted];
  const loc = location.toLowerCase();
  const wholeCountry = /^bangladesh$/.test(loc); // bdjobs places are towns, so a country matches them all
  // bdjobs' own location filter takes internal ids, so location, date, type and remote are applied here.
  const jobs = [...(body.premiumData || []), ...(body.data || [])]
    .filter((j) => j.Jobid && !seen.has(j.Jobid) && seen.add(j.Jobid))
    .filter((j) => Date.parse(j.publishDate) >= since)
    .filter((j) => !loc || wholeCountry || String(j.location).toLowerCase().includes(loc))
    .map(toJob)
    .filter((j) => (!remote || j.remote) && matchesType(j, type));
  // hasMore reflects bdjobs' own paging, since filtering may leave a page with few or no matches.
  return { jobs: sortNewestFirst(jobs), hasMore: page < Number(body.common?.totalpages || 0) && page < 40 };
}

async function details(id) {
  const { data } = await getJson(`${API}/JobSubsystem/jobDetails?jobId=${id}&ln=1&IsCorporate=false`);
  const d = Array.isArray(data) ? data[0] : data;
  if (!d || d.JobFound === false || !d.JobTitle) throw new HttpError(404, "This job posting is no longer available.");
  const section = (title, html) => (html && String(html).trim() ? `${title}\n${htmlToText(String(html))}` : "");
  const real = (v) => (v && String(v).trim() !== "--" ? v : null); // bdjobs sends "--" for "no value"
  const facts = [
    real(d.Deadline) && `Deadline: ${d.Deadline}`,
    real(d.JobVacancies) && `Vacancies: ${d.JobVacancies}`,
    real(d.JobSalaryRangeText) && `Salary: ${d.JobSalaryRangeText}`,
    real(d.JobLocation) && `Location: ${d.JobLocation}`,
  ].filter(Boolean).join("\n");
  const description = [
    facts,
    section("Responsibilities", d.JobDescription),
    section("Education", d.EducationRequirements),
    section("Experience", d.experience),
    section("Additional requirements", d.AdditionJobRequirements),
    d.SkillsRequired && `Skills\n${d.SkillsRequired}`,
    section("Benefits", d.JobOtherBenifits),
  ].filter(Boolean).join("\n\n").slice(0, 8000);
  return { description, type: mapType(String(d.JobNature || "").replace(/\s/g, "")), seniority: "", industry: "" };
}

module.exports = { search, details, toJob };
