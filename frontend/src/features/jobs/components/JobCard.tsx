import { memo, type PointerEvent } from "react";
import { motion } from "framer-motion";
import { BookmarkIcon, ExternalIcon, PinIcon } from "@/shared/components/Icons";
import { companyHue } from "@/shared/lib/companyHue";
import { formatPostedTime, isPostedWithinHours } from "@/shared/lib/formatPostedTime";
import { jobSite } from "../lib/jobSite";
import type { Job } from "../types";
import { CompanyAvatar } from "./CompanyAvatar";

interface JobCardProps {
  job: Job;
  index: number;
  saved: boolean;
  onOpen: (job: Job) => void;
  onToggleSave: (job: Job) => void;
}

/** Moves a soft spotlight under the pointer. Pure CSS variables, no re-render. */
function trackPointer(e: PointerEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

export const JobCard = memo(function JobCard({ job, index, saved, onOpen, onToggleSave }: JobCardProps) {
  const posted = formatPostedTime(job.postedAt);
  const isRemoteOnly = job.remote && /^remote$/i.test(job.location);
  const where = isRemoteOnly ? "Remote" : job.location;
  const excerpt = job.description.replace(/\s+/g, " ").trim();
  const open = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onOpen(job);
  };

  return (
    <motion.article
      className="job-card"
      data-hue={companyHue(job.company)}
      layout="position"
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 220, damping: 26, delay: Math.min(index % 12, 11) * 0.05 },
      }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onPointerMove={trackPointer}
      onClick={() => onOpen(job)}
    >
      <div className="job-card-media">
        <span className="job-card-initial" aria-hidden="true">{job.company.trim().charAt(0).toUpperCase()}</span>
        {posted && (
          <span className={`job-card-age${isPostedWithinHours(job.postedAt, 24) ? " job-card-age--fresh" : ""}`}>
            {posted}
          </span>
        )}
        <motion.button
          type="button"
          className="job-card-save"
          aria-pressed={saved}
          aria-label={`${saved ? "Remove from saved" : "Save job"}: ${job.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(job);
          }}
          whileTap={{ scale: 0.8 }}
        >
          <motion.span
            key={String(saved)}
            className="icon-swap"
            initial={{ scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <BookmarkIcon size={18} filled={saved} />
          </motion.span>
        </motion.button>
        <div className="job-card-logo"><CompanyAvatar company={job.company} logo={job.logo} /></div>
      </div>

      <div className="job-card-body">
        <div className="job-card-row">
          <h3 className="job-card-title">
            <button type="button" className="job-card-title-btn" onClick={open}>{job.title}</button>
          </h3>
          {job.type && <span className="job-card-type">{job.type}</span>}
        </div>

        <div className="job-card-where">
          <PinIcon size={14} />
          <span>{job.company} · {where}</span>
        </div>

        {job.remote && !isRemoteOnly && <span className="tag tag--remote">Remote</span>}
        {excerpt && <p className="job-card-excerpt">{excerpt}</p>}

        <div className="job-card-foot">
          <button type="button" className="link-btn" onClick={open}>Details</button>
          <a
            className={`btn btn-sm btn-grow ${index === 0 ? "btn-orange" : "btn-dark"}`}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            View on {jobSite(job)} <ExternalIcon size={14} />
          </a>
        </div>
      </div>
    </motion.article>
  );
});
