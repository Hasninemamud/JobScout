import type { Job } from "../types";

/** Which site a posting lives on, for button labels. */
export const jobSite = (job: Job) => (job.url.includes("bdjobs.com") ? "bdjobs" : "LinkedIn");
