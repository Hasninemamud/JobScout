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

module.exports = { TYPE_RULES, REMOTE_RE, matchesType };
