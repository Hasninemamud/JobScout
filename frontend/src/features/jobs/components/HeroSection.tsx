import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HeroVisual } from "./HeroVisual";

const LINES = [
  { text: "Fresh jobs open the", className: "hero-line hero-line--lime" },
  { text: "door to new careers", className: "hero-line hero-line--cream" },
];

/** Dark hero: headline, product visual, and the search panel passed in as children. */
export function HeroSection({ children }: { children: ReactNode }) {
  return (
    <section id="top" className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1 className="display hero-title">
              {LINES.map((line, i) => (
                <span key={line.text} className="hero-line-mask">
                  <motion.span
                    className={line.className}
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.15 + i * 0.15, type: "spring", stiffness: 90, damping: 18 }}
                  >
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              className="hero-lead"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              Search any position and see the newest LinkedIn and bdjobs postings, from the last hour to the last 30 days, with
              full details and a direct link to apply.
            </motion.p>
          </div>

          <HeroVisual />
        </div>

        <motion.div
          className="hero-panel-wrap"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 90, damping: 18 }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
