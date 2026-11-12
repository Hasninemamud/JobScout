const { HttpError, fetchJson } = require("../lib/http");
const { WINDOW_MS, matchesType, matchesCompany, matchesPosition, REMOTE_RE } = require("../lib/jobFilters");
const { mapType, safeHttpUrl, sortNewestFirst } = require("../lib/jobs");
const { htmlToText } = require("../lib/html");

// bdjobs.com's own public search/detail JSON (what its website calls; no account or cookies).
// NOTE: undocumented, so it can change without notice. Keep volume low; the service layer caches.
const API = "https://api.bdjobs.com/jobs/api/v1";
const getJson = (url) => fetchJson(url, "bdjobs", { headers: { Accept: "application/json" } });

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

async function search({ position, company, location, type, remote, posted, page, limit }) {
  const qs = new URLSearchParams({ keyword: company || position, pg: String(page), rpp: String(limit) });
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
    .filter((j) => (!remote || j.remote) && matchesType(j, type) && matchesCompany(j, company))
    // bdjobs matches ANY search word (in titles, skills, descriptions), so keep only titles with every word.
    .filter((j) => matchesPosition(j, position));
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
