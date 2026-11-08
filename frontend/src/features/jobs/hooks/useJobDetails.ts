import { useQuery } from "@tanstack/react-query";
import { fetchJobDetails } from "../api/jobsApi";
import { mergeJobDetails } from "../lib/mergeJobDetails";
import type { Job } from "../types";

/** Merges a job with its full description, fetched on demand for scraped listings. */
export function useJobDetails(base: Job) {
  const enabled = Boolean(base.needsDetails);
  const query = useQuery({
    queryKey: ["job-details", base.id],
    queryFn: ({ signal }) => fetchJobDetails(base.id, signal),
    enabled,
    staleTime: Infinity,
  });

  return {
    job: query.data ? mergeJobDetails(base, query.data) : base,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
