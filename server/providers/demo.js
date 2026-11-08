const { makeId } = require("../lib/jobs");

// Offline sample data so the UI is fully usable without an API key.
// Links point to a LinkedIn job search for the sample role, not to real postings.
const COMPANIES = [
  "Northwind", "Acme Corp", "Globex", "Initech", "Umbrella Labs", "Hooli", "Stark Systems", "Wayne Digital",
  "Vandelay", "Soylent", "Cyberdyne", "Pied Piper", "Massive Dynamic", "Aperture", "Tyrell Tech", "Oscorp",
  "Wonka Industries", "Gringotts", "Bluth Co", "Dunder Mifflin", "Sterling Cooper", "Monarch", "Nakatomi", "Rekall",
];
const LEVELS = ["", "Senior ", "Junior ", "Lead ", "Staff ", "Associate "];
const PLACES = [
  ["Remote", true], ["New York, NY", false], ["London, UK", false], ["Berlin, Germany", false],
  ["San Francisco, CA", false], ["Toronto, Canada", false], ["Dhaka, Bangladesh", false], ["Singapore", false],
];
const TYPES = ["Full-time", "Full-time", "Full-time", "Contract", "Part-time", "Internship"];

const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

function build(position) {
  const role = titleCase(position);
  return COMPANIES.map((company, i) => {
    const [location, remote] = PLACES[i % PLACES.length];
    const title = `${LEVELS[i % LEVELS.length]}${role}`;
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${title} ${company}`)}`;
    return {
      id: makeId(url),
      title,
      company,
      companyUrl: null,
      logo: null,
      location,
      remote,
      type: TYPES[i % TYPES.length],
      postedAt: new Date(Date.now() - (i * 3 + 0.5) * 3_600_000).toISOString(),
      description:
        `${company} is looking for a ${title} to join a growing team.\n\n` +
        `What you'll do\n- Own projects end to end, from planning to delivery\n- Collaborate with product, design and engineering partners\n- Share knowledge and help raise the bar for the team\n\n` +
        `What we're looking for\n- Proven experience as a ${role}\n- Strong communication and problem-solving skills\n- Comfortable working in a fast-moving environment\n\n` +
        `(Sample listing shown in demo mode. Add a RAPIDAPI_KEY to see live LinkedIn postings.)`,
      url,
    };
  });
}

async function search({ position, location, type, remote, posted, page, limit }) {
  const maxAgeH = { "1h": 1, "24h": 24, "30d": 24 * 30 }[posted] || 24 * 7;
  let jobs = build(position).filter((j) => (Date.now() - new Date(j.postedAt)) / 3_600_000 <= maxAgeH);
  if (location) jobs = jobs.filter((j) => j.location.toLowerCase().includes(location.toLowerCase()));
  if (remote) jobs = jobs.filter((j) => j.remote);
  if (type) jobs = jobs.filter((j) => j.type.toLowerCase() === type);
  const start = (page - 1) * limit;
  return { jobs: jobs.slice(start, start + limit), hasMore: start + limit < jobs.length };
}

module.exports = { search };
