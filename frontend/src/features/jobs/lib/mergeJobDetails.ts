import type { Job, JobDetails } from "../types";

/** Combines a card-level job with its fetched details. The result no longer needs a details request. */
export function mergeJobDetails(job: Job, details: JobDetails): Job {
  return { ...job, ...details, type: details.type || job.type, needsDetails: false };
}
