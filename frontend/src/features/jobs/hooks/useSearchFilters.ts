import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FILTERS, POSTED_OPTIONS, SITE_OPTIONS, TYPE_OPTIONS, type SearchFilters } from "../types";

function readFiltersFromUrl(): SearchFilters {
  // A refresh starts clean; opening a shared link or using back/forward still restores the search.
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "reload") return DEFAULT_FILTERS;
  const q = new URLSearchParams(window.location.search);
  const posted = q.get("posted");
  const type = q.get("type");
  return {
    position: (q.get("position") ?? "").trim().slice(0, 100),
    company: (q.get("company") ?? "").trim().slice(0, 100),
    location: (q.get("location") ?? "").trim().slice(0, 100),
    posted: POSTED_OPTIONS.find((o) => o.value === posted)?.value ?? DEFAULT_FILTERS.posted,
    type: TYPE_OPTIONS.find((o) => o.value === type)?.value ?? "",
    remote: q.get("remote") === "1",
    site: SITE_OPTIONS.find((o) => o.value === q.get("site"))?.value ?? "",
  };
}

function writeFiltersToUrl(f: SearchFilters) {
  const qs = new URLSearchParams();
  if (f.position || f.company) {
    if (f.position) qs.set("position", f.position);
    if (f.company) qs.set("company", f.company);
    if (f.location) qs.set("location", f.location);
    if (f.posted !== DEFAULT_FILTERS.posted) qs.set("posted", f.posted);
    if (f.type) qs.set("type", f.type);
    if (f.remote) qs.set("remote", "1");
    if (f.site) qs.set("site", f.site);
  }
  window.history.replaceState(null, "", qs.size ? `?${qs}` : window.location.pathname);
}

/**
 * `draft` is what the form shows; `active` is what has actually been searched.
 * Typing only changes the draft. Submitting (or changing a filter after a search) updates `active`.
 */
export function useSearchFilters() {
  const [active, setActive] = useState<SearchFilters>(readFiltersFromUrl);
  const [draft, setDraft] = useState<SearchFilters>(active);

  useEffect(() => writeFiltersToUrl(active), [active]);

  const updateDraft = useCallback((patch: Partial<SearchFilters>) => setDraft((d) => ({ ...d, ...patch })), []);

  /** Runs a search. Returns false when there is no position or company to search for. */
  const submit = useCallback(
    (patch: Partial<SearchFilters> = {}) => {
      const next = { ...draft, ...patch };
      next.position = next.position.trim();
      next.company = next.company.trim();
      next.location = next.location.trim();
      setDraft(next);
      if (!next.position && !next.company) return false;
      setActive(next);
      return true;
    },
    [draft],
  );

  /** Filter chips apply instantly once a search exists; before that they just prepare the next search. */
  const setFilter = useCallback(
    <K extends "posted" | "type" | "remote" | "site">(key: K, value: SearchFilters[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setActive((a) => (a.position || a.company ? { ...a, [key]: value } : a));
    },
    [],
  );

  return { draft, active, updateDraft, submit, setFilter };
}
