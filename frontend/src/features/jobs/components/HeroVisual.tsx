import { motion } from "framer-motion";
import { BoltIcon, PinIcon } from "@/shared/components/Icons";
import { ExploreBadge } from "./ExploreBadge";

// Illustrative product shot. These are not real postings, so no company names are shown.
const MOCK_JOBS = [
  { title: "Senior Product Designer", meta: "Remote · Full-time", age: "4 min ago", fresh: true },
  { title: "Frontend Engineer", meta: "London · Hybrid", age: "12 min ago", fresh: true },
  { title: "Data Analyst", meta: "New York · Contract", age: "38 min ago", fresh: false },
];

export function HeroVisual() {
  return (
    <div className="hero-visual">
      <motion.div
        className="hero-frame"
        initial={{ opacity: 0, x: 60, rotate: 3 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 70, damping: 16 }}
      >
        <div className="hero-frame-glow" aria-hidden="true" />

        <div className="hero-live" aria-hidden="true">
          <span className="hero-live-dot" /> Live · updated hourly
        </div>

        <ul className="mock-stack" aria-hidden="true">
          {MOCK_JOBS.map((job, i) => (
            <motion.li
              key={job.title}
              className="mock-job"
              data-offset={i}
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
              transition={{
                opacity: { delay: 0.7 + i * 0.15, duration: 0.5 },
                scale: { delay: 0.7 + i * 0.15, duration: 0.5 },
                y: { delay: 1.2 + i * 0.3, duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <span className="mock-job-icon"><BoltIcon size={18} /></span>
              <span className="mock-job-text">
                <strong>{job.title}</strong>
                <small><PinIcon size={12} /> {job.meta}</small>
              </span>
              <span className={`mock-job-age${job.fresh ? " mock-job-age--fresh" : ""}`}>{job.age}</span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="hero-chip"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
          transition={{
            opacity: { delay: 1.5 }, scale: { delay: 1.5, type: "spring" },
            y: { delay: 2, duration: 5, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          Direct LinkedIn links
        </motion.div>
      </motion.div>

      <ExploreBadge />
    </div>
  );
}
