import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon, CopyIcon, ExternalIcon } from "@/shared/components/Icons";
import { useScrollLock } from "@/shared/hooks/useScrollLock";
import { formatPostedTime } from "@/shared/lib/formatPostedTime";
import { useJobDetails } from "../hooks/useJobDetails";
import { jobSite } from "../lib/jobSite";
import type { Job } from "../types";
import { CompanyAvatar } from "./CompanyAvatar";

interface JobDetailModalProps {
  job: Job | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: (job: Job) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function JobDetailModal({ job, saved, onClose, onToggleSave }: JobDetailModalProps) {
  return (
    <AnimatePresence>
      {job && <ModalPanel key={job.id} job={job} saved={saved} onClose={onClose} onToggleSave={onToggleSave} />}
    </AnimatePresence>
  );
}

function ModalPanel({ job: base, saved, onClose, onToggleSave }: JobDetailModalProps & { job: Job }) {
  const { job, isLoading, error } = useJobDetails(base);
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useScrollLock();

  // Focus management and keyboard handling for the lifetime of the dialog.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(job.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const description = isLoading
    ? null
    : error
      ? `${error}\n\nYou can still read the full posting with the "Open on ${jobSite(job)}" button.`
      : job.description || `No description available here. Open the posting on ${jobSite(job)} for full details.`;

  const facts: [string, string][] = [
    ["Location", job.remote && !/^remote$/i.test(job.location) ? `${job.location} · Remote` : job.location],
    ["Job type", job.type || "Not specified"],
    ["Posted", formatPostedTime(job.postedAt) || "Recently"],
    ...(job.seniority ? ([["Seniority", job.seniority]] as [string, string][]) : []),
    ...(job.industry ? ([["Industry", job.industry]] as [string, string][]) : []),
  ];

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        <div className="modal-scroll">
          <header className="modal-head">
            <CompanyAvatar company={job.company} logo={job.logo} />
            <div>
              <h2 id="job-modal-title">{job.title}</h2>
              <div className="job-card-company">
                {job.companyUrl ? (
                  <a href={job.companyUrl} target="_blank" rel="noopener noreferrer">{job.company}</a>
                ) : (
                  job.company
                )}
              </div>
            </div>
          </header>

          <motion.dl
            className="facts"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
          >
            {facts.map(([label, value]) => (
              <motion.div
                key={label}
                className="fact"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              >
                <dt>{label}</dt>
                <dd>{value}</dd>
              </motion.div>
            ))}
          </motion.dl>

          {description === null ? (
            <div className="modal-loading" aria-live="polite">
              <span className="sr-only">Loading full description…</span>
              {[100, 92, 96, 70, 100, 84].map((w, i) => (
                <div key={i} className={`skeleton skeleton--line skeleton--w${w}`} />
              ))}
            </div>
          ) : (
            <motion.p className="modal-description" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {description}
            </motion.p>
          )}
        </div>

        <footer className="modal-actions">
          <a className="btn btn-orange btn-grow" href={job.url} target="_blank" rel="noopener noreferrer">
            Open on {jobSite(job)} <ExternalIcon size={16} />
          </a>
          <button type="button" className="btn btn-outline" aria-pressed={saved} onClick={() => onToggleSave(job)}>
            {saved ? "Saved" : "Save job"}
          </button>
          <button type="button" className="btn btn-outline" onClick={copyLink}>
            <CopyIcon size={16} /> {copied ? "Copied!" : "Copy link"}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
