const { URL } = require("url");
const { handleApiRequest } = require("../server/apiHandler");

/** Vercel serverless entry for /api and /api/*. */
module.exports = async (req, res) => {
  const raw = req.url || "/api";
  const url = new URL(raw.startsWith("/") ? raw : `/${raw}`, "http://localhost");
  await handleApiRequest(req, res, url.pathname, url.searchParams);
};
