import { AnimatePresence } from "framer-motion";
import type { Job } from "../types";
import { JobCard } from "./JobCard";

interface JobGridProps {
  jobs: Job[];
  isSaved: (id: string) => boolean;
  onOpen: (job: Job) => void;
  onToggleSave: (job: Job) => void;
}

export function JobGrid({ jobs, isSaved, onOpen, onToggleSave }: JobGridProps) {
  return (
    <div className="job-grid">
      <AnimatePresence>
        {jobs.map((job, i) => (
          <JobCard
            key={job.id}
            job={job}
            index={i}
            saved={isSaved(job.id)}
            onOpen={onOpen}
            onToggleSave={onToggleSave}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
