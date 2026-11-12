import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchJobsPage } from "../api/jobsApi";
import type { Job, SearchFilters } from "../types";

const postedTime = (job: Job) => Date.parse(job.postedAt ?? "") || 0;

/** Paginated job search. Retries are off so a throttled scrape source isn't hammered. */
export function useJobSearch(filters: SearchFilters) {
  const query = useInfiniteQuery({
    queryKey: ["jobs", filters],
    queryFn: ({ pageParam, signal }) => fetchJobsPage(filters, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: filters.position.length > 0 || filters.company.length > 0,
  });

  // Newest first across every loaded page. The sort is stable, so equal or missing dates keep the server's order.
  const jobs = useMemo<Job[]>(() => {
    const seen = new Set<string>();
    const unique = (query.data?.pages ?? []).flatMap((p) => p.jobs).filter((j) => !seen.has(j.id) && seen.add(j.id));
    return unique.sort((a, b) => postedTime(b) - postedTime(a));
  }, [query.data]);

  // One list per fetched page, for the pager. A job already shown on an earlier page is not repeated.
  const pages = useMemo<Job[][]>(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? []).map((p) =>
      p.jobs.filter((j) => !seen.has(j.id) && seen.add(j.id)).sort((a, b) => postedTime(b) - postedTime(a)),
    );
  }, [query.data]);

  const message = query.error instanceof Error ? query.error.message : null;
  const hasLoadedPages = Boolean(query.data);

  return {
    jobs,
    pages,
    source: query.data?.pages[0]?.source,
    isDemo: query.data?.pages[0]?.demo ?? false,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    // A failure before anything loaded replaces the results; a failure after some pages loaded must not.
    error: hasLoadedPages ? null : message,
    loadMoreError: hasLoadedPages ? message : null,
    loadMore: () => query.fetchNextPage(),
    // Only offered when nothing has loaded, so this never re-requests a pile of pages from a throttled source.
    retry: () => void query.refetch(),
  };
}
