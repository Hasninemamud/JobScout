import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { mergeJobDetails } from "../lib/mergeJobDetails";
import type { Job, JobDetails } from "../types";

/**
 * Saved jobs live in localStorage. Scraped jobs start without a description, so details are snapshotted into
 * the saved copy as soon as they are known (at save time if already loaded, or whenever they load later).
 * That way a saved job keeps its description even if the posting disappears or the server's data source changes.
 */
export function useSavedJobs() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useLocalStorage<Job[]>("jobscout.saved", []);

  const isSaved = useCallback((id: string) => saved.some((j) => j.id === id), [saved]);

  const toggleSaved = useCallback(
    (job: Job) => {
      const details = queryClient.getQueryData<JobDetails>(["job-details", job.id]);
      const snapshot = details ? mergeJobDetails(job, details) : job;
      setSaved((list) => (list.some((j) => j.id === job.id) ? list.filter((j) => j.id !== job.id) : [snapshot, ...list]));
    },
    [queryClient, setSaved],
  );

  // Details that finish loading after a job was saved (for example when its modal is opened later).
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "success") return;
        const [scope, id] = event.query.queryKey;
        if (scope !== "job-details") return;
        const details = event.query.state.data as JobDetails;
        setSaved((list) =>
          list.some((j) => j.id === id && j.needsDetails)
            ? list.map((j) => (j.id === id ? mergeJobDetails(j, details) : j))
            : list,
        );
      }),
    [queryClient, setSaved],
  );

  return { saved, isSaved, toggleSaved };
}
