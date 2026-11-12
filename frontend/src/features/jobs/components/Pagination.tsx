interface PaginationProps {
  page: number;
  loadedPages: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  onPage: (page: number) => void;
  onNext: () => void;
}

/** Previous / numbered pages / Next. Pages are fetched one at a time, so "Next" fetches the page after the last loaded one. */
export function Pagination({ page, loadedPages, hasMore, isLoading, error, onPage, onNext }: PaginationProps) {
  if (loadedPages <= 1 && !hasMore) return null;
  return (
    <nav className="pagination" aria-label="Job results pages">
      {error && <p className="load-more-error" role="alert">{error}</p>}
      <div className="pagination-row">
        <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1 || isLoading} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        {Array.from({ length: loadedPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`btn btn-sm pagination-num ${n === page ? "btn-orange" : "btn-outline"}`}
            aria-current={n === page ? "page" : undefined}
            disabled={isLoading}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-dark btn-sm"
          disabled={isLoading || (page >= loadedPages && !hasMore)}
          onClick={onNext}
        >
          {isLoading && <span className="spinner" aria-hidden="true" />}
          {isLoading ? "Loading" : "Next"}
        </button>
      </div>
    </nav>
  );
}
