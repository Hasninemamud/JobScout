process.env.RAPIDAPI_KEY = "";
process.env.JOB_SOURCE = "demo"; // never hit the network in tests
process.env.RATE_LIMIT_PER_MINUTE = "1000";

// Serve a throwaway frontend so tests don't depend on `npm run build`.
const os = require("os");
const frontendDir = require("fs").mkdtempSync(require("path").join(os.tmpdir(), "jobscout-fe-"));
require("fs").mkdirSync(require("path").join(frontendDir, "assets"));
require("fs").writeFileSync(require("path").join(frontendDir, "index.html"), "<!doctype html><title>JobScout</title>");
require("fs").writeFileSync(require("path").join(frontendDir, "assets", "app-abc123.js"), "console.log(1)");
process.env.FRONTEND_DIR = frontendDir;

const test = require("node:test");
const assert = require("node:assert");
const { createServer } = require("../server");
const fs = require("fs");
const path = require("path");
const { normalizeJob, mapType } = require("../server/lib/jobs");
const scrape = require("../server/providers/linkedinScrape");
const fixture = (n) => fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8");

let server, base;
test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const get = async (p) => {
  const res = await fetch(base + p);
  return { res, body: await res.json() };
};

test("health endpoint", async () => {
  const { res, body } = await get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
});

test("requires a position", async () => {
  const { res, body } = await get("/api/jobs?position=%20");
  assert.equal(res.status, 400);
  assert.match(body.error, /position/i);
});

test("returns jobs with details and a link", async () => {
  const { res, body } = await get("/api/jobs?position=data%20analyst&limit=5");
  assert.equal(res.status, 200);
  assert.equal(body.jobs.length, 5);
  for (const j of body.jobs) {
    assert.ok(j.id && j.title && j.company && j.location);
    assert.match(j.url, /^https:\/\//);
  }
  assert.equal(body.hasMore, true);
});

test("applies filters and pagination", async () => {
  const remote = await get("/api/jobs?position=designer&remote=1&limit=25");
  assert.ok(remote.body.jobs.length > 0 && remote.body.jobs.every((j) => j.remote));
  const p1 = await get("/api/jobs?position=designer&limit=5&page=1");
  const p2 = await get("/api/jobs?position=designer&limit=5&page=2");
  assert.notEqual(p1.body.jobs[0].id, p2.body.jobs[0].id);
});

test("serves the frontend with security headers", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-security-policy"));
  assert.match(await res.text(), /JobScout/);
});

test("falls back to index.html for app routes and caches fingerprinted assets", async () => {
  const route = await fetch(base + "/saved");
  assert.equal(route.status, 200);
  assert.match(await route.text(), /JobScout/);
  assert.equal(route.headers.get("cache-control"), "no-cache");
  const asset = await fetch(base + "/assets/app-abc123.js");
  assert.match(asset.headers.get("cache-control"), /immutable/);
  assert.equal((await fetch(base + "/missing.js")).status, 404);
});

test("survives a malformed URL instead of crashing", async () => {
  const res = await fetch(base + "/%E0%A4%A");
  assert.equal(res.status, 400);
  assert.equal((await fetch(base + "/api/health")).status, 200); // server still up
});

test("blocks path traversal", async () => {
  const res = await fetch(base + "/..%2Fpackage.json");
  assert.equal(res.status, 404);
});

test("normalizeJob maps provider data and rejects unsafe urls", () => {
  const job = normalizeJob({
    title: "Dev", organization: "Co", url: "https://linkedin.com/jobs/view/1",
    employment_type: ["FULL_TIME"], locations_derived: ["Paris, France"],
  });
  assert.equal(job.type, "Full-time");
  assert.equal(job.location, "Paris, France");
  assert.equal(normalizeJob({ title: "x", url: "javascript:alert(1)" }), null);
  assert.equal(mapType("CONTRACTOR"), "Contract");
});

test("scraper parses LinkedIn search cards", () => {
  const jobs = scrape.parseSearchResults(fixture("linkedin-list.html"));
  assert.equal(jobs.length, 10);
  const j = jobs[0];
  assert.equal(j.id, "4472204970");
  assert.equal(j.title, "Software Development Engineer, Consumer Domains");
  assert.equal(j.company, "Audible");
  assert.equal(j.location, "Newark, NJ");
  assert.equal(j.url, "https://www.linkedin.com/jobs/view/4472204970"); // tracking params stripped
  assert.ok(!Number.isNaN(Date.parse(j.postedAt)));
  assert.ok(jobs.every((x) => x.id && x.title && x.url.startsWith("https://www.linkedin.com/jobs/view/")));
});

test("scraper parses job details into plain text", () => {
  const d = scrape.parseJobDetails(fixture("linkedin-detail.html"));
  assert.equal(d.type, "Full-time");
  assert.equal(d.seniority, "Mid-Senior level");
  assert.match(d.description, /Basic Qualifications/);
  assert.match(d.description, /\n- 1\+ years/); // list items become bullets
  assert.doesNotMatch(d.description, /<[a-z]/i); // no markup leaks through
  assert.equal(scrape.parseJobDetails("<html>blocked</html>"), null);
});

test("details endpoint is disabled outside scrape mode", async () => {
  const { res } = await get("/api/jobs/4472204970/details");
  assert.equal(res.status, 404);
});

test("scraper converts LinkedIn's relative times to timestamps", () => {
  const near = (iso, ms) => Math.abs(Date.now() - ms - Date.parse(iso)) < 5000;
  assert.ok(near(scrape.parseRelativeTime("17 minutes ago"), 17 * 60_000));
  assert.ok(near(scrape.parseRelativeTime("1 hour ago"), 3_600_000));
  assert.ok(near(scrape.parseRelativeTime("2 days ago"), 2 * 86_400_000));
  assert.equal(scrape.parseRelativeTime("gibberish", "2026-11-07"), "2026-11-07");
});

test("scraper applies the job-type and remote filters LinkedIn ignores", () => {
  const mk = (title, location = "Austin, TX") => ({ title, location, type: "", remote: false });
  const jobs = [
    mk("Software Engineer Intern - Summer 2027"), mk("Backend Engineer (Contract)"), mk("Part-Time QA Analyst"),
    mk("Senior Engineer"), mk("Remote Platform Engineer"), mk("Engineer", "Remote, US"),
  ];
  const titles = (f) => scrape.applyFilters(jobs, f).map((j) => j.title);
  assert.deepEqual(titles({ type: "internship" }), ["Software Engineer Intern - Summer 2027"]);
  assert.deepEqual(titles({ type: "contract" }), ["Backend Engineer (Contract)"]);
  assert.deepEqual(titles({ type: "part-time" }), ["Part-Time QA Analyst"]);
  assert.deepEqual(titles({ type: "full-time" }), ["Senior Engineer", "Remote Platform Engineer", "Engineer"]);
  assert.deepEqual(titles({ remote: true }), ["Remote Platform Engineer", "Engineer"]);
  assert.equal(scrape.applyFilters(jobs, { type: "internship" })[0].type, "Internship");
  assert.equal(scrape.applyFilters(jobs, {}).length, 6); // no filters: nothing dropped
});

test("posted=1h returns only jobs from the last hour", async () => {
  const { body } = await get("/api/jobs?position=designer&posted=1h&limit=25");
  assert.ok(body.jobs.length > 0);
  assert.ok(body.jobs.every((j) => Date.now() - Date.parse(j.postedAt) <= 3_600_000));
  const week = await get("/api/jobs?position=designer&posted=7d&limit=25");
  assert.ok(week.body.jobs.length > body.jobs.length);
});

// ---------- regression tests for the code-review fixes ----------
const { clientIp, HttpError } = require("../server/lib/http");
const { sortNewestFirst } = require("../server/lib/jobs");
const { matchesType } = require("../server/lib/jobFilters");
const rapidapi = require("../server/providers/rapidapi");
const jobsService = require("../server/services/jobs");

/** Runs `fn` with global fetch replaced, always restoring it. */
async function withFetch(stub, fn) {
  const real = global.fetch;
  global.fetch = stub;
  try {
    return await fn();
  } finally {
    global.fetch = real;
  }
}

test("rate limiting uses the real client behind trusted proxies and ignores forged headers otherwise", () => {
  const req = (xff) => ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: "10.0.0.1" } });
  assert.equal(clientIp(req("1.2.3.4")), "10.0.0.1"); // no trusted proxy: header ignored
  assert.equal(clientIp(req("1.2.3.4"), 1), "1.2.3.4");
  assert.equal(clientIp(req("6.6.6.6, 1.2.3.4"), 1), "1.2.3.4"); // forged left entry is ignored
  assert.equal(clientIp(req("1.2.3.4, 10.9.9.9"), 2), "1.2.3.4");
  assert.equal(clientIp(req(), 1), "10.0.0.1"); // header missing: fall back to the socket
});

test("job descriptions with nested <div>s are not truncated", () => {
  const html = `<div class="show-more-less-html__markup relative">Intro<div class="x">Inner</div> and the <b>rest</b><br>- end</div><div>after</div>`;
  const out = scrape.parseJobDetails(html);
  assert.match(out.description, /Intro\s*Inner\s*and the rest/);
  assert.match(out.description, /end$/);
  assert.doesNotMatch(out.description, /after/);
  assert.equal(scrape.extractDivContent("<p>no marker</p>", "show-more-less-html__markup"), null);
  assert.equal(scrape.parseJobDetails('<div class="show-more-less-html__markup">  </div>'), null);
});

test("identical concurrent searches share a single upstream call", async () => {
  const demo = require("../server/providers/demo");
  const real = demo.search;
  let calls = 0;
  demo.search = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 30));
    return { jobs: [], hasMore: false };
  };
  try {
    const q = jobsService.parseQuery(new URLSearchParams("position=dedupe-probe"));
    const results = await Promise.all([jobsService.search(q), jobsService.search(q), jobsService.search(q)]);
    assert.equal(calls, 1);
    assert.equal(results[0], results[2]);
  } finally {
    demo.search = real;
  }
});

test("rapidapi: unreadable bodies become 502/504 provider errors, not generic 500s", async () => {
  const query = { position: "dev", location: "", type: "", remote: false, posted: "7d", page: 1, limit: 12 };
  await withFetch(async () => new Response("<html>not json</html>", { status: 200 }), async () => {
    await assert.rejects(rapidapi.search(query), (e) => e instanceof HttpError && e.status === 502);
  });
  const timedOut = async () => ({ ok: true, status: 200, json: async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); } });
  await withFetch(timedOut, async () => {
    await assert.rejects(rapidapi.search(query), (e) => e instanceof HttpError && e.status === 504);
  });
});

test("rapidapi: sends the type to the provider and still matches typeless jobs by title", async () => {
  const rows = [
    { title: "Backend Intern", organization: "A", url: "https://x.test/1", employment_type: ["INTERN"], date_posted: "2026-11-01T00:00:00Z" },
    { title: "Software Engineering Internship", organization: "B", url: "https://x.test/2", date_posted: "2026-11-05T00:00:00Z" }, // no type
    { title: "Staff Engineer", organization: "C", url: "https://x.test/3", employment_type: ["FULL_TIME"], date_posted: "2026-11-07T00:00:00Z" },
  ];
  let requested;
  await withFetch(async (url) => { requested = new URL(url); return new Response(JSON.stringify(rows), { status: 200 }); }, async () => {
    const out = await rapidapi.search({ position: "eng", location: "", type: "internship", remote: false, posted: "7d", page: 1, limit: 12 });
    assert.equal(requested.searchParams.get("type_filter"), "INTERN");
    assert.deepEqual(out.jobs.map((j) => j.title), ["Software Engineering Internship", "Backend Intern"]); // newest first
  });
  assert.equal(matchesType({ title: "Anything", type: "" }, "full-time"), true);
  assert.equal(matchesType({ title: "Summer Intern", type: "" }, "full-time"), false);
  assert.equal(matchesType({ title: "Dev", type: "Contract" }, "full-time"), false);
});

test("newest jobs come first (stable for ties and missing dates)", async () => {
  const jobs = [
    { id: "a", postedAt: "2026-11-01T00:00:00Z" }, { id: "b", postedAt: null }, { id: "c", postedAt: "2026-11-07T00:00:00Z" },
    { id: "d", postedAt: "2026-11-01T00:00:00Z" }, { id: "e", postedAt: "2026-11-05T00:00:00Z" },
  ];
  assert.deepEqual(sortNewestFirst(jobs).map((j) => j.id), ["c", "e", "a", "d", "b"]);
  assert.deepEqual(jobs.map((j) => j.id), ["a", "b", "c", "d", "e"]); // input not mutated

  // End to end through the scraper: LinkedIn's own order is only approximate, ours is exact.
  await withFetch(async () => new Response(fixture("linkedin-list.html"), { status: 200 }), async () => {
    const { jobs: found } = await scrape.search({ position: "x", location: "", type: "", remote: false, posted: "7d", page: 1 });
    const times = found.map((j) => Date.parse(j.postedAt));
    assert.ok(found.length > 1);
    assert.deepEqual(times, [...times].sort((x, y) => y - x));
  });
});

test("an unreadable static file returns an error instead of crashing the server", async () => {
  const file = path.join(frontendDir, "locked.js");
  fs.writeFileSync(file, "x");
  fs.chmodSync(file, 0o000);
  try {
    const res = await fetch(base + "/locked.js");
    assert.ok([500, 200].includes(res.status)); // 200 only when running as root, which ignores permissions
    await res.arrayBuffer();
    assert.equal((await fetch(base + "/api/health")).status, 200); // process survived
  } finally {
    fs.chmodSync(file, 0o644);
  }
});
