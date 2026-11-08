import { motion } from "framer-motion";
import { ArrowDownIcon } from "@/shared/components/Icons";
import { scrollToId } from "@/shared/lib/scrollToId";

/** Circular rotating-text badge that scrolls to the popular searches. */
export function ExploreBadge() {
  return (
    <motion.button
      type="button"
      className="explore-badge"
      aria-label="Explore popular searches"
      onClick={() => scrollToId("popular")}
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 1.1, type: "spring", stiffness: 160, damping: 14 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg className="explore-badge-ring" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <path id="explore-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <text>
          <textPath href="#explore-circle" startOffset="0" textLength="272" lengthAdjust="spacing">
            EXPLORE MORE • EXPLORE MORE •
          </textPath>
        </text>
      </svg>
      <span className="explore-badge-arrow"><ArrowDownIcon size={22} /></span>
    </motion.button>
  );
}
