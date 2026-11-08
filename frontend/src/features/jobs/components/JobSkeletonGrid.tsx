const SKELETON_COUNT = 6;

export function JobSkeletonGrid() {
  return (
    <div className="job-grid" aria-hidden="true">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div className="job-card job-card--skeleton" key={i}>
          <div className="job-card-body job-card-body--skeleton">
            <div className="skeleton skeleton--banner" />
            <div className="skeleton skeleton--line skeleton--w80" />
            <div className="skeleton skeleton--line skeleton--w40" />
            <div className="skeleton skeleton--line skeleton--w100" />
            <div className="skeleton skeleton--line skeleton--w70" />
          </div>
        </div>
      ))}
    </div>
  );
}
