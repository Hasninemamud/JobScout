// Job-type and remote matching used by every provider, so they behave the same everywhere.
// Providers that can't filter server-side (or return jobs with no usable type) fall back to the title.
const TYPE_RULES = {
  internship: { keyword: "intern", re: /\bintern(ship)?s?\b/i },
  contract: { keyword: "contract", re: /\b(contract|contractor|freelance|c2c|1099)\b/i },
  "part-time": { keyword: "part time", re: /\bpart[- ]?time\b/i },
  temporary: { keyword: "temporary", re: /\b(temp|temporary|seasonal)\b/i },
};

const REMOTE_RE = /\b(remote|wfh|work from home|anywhere)\b/i;

const impliesOtherType = (title) => Object.values(TYPE_RULES).some((r) => r.re.test(title));

/** True if a job fits the requested type. A job with a known type is compared directly; otherwise the title decides. */
function matchesType(job, type) {
  if (!type) return true;
  if (job.type) return job.type.toLowerCase() === type;
  return type === "full-time" ? !impliesOtherType(job.title) : TYPE_RULES[type].re.test(job.title);
}

/** True if the job's company contains the searched name (case-insensitive). No company searched: everything matches. */
const matchesCompany = (job, company) => !company || job.company.toLowerCase().includes(company.toLowerCase());

/** True if every word of the search appears in the job title (for sites whose own search matches ANY word). */
const matchesPosition = (job, position) => {
  const title = job.title.toLowerCase();
  return position.toLowerCase().split(/\s+/).filter(Boolean).every((w) => title.includes(w));
};

/** Milliseconds for each "posted within" option. */
const WINDOW_MS = { "1h": 36e5, "24h": 864e5, "7d": 6048e5, "30d": 2592e6 };

module.exports = { TYPE_RULES, REMOTE_RE, WINDOW_MS, matchesType, matchesCompany, matchesPosition };
