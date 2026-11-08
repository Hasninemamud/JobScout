import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BookmarkIcon, BoltIcon, SlidersIcon } from "@/shared/components/Icons";
import { Reveal } from "@/shared/components/Reveal";

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <BoltIcon size={22} />,
    title: "Fresh from LinkedIn and bdjobs",
    text: "See postings from the last 60 minutes, 24 hours or week, using the posted times each site itself reports.",
  },
  {
    icon: <SlidersIcon size={22} />,
    title: "Filters that keep up",
    text: "Narrow by location, date, job type and remote in one click. The results update as you change them.",
  },
  {
    icon: <BookmarkIcon size={22} />,
    title: "Save and compare",
    text: "Bookmark roles to a private list that lives in your browser. No account, no sign-up, nothing to manage.",
  },
];

export function WhySection() {
  return (
    <section id="why" className="section section--dark">
      <div className="container why-grid">
        <Reveal className="why-copy">
          <span className="eyebrow">Why JobScout</span>
          <h2 className="display section-title section-title--light">Built for fast, focused job hunting</h2>
          <p>
            Most job boards bury new postings under old ones. JobScout puts the newest roles first and sends you
            straight to the original LinkedIn or bdjobs post, so you can apply while the posting is still fresh.
          </p>
        </Reveal>

        <div className="why-cards">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <motion.article className="feature-card" data-featured={i === 0} whileHover={{ x: 8 }}>
                <div className="feature-card-head">
                  <span className="feature-card-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                </div>
                <p>{f.text}</p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
