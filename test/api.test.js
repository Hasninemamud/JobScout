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

test("bdjobs provider maps search and details, applying the filters bdjobs ignores", async () => {
  const bd = require("../server/providers/bdjobs");
  const real = global.fetch;
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 30 * 864e5).toISOString();
  const row = (id, title, location, publishDate) => ({ Jobid: id, jobTitle: title, companyName: "Acme", location, publishDate, JobType: "FullTime", logoUrl: "" });
  global.fetch = async (url) => ({
    ok: true,
    text: async () =>
      JSON.stringify(
        String(url).includes("jobDetails")
          ? { data: { JobFound: true, JobTitle: "Dev", JobDescription: "<p>Build things</p>", Deadline: "Dec 1, 2026", JobNature: "Full Time" } }
          : { data: [row("1", "Dev", "Dhaka", now), row("2", "Old Dev", "Dhaka", old), row("3", "Dev", "Sylhet", now)], common: { totalpages: 3 } },
      ),
  });
  try {
    const q = { position: "dev", location: "dhaka", type: "", remote: false, posted: "7d", page: 1, limit: 12 };
    const { jobs, hasMore } = await bd.search(q);
    assert.deepEqual(jobs.map((j) => j.id), ["bd-1"]); // old and wrong-location jobs dropped
    assert.equal(jobs[0].url, "https://bdjobs.com/h/details/1?ln=1");
    assert.equal(hasMore, true);
    const d = await bd.details("1");
    assert.match(d.description, /Build things/);
    assert.equal(d.type, "Full-time");
  } finally {
    global.fetch = real;
  }
});

test("all-source search survives one site failing and caches that partial result only briefly", async () => {
  const jobsService = require("../server/services/jobs");
  const real = global.fetch;
  const now = new Date().toISOString();
  let calls = 0;
  global.fetch = async (url) => {
    calls++;
    if (String(url).includes("linkedin.com")) throw new Error("down");
    return { ok: true, text: async () => JSON.stringify({ data: [{ Jobid: "9", jobTitle: "Dev", companyName: "Acme", location: "Dhaka", publishDate: now, JobType: "FullTime" }], common: { totalpages: 1 } }) };
  };
  process.env.JOB_SOURCE = "all";
  try {
    const q = jobsService.parseQuery(new URLSearchParams("position=dev&location=bangladesh"));
    const first = await jobsService.search(q);
    assert.deepEqual(first.jobs.map((j) => j.id), ["bd-9"]); // bdjobs kept; "bangladesh" matches the town "Dhaka"
    assert.equal(first.partial, true);
    // A partial result is kept only briefly (so a throttled site isn't hit on every click), but it is kept.
    const before = calls;
    assert.equal((await jobsService.search(q)).partial, true);
    assert.equal(calls, before, "repeat within the short window must not call the sites again");
  } finally {
    process.env.JOB_SOURCE = "demo";
    global.fetch = real;
  }
});

test("bd- details ids are only served when bdjobs is a source", async () => {
  const { res } = await get("/api/jobs/bd-1553713/details"); // JOB_SOURCE=demo in tests
  assert.equal(res.status, 404);
});

test("bdjobs details hide '--' placeholders", async () => {
  const bd = require("../server/providers/bdjobs");
  const real = global.fetch;
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ data: { JobFound: true, JobTitle: "Dev", JobDescription: "<p>x</p>", JobVacancies: "--", Deadline: "Dec 1, 2026" } }) });
  try {
    const { description } = await bd.details("1");
    assert.doesNotMatch(description, /Vacancies/);
    assert.match(description, /Deadline: Dec 1, 2026/);
  } finally {
    global.fetch = real;
  }
});

test("posted=30d is accepted and keeps older jobs that 7d drops", async () => {
  const { jobs: month } = (await get("/api/jobs?position=designer&posted=30d&limit=25")).body;
  const { jobs: week } = (await get("/api/jobs?position=designer&posted=7d&limit=25")).body;
  assert.ok(month.length >= week.length);
});

test("company search: allowed without a position, and results are limited to that company", async () => {
  const jobsService = require("../server/services/jobs");
  assert.equal(jobsService.parseQuery(new URLSearchParams("company=Acme")).company, "Acme");
  assert.throws(() => jobsService.parseQuery(new URLSearchParams("location=x")), /position or company/);

  const rows = [
    { Jobid: "1", jobTitle: "Dev", companyName: "Acme Ltd", location: "Dhaka", publishDate: new Date().toISOString() },
    { Jobid: "2", jobTitle: "Dev", companyName: "Other Co", location: "Dhaka", publishDate: new Date().toISOString() },
  ];
  const real = global.fetch;
  let url;
  global.fetch = async (u) => ((url = String(u)), { ok: true, text: async () => JSON.stringify({ data: rows, common: { totalpages: 1 } }) });
  try {
    const { jobs } = await require("../server/providers/bdjobs").search({ position: "", company: "acme", location: "", type: "", remote: false, posted: "7d", page: 1, limit: 12 });
    assert.deepEqual(jobs.map((j) => j.id), ["bd-1"]);
    assert.match(url, /keyword=acme/); // company is what bdjobs is asked to search
  } finally {
    global.fetch = real;
  }
  const li = scrape.applyFilters([{ title: "Dev", company: "Acme Ltd", location: "" }, { title: "Dev", company: "Other", location: "" }], { company: "ACME" });
  assert.equal(li.length, 1);
});

test("bdjobs drops jobs whose title lacks a searched word", async () => {
  const now = new Date().toISOString();
  const row = (id, jobTitle) => ({ Jobid: id, jobTitle, companyName: "Acme", location: "Dhaka", publishDate: now });
  const real = global.fetch;
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ data: [row("1", "Senior Product Manager"), row("2", "Brand Promotion Manager"), row("3", "Product Designer")], common: { totalpages: 1 } }) });
  try {
    const { jobs } = await require("../server/providers/bdjobs").search({ position: "Product Manager", company: "", location: "", type: "", remote: false, posted: "7d", page: 1, limit: 12 });
    assert.deepEqual(jobs.map((j) => j.id), ["bd-1"]);
  } finally {
    global.fetch = real;
  }
});

test("remote boards: parsers map each feed, search merges and filters, feeds are fetched once", async () => {
  delete require.cache[require.resolve("../server/providers/remote")];
  const remote = require("../server/providers/remote");
  const now = new Date();
  const rss = (title, region) => `<item><title>${title}</title><region>${region}</region><type>Full-Time</type><description>&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;</description><pubDate>${now.toUTCString()}</pubDate><link>https://weworkremotely.com/remote-jobs/x</link></item>`;
  const real = global.fetch;
  const hits = {};
  global.fetch = async (u) => {
    const host = new URL(u).host;
    hits[host] = (hits[host] || 0) + 1;
    const body = {
      "remotive.com": { jobs: [
        { title: "React Developer", company_name: "A", candidate_required_location: "USA", job_type: "full_time", publication_date: now.toISOString().slice(0, 19), url: "https://remotive.com/remote-jobs/1", description: "<p>x</p>" },
        { title: "Vue Developer", company_name: "A", candidate_required_location: "Europe", job_type: "full_time", publication_date: now.toISOString().slice(0, 19), url: "https://remotive.com/remote-jobs/4", description: "<p>x</p>" },
      ] },
      "remoteok.com": [{ legal: "x" }, { position: "Rust Developer", company: "B", date: now.toISOString(), url: "https://remoteOK.com/remote-jobs/2", description: "y" }],
      "himalayas.app": { totalCount: 1, jobs: [{ title: "Unrelated Chef", companyName: "C", pubDate: Math.floor(now / 1000), applicationLink: "https://himalayas.app/jobs/3" }] },
    }[host];
    return host === "weworkremotely.com"
      ? { ok: true, text: async () => `<rss>${rss("Acme: Senior Developer", "Worldwide")}${rss("Acme: Barista", "Worldwide")}</rss>` }
      : { ok: true, text: async () => JSON.stringify(body) };
  };
  try {
    const q = { position: "developer", company: "", location: "", type: "", remote: false, posted: "7d", page: 1, limit: 12 };
    const { jobs, partial } = await remote.search(q);
    assert.deepEqual(jobs.map((j) => j.title).sort(), ["React Developer", "Rust Developer", "Senior Developer", "Vue Developer"]); // "Chef"/"Barista" dropped
    assert.ok(!partial);
    const wwr = jobs.find((j) => j.title === "Senior Developer");
    assert.equal(wwr.company, "Acme");
    assert.equal(wwr.description, "Build & ship"); // entities decoded, tags stripped
    // Location "usa" keeps the USA job and open-worldwide ones, and drops the Europe-only job.
    const usa = await remote.search({ ...q, location: "usa" });
    assert.deepEqual(usa.jobs.map((j) => j.title).sort(), ["React Developer", "Rust Developer", "Senior Developer"]);
    assert.equal(hits["remotive.com"], 1);
    assert.equal(hits["remoteok.com"], 1); // cached feeds are not refetched
  } finally {
    global.fetch = real;
  }
});

test("a partial result from the remote boards marks the whole all-source search partial", async () => {
  const jobsService = require("../server/services/jobs");
  const real = global.fetch;
  global.fetch = async (url) => {
    const host = new URL(url).host;
    if (host === "himalayas.app") throw new Error("down"); // one remote site fails, the rest answer with empty feeds
    return { ok: true, text: async () => (host === "weworkremotely.com" ? "<rss></rss>" : host === "api.bdjobs.com" ? '{"data":[],"common":{"totalpages":0}}' : "[]") };
  };
  process.env.JOB_SOURCE = "all";
  try {
    const q = jobsService.parseQuery(new URLSearchParams("position=partial-remote-check"));
    assert.equal((await jobsService.search(q)).partial, true);
  } finally {
    process.env.JOB_SOURCE = "demo";
    global.fetch = real;
  }
});

test("large JSON responses are gzipped when the client accepts it", async () => {
  const res = await fetch(`${base}/api/jobs?position=designer&limit=25`, { headers: { "accept-encoding": "gzip" } });
  assert.equal(res.headers.get("content-encoding"), "gzip");
  assert.ok((await res.json()).jobs.length > 0); // fetch decompresses it transparently
});

test("site option limits an all-source search to the chosen site", async () => {
  const jobsService = require("../server/services/jobs");
  assert.equal(jobsService.parseQuery(new URLSearchParams("position=x&site=remotive")).site, "remotive");
  assert.equal(jobsService.parseQuery(new URLSearchParams("position=x&site=bogus")).site, ""); // unknown values mean "all sites"

  const real = global.fetch;
  const hosts = new Set();
  global.fetch = async (u) => {
    hosts.add(new URL(u).host);
    return { ok: true, text: async () => "[]" };
  };
  process.env.JOB_SOURCE = "all";
  try {
    await jobsService.search(jobsService.parseQuery(new URLSearchParams("position=site-check-a&site=himalayas")));
    assert.deepEqual([...hosts], ["himalayas.app"]); // nothing else was asked
    hosts.clear();
    await jobsService.search(jobsService.parseQuery(new URLSearchParams("position=site-check-b&site=bdjobs")));
    assert.deepEqual([...hosts], ["api.bdjobs.com"]);
  } finally {
    process.env.JOB_SOURCE = "demo";
    global.fetch = real;
  }
});
