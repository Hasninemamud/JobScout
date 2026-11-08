# JobScout

Search any position and see the latest LinkedIn job postings with details and a direct link to each post.

- **Frontend:** React 19 + TypeScript + Vite, animated with Framer Motion, data fetching with TanStack Query.
- **Backend:** dependency-free Node 18+ server (search API, caching, rate limiting, static hosting).

## Run it

```bash
npm run install:all     # installs the frontend dependencies (the backend needs none)
npm run build           # builds the React app into frontend/dist
npm start               # http://localhost:3000  (serves the API and the built frontend)
```

Development with hot reload (two terminals):

```bash
npm run dev             # backend on :3000, restarts on change
npm run dev:client      # Vite on http://localhost:5173, proxies /api to :3000
```

Other scripts: `npm test` (backend tests), `npm run typecheck` (frontend).

## Data sources (`JOB_SOURCE` in `.env`, see `.env.example`)

| Source | What it is | Notes |
| --- | --- | --- |
| `all` (default with no key) | LinkedIn + bdjobs merged, newest first | If one site fails, the other still shows. |
| `scrape` | Reads LinkedIn's public, signed-out job pages | No key needed. |
| `api` (default if `RAPIDAPI_KEY` is set) | Licensed provider on RapidAPI | Stable and permitted; paid/limited. |
| `bdjobs` | bdjobs.com's public JSON (undocumented) | No key. Link and full details per job. Location/date/type filters applied per page by this app. |
| `demo` | Offline sample data | Links are search pages, not real postings. |

**About scraping.** Automated access violates LinkedIn's Terms of Service, and LinkedIn throttles it
(HTTP 429) and can change its markup at any time. This app limits the impact: it uses only public
pages (no login or cookies), caches searches for 5 minutes and descriptions for 1 hour, rate-limits
clients, and fetches a job's full description only when you open it. Use it for personal, low-volume
searching. For anything shared or commercial, use `JOB_SOURCE=api`.

**Filters on the scrape source.** LinkedIn honours only the *date posted* filter (past hour / 24 hours / week)
for signed-out visitors; it silently ignores job-type and remote filters. The scraper therefore adds a
keyword (e.g. "intern") to the search and keeps only results whose title matches. This is best-effort and
may miss jobs whose titles don't say so. The `api` source filters these server-side.

The scraper is in `server/providers/linkedinScrape.js`; its parsers are tested against saved responses in
`test/fixtures/`. If LinkedIn changes its HTML, update the regexes there and refresh the fixtures.

For the `api` source: subscribe to the *LinkedIn Job Search API* (Fantastic.jobs) on RapidAPI, set
`RAPIDAPI_KEY`, and restart. Field mapping lives in `server/lib/jobs.js`.

## Project layout

```
server/                         Node backend
  index.js                      HTTP server, routing, static files + SPA fallback
  config.js                     env/.env loading
  services/jobs.js              query validation, caching, source selection
  providers/                    linkedinScrape.js, rapidapi.js, demo.js
  lib/                          cache, rate limiter, http helpers, job normaliser
frontend/                       React app (feature-based structure)
  index.html, vite.config.ts, tsconfig.json
  public/                       favicon.svg
  src/
    main.tsx                    entry point (fonts + styles)
    app/                        App.tsx, AppHeader.tsx, AppProviders.tsx, SiteFooter.tsx, navigation.ts
    features/
      jobs/                     JobsPage.tsx, types.ts
        api/jobsApi.ts          fetch helpers
        hooks/                  useJobSearch, useJobDetails, useSavedJobs,
                                useSearchFilters, useRecentSearches
        components/             HeroSection, HeroVisual, ExploreBadge, SearchPanel, JobCard, JobGrid,
                                PopularSearches, JobDetailModal, JobSkeletonGrid, EmptyState, Notice, ...
      landing/                  LandingSections, MarqueeBand, WhySection, HowItWorksSection,
                                FaqSection, CtaBanner
    shared/                     components/ (Icons, Reveal, AnimatedNumber), hooks/, lib/
    styles/                     tokens.css, global.css, app-header.css, hero.css, jobs.css,
                                job-modal.css, landing.css
test/                           api.test.js + fixtures/
```

Features never import from each other; `app/` composes them. Shared code lives in `shared/`.

## Design

Dark charcoal hero with orange and lime accents, a heavy condensed display font (Anton, with a light
printed-ink speckle), a pill navigation bar, a search panel, and warm cream sections with gradient cards.
Below the search it is a SaaS-style landing page: marquee band, feature cards, how-it-works steps, an FAQ
accordion and a call-to-action banner. Fonts are self-hosted through npm (`@fontsource/*`), so nothing is
loaded from a CDN and the strict Content Security Policy stays intact.

## Animations

Framer Motion drives: the line-by-line headline reveal, the floating product mock-up, the rotating
"explore more" badge, a header pill that slides between sections as you scroll, staggered job cards with a
pointer-following spotlight, scroll-triggered reveals, the FAQ accordion, an animated results counter, a
spring modal (bottom sheet on phones), and a scrolling marquee. `MotionConfig reducedMotion="user"` plus
`prefers-reduced-motion` rules switch these off for people who ask for less motion.

## API

`GET /api/jobs?position=…` with optional `location`, `type` (full-time|part-time|contract|internship|temporary),
`remote=1`, `posted` (1h|24h|7d), `page`, `limit` (max 25).
Also `GET /api/jobs/:id/details` (scrape source) returns the full description.
Returns `{ source, demo, page, hasMore, jobs: [{ id, title, company, location, remote, type, postedAt, description, url, logo }] }`.

Results are ordered newest first (by the posted time reported by the source), both per page on the server and across
all loaded pages in the browser.

Includes per-IP rate limiting, a 5-minute response cache, input validation, and a strict CSP. Identical searches
that arrive at the same time share one upstream request. Behind a reverse proxy, set `TRUST_PROXY` (see `.env.example`)
so rate limits apply per visitor.
