import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FILTERS, POSTED_OPTIONS, TYPE_OPTIONS, type SearchFilters } from "../types";

function readFiltersFromUrl(): SearchFilters {
  const q = new URLSearchParams(window.location.search);
  const posted = q.get("posted");
  const type = q.get("type");
  return {
    position: (q.get("position") ?? "").trim().slice(0, 100),
    location: (q.get("location") ?? "").trim().slice(0, 100),
    posted: POSTED_OPTIONS.find((o) => o.value === posted)?.value ?? DEFAULT_FILTERS.posted,
    type: TYPE_OPTIONS.find((o) => o.value === type)?.value ?? "",
    remote: q.get("remote") === "1",
  };
}

function writeFiltersToUrl(f: SearchFilters) {
  const qs = new URLSearchParams();
  if (f.position) {
    qs.set("position", f.position);
    if (f.location) qs.set("location", f.location);
    if (f.posted !== DEFAULT_FILTERS.posted) qs.set("posted", f.posted);
    if (f.type) qs.set("type", f.type);
    if (f.remote) qs.set("remote", "1");
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

  /** Runs a search. Returns false when there is no position to search for. */
  const submit = useCallback(
    (patch: Partial<SearchFilters> = {}) => {
      const next = { ...draft, ...patch };
      next.position = next.position.trim();
      next.location = next.location.trim();
      setDraft(next);
      if (!next.position) return false;
      setActive(next);
      return true;
    },
    [draft],
  );

  /** Filter chips apply instantly once a search exists; before that they just prepare the next search. */
  const setFilter = useCallback(
    <K extends "posted" | "type" | "remote">(key: K, value: SearchFilters[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setActive((a) => (a.position ? { ...a, [key]: value } : a));
    },
    [],
  );

  return { draft, active, updateDraft, submit, setFilter };
}
