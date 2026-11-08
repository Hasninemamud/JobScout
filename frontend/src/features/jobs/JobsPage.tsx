import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { AlertIcon, BookmarkIcon, SearchIcon } from "@/shared/components/Icons";
import { scrollToId } from "@/shared/lib/scrollToId";
import type { Job } from "./types";
import { EmptyState } from "./components/EmptyState";
import { HeroSection } from "./components/HeroSection";
import { JobDetailModal } from "./components/JobDetailModal";
import { JobGrid } from "./components/JobGrid";
import { JobSkeletonGrid } from "./components/JobSkeletonGrid";
import { Notice } from "./components/Notice";
import { PopularSearches } from "./components/PopularSearches";
import { ResultsHeader } from "./components/ResultsHeader";
import { SearchPanel } from "./components/SearchPanel";
import { useJobSearch } from "./hooks/useJobSearch";
import { useRecentSearches } from "./hooks/useRecentSearches";
import { useSearchFilters } from "./hooks/useSearchFilters";

interface JobsPageProps {
  view: "search" | "saved";
  saved: Job[];
  isSaved: (id: string) => boolean;
  onToggleSave: (job: Job) => void;
}

export function JobsPage({ view, saved, isSaved, onToggleSave }: JobsPageProps) {
  const { draft, active, updateDraft, submit, setFilter } = useSearchFilters();
  const { recent, addRecent } = useRecentSearches();
  const search = useJobSearch(active);
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const closeJob = useCallback(() => setOpenJob(null), []);

  const runSearch = (patch?: Parameters<typeof submit>[0]) => {
    const position = (patch?.position ?? draft.position).trim();
    if (!submit(patch)) return;
    addRecent(position);
    // The results section mounts on the next render; give it a moment, then bring it into view.
    setTimeout(() => scrollToId("results"), 80);
  };

  const hasSearched = active.position.length > 0;
  const showResults = hasSearched || view === "saved";
  const filtersHint =
    (search.source === "scrape" || search.source === "all") && (active.type || active.remote)
      ? "LinkedIn ignores job-type and remote filters for public searches, so on all sites these are matched on job titles. Some matching jobs may be missed."
      : null;

  return (
    <>
      <HeroSection>
        <SearchPanel
          draft={draft}
          isSearching={search.isLoading}
          recent={recent}
          onChange={updateDraft}
          onFilter={setFilter}
          onSubmit={() => runSearch()}
          onPick={(position) => runSearch({ position })}
        />
      </HeroSection>

      {showResults && (
        <section id="results" className="section section--cream">
          <div className="container">
            {view === "saved" ? (
              <SavedResults saved={saved} isSaved={isSaved} onOpen={setOpenJob} onToggleSave={onToggleSave} />
            ) : (
              <>
                <ResultsHeader
                  title={`${active.position}${active.location ? ` in ${active.location}` : ""}`}
                  count={!search.isLoading && !search.error ? search.jobs.length : null}
                  suffix="jobs loaded"
                />
                <Notice>
                  {search.isDemo ? (
                    <span><strong>Demo mode.</strong> Showing sample listings, not real postings. Set <code>JOB_SOURCE=scrape</code> for live results.</span>
                  ) : (
                    filtersHint && <span>{filtersHint}</span>
                  )}
                </Notice>

                {search.isLoading ? (
                  <JobSkeletonGrid />
                ) : search.error ? (
                  <EmptyState
                    icon={<AlertIcon size={28} />}
                    title="Couldn't load jobs"
                    message={search.error}
                    action={{ label: "Try again", onClick: search.retry }}
                  />
                ) : search.jobs.length === 0 ? (
                  <EmptyState
                    icon={<SearchIcon size={28} />}
                    title={search.hasMore ? "No matches on this page" : "No jobs found"}
                    message={
                      search.hasMore
                        ? "Nothing here fit your filters yet. Use “Load more jobs” to keep looking."
                        : active.posted === "1h"
                          ? "Nothing was posted in the last hour. Try “Past 24 hours”, or a broader title."
                          : "Try a broader title, remove the location, or widen the date range."
                    }
                  />
                ) : (
                  <JobGrid jobs={search.jobs} isSaved={isSaved} onOpen={setOpenJob} onToggleSave={onToggleSave} />
                )}

                {search.hasMore && !search.isLoading && (
                  <motion.div className="load-more" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {search.loadMoreError && (
                      <p className="load-more-error" role="alert">{search.loadMoreError}</p>
                    )}
                    <button type="button" className="btn btn-dark" onClick={search.loadMore} disabled={search.isLoadingMore}>
                      {search.isLoadingMore && <span className="spinner" aria-hidden="true" />}
                      {search.isLoadingMore ? "Loading" : search.loadMoreError ? "Try again" : "Load more jobs"}
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section id="popular" className="section section--cream section--popular">
        <PopularSearches onPick={(position) => runSearch({ position })} />
      </section>

      <JobDetailModal job={openJob} saved={openJob ? isSaved(openJob.id) : false} onClose={closeJob} onToggleSave={onToggleSave} />
    </>
  );
}

interface SavedResultsProps {
  saved: Job[];
  isSaved: (id: string) => boolean;
  onOpen: (job: Job) => void;
  onToggleSave: (job: Job) => void;
}

function SavedResults({ saved, isSaved, onOpen, onToggleSave }: SavedResultsProps) {
  return (
    <>
      <ResultsHeader title="Saved jobs" count={saved.length} suffix="saved" />
      {saved.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon size={28} />}
          title="No saved jobs yet"
          message="Tap the bookmark on any job to keep it here for later."
        />
      ) : (
        <JobGrid jobs={saved} isSaved={isSaved} onOpen={onOpen} onToggleSave={onToggleSave} />
      )}
    </>
  );
}
