import type { Job } from "../types";

const SITES: [host: string, name: string][] = [
  ["bdjobs.com", "bdjobs"],
  ["remotive.com", "Remotive"],
  ["remoteok.com", "RemoteOK"],
  ["weworkremotely.com", "We Work Remotely"],
  ["himalayas.app", "Himalayas"],
];

/** Which site a posting lives on, for button labels. Anything else is LinkedIn. */
export function jobSite(job: Job) {
  const host = new URL(job.url).hostname.toLowerCase();
  return SITES.find(([h]) => host === h || host.endsWith(`.${h}`))?.[1] ?? "LinkedIn";
}
