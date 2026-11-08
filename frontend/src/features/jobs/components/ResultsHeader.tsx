import { AnimatedNumber } from "@/shared/components/AnimatedNumber";

interface ResultsHeaderProps {
  title: string;
  count: number | null;
  suffix: string;
}

export function ResultsHeader({ title, count, suffix }: ResultsHeaderProps) {
  return (
    <div className="section-head">
      <h2 className="display section-title">{title}</h2>
      {count !== null && (
        <span className="results-count">
          <strong><AnimatedNumber value={count} /></strong> {suffix}
        </span>
      )}
    </div>
  );
}
