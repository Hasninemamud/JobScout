const http = require("http");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const config = require("./config");
const { HttpError, SECURITY_HEADERS, sendJson, clientIp } = require("./lib/http");
const { createRateLimiter } = require("./lib/rateLimit");
const jobs = require("./services/jobs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function createServer() {
  const rateCheck = createRateLimiter(config.rateLimitPerMinute);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      try {
        if (req.method !== "GET") throw new HttpError(405, "Method not allowed.");
        const rl = rateCheck(clientIp(req, config.trustProxy));
        if (!rl.ok) {
          return sendJson(res, 429, { error: "Too many requests. Please slow down." }, { "Retry-After": String(rl.retryAfter) });
        }
        if (url.pathname === "/api/health") return sendJson(res, 200, { status: "ok", source: config.source });
        const detail = url.pathname.match(/^\/api\/jobs\/([^/]+)\/details$/);
        if (detail) return sendJson(res, 200, await jobs.details(detail[1]));
        if (url.pathname === "/api/jobs") {
          return sendJson(res, 200, await jobs.search(jobs.parseQuery(url.searchParams)));
        }
        throw new HttpError(404, "Not found.");
      } catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        if (status === 500) console.error(err);
        return sendJson(res, status, { error: status === 500 ? "Something went wrong." : err.message });
      }
    }

    // Static files
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      return res.end();
    }
    let rel;
    try {
      rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("Bad request");
    }
    const isFile = (f) => f.startsWith(config.publicDir + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile();
    let file = path.normalize(path.join(config.publicDir, rel));
    // Single-page app: extensionless paths fall back to index.html.
    if (!isFile(file) && !path.extname(rel)) file = path.join(config.publicDir, "index.html");
    if (!isFile(file)) {
      const built = fs.existsSync(path.join(config.publicDir, "index.html"));
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end(built ? "Not found" : "Frontend not built. Run `npm run build` first (or `npm run dev:client` for development).");
    }
    const headers = {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      // Vite fingerprints everything in /assets, so it can be cached forever; the HTML entry must stay fresh.
      "Cache-Control": rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      ...SECURITY_HEADERS,
    };
    if (req.method === "HEAD") {
      res.writeHead(200, headers);
      return res.end();
    }

    // The file can vanish (a rebuild) or be unreadable between the check above and the read, and an
    // unhandled stream error would crash the process. Send headers only once the file has really opened.
    const stream = fs.createReadStream(file);
    stream.once("open", () => {
      res.writeHead(200, headers);
      pipeline(stream, res, () => {}); // handles client disconnects and mid-read errors; destroys both ends
    });
    stream.once("error", (err) => {
      if (res.headersSent) return; // pipeline owns errors after the response has started
      res.writeHead(err.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
      res.end(err.code === "ENOENT" ? "Not found" : "Could not read file");
    });
  });
}

if (require.main === module) {
  createServer().listen(config.port, () => {
    console.log(`JobScout running at http://localhost:${config.port}  (source: ${config.source})`);
  });
}

module.exports = { createServer };
