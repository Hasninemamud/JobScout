export type PostedWindow = "1h" | "24h" | "7d" | "30d";
export type JobType = "" | "full-time" | "part-time" | "contract" | "internship" | "temporary";
type JobSource = "scrape" | "api" | "demo" | "bdjobs" | "remote" | "all";

export type SiteFilter = "" | "linkedin" | "bdjobs" | "remote" | "remotive" | "remoteok" | "weworkremotely" | "himalayas";

export interface SearchFilters {
  position: string;
  company: string;
  location: string;
  posted: PostedWindow;
  type: JobType;
  remote: boolean;
  site: SiteFilter;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyUrl: string | null;
  logo: string | null;
  location: string;
  remote: boolean;
  type: string;
  postedAt: string | null;
  description: string;
  url: string;
  /** Scraped jobs only carry card data; the full text is fetched when a job is opened. */
  needsDetails?: boolean;
  seniority?: string;
  industry?: string;
}

export interface JobsPage {
  source: JobSource;
  demo: boolean;
  page: number;
  hasMore: boolean;
  jobs: Job[];
}

export interface JobDetails {
  description: string;
  type: string;
  seniority: string;
  industry: string;
}

export const DEFAULT_FILTERS: SearchFilters = {
  position: "",
  company: "",
  location: "",
  posted: "7d",
  type: "",
  remote: false,
  site: "",
};

export const POSTED_OPTIONS: { value: PostedWindow; label: string }[] = [
  { value: "1h", label: "Past hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "Past week" },
  { value: "30d", label: "Past 30 days" },
];

export const SITE_OPTIONS: { value: SiteFilter; label: string }[] = [
  { value: "", label: "All sites" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "bdjobs", label: "bdjobs" },
  { value: "remote", label: "All remote boards" },
  { value: "remotive", label: "Remotive" },
  { value: "remoteok", label: "RemoteOK" },
  { value: "weworkremotely", label: "We Work Remotely" },
  { value: "himalayas", label: "Himalayas" },
];

export const TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "", label: "Any job type" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];
