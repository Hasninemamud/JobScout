import { useState } from "react";
import { JobsPage } from "@/features/jobs/JobsPage";
import { useSavedJobs } from "@/features/jobs/hooks/useSavedJobs";
import { LandingSections } from "@/features/landing/LandingSections";
import { scrollToId } from "@/shared/lib/scrollToId";
import { AppHeader } from "./AppHeader";
import { AppProviders } from "./AppProviders";
import { SiteFooter } from "./SiteFooter";

export function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

// Lives inside AppProviders because useSavedJobs needs the query client.
function AppShell() {
  const { saved, isSaved, toggleSaved } = useSavedJobs();
  const [view, setView] = useState<"search" | "saved">("search");

  const toggleSavedView = () => {
    const next = view === "saved" ? "search" : "saved";
    setView(next);
    // Wait a frame so the results section exists before scrolling to it.
    setTimeout(() => scrollToId(next === "saved" ? "results" : "top"), 60);
  };

  return (
    <>
      <AppHeader savedCount={saved.length} showingSaved={view === "saved"} onToggleSaved={toggleSavedView} />
      <JobsPage view={view} saved={saved} isSaved={isSaved} onToggleSave={toggleSaved} />
      <LandingSections />
      <SiteFooter />
    </>
  );
}
