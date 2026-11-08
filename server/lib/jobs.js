const crypto = require("crypto");

const TYPE_LABELS = {
  full_time: "Full-time",
  fulltime: "Full-time",
  "full-time": "Full-time",
  part_time: "Part-time",
  parttime: "Part-time",
  "part-time": "Part-time",
  contractor: "Contract",
  contract: "Contract",
  intern: "Internship",
  internship: "Internship",
  temporary: "Temporary",
  temp: "Temporary",
  volunteer: "Volunteer",
  other: "Other",
};

const mapType = (raw) => {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) return "";
  const key = String(first).toLowerCase().trim();
  return TYPE_LABELS[key] || TYPE_LABELS[key.replace(/[\s-]+/g, "_")] || String(first);
};

const makeId = (url) => crypto.createHash("sha1").update(String(url)).digest("hex").slice(0, 12);

const safeHttpUrl = (u) => {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? p.href : null;
  } catch {
    return null;
  }
};

// Map a raw provider record to the shape the frontend consumes.
function normalizeJob(j) {
  const url = safeHttpUrl(j.url || j.linkedin_job_url || j.job_url);
  if (!url) return null;
  const locations = Array.isArray(j.locations_derived) ? j.locations_derived : j.location ? [j.location] : [];
  return {
    id: makeId(url),
    title: String(j.title || "Untitled role"),
    company: String(j.organization || j.company || "Unknown company"),
    companyUrl: safeHttpUrl(j.linkedin_org_url || j.organization_url),
    logo: safeHttpUrl(j.organization_logo),
    location: locations[0] || "Not specified",
    remote: Boolean(j.remote_derived ?? j.remote),
    type: mapType(j.employment_type),
    postedAt: j.date_posted || j.date_created || null,
    description: String(j.description_text || j.description || "").slice(0, 4000),
    url,
  };
}

const postedTime = (job) => Date.parse(job.postedAt) || 0;

/** Newest first. Stable, so jobs with equal or missing dates keep their original order. Returns a new array. */
const sortNewestFirst = (jobs) => [...jobs].sort((a, b) => postedTime(b) - postedTime(a));

module.exports = { normalizeJob, mapType, makeId, safeHttpUrl, sortNewestFirst };
