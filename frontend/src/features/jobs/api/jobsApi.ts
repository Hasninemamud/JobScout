import type { JobDetails, JobsPage, SearchFilters } from "../types";

const PAGE_SIZE = 12;

class ApiError extends Error {}

/** `friendly` replaces the server's message for specific HTTP statuses. */
async function getJson<T>(url: string, signal?: AbortSignal, friendly: Record<number, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Can't reach the server. Check that it is running and try again.");
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(friendly[res.status] ?? data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export function fetchJobsPage(filters: SearchFilters, page: number, signal?: AbortSignal) {
  const qs = new URLSearchParams({
    position: filters.position,
    company: filters.company,
    location: filters.location,
    posted: filters.posted,
    type: filters.type,
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (filters.remote) qs.set("remote", "1");
  if (filters.site) qs.set("site", filters.site);
  return getJson<JobsPage>(`/api/jobs?${qs}`, signal);
}

const DETAILS_UNAVAILABLE = "Full details aren't available for this job (it may have been removed).";

export function fetchJobDetails(id: string, signal?: AbortSignal) {
  return getJson<JobDetails>(`/api/jobs/${encodeURIComponent(id)}/details`, signal, {
    400: DETAILS_UNAVAILABLE,
    404: DETAILS_UNAVAILABLE,
  });
}
