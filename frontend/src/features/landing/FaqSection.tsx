import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "@/shared/components/Icons";
import { Reveal } from "@/shared/components/Reveal";

const FAQS = [
  {
    q: "Where do the jobs come from?",
    a: "From LinkedIn's and bdjobs.com's public job pages together, or from a licensed data API when one is configured. Every card links back to the original posting.",
  },
  {
    q: "How fresh are the results?",
    a: "The “Past hour” filter shows roles reported as posted in the last 60 minutes. Posted times on each card come from the site the job is on.",
  },
  {
    q: "Why do job type and remote filters sometimes miss jobs?",
    a: "LinkedIn ignores those two filters for public searches, and bdjobs has no remote filter, so JobScout matches them against job titles instead. A role that doesn't mention it in the title can be missed. The date filter is exact.",
  },
  {
    q: "Do I need an account?",
    a: "No. Saved jobs and recent searches are stored in your own browser and never leave your device.",
  },
  {
    q: "Why does it sometimes say a site is throttling requests?",
    a: "LinkedIn and bdjobs limit how quickly their public pages can be read. Wait a minute and press “Try again”. Searches are cached for a few minutes to keep requests low.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section section--dark">
      <div className="container faq-grid">
        <Reveal className="faq-intro">
          <span className="eyebrow">FAQ</span>
          <h2 className="display section-title section-title--light">Questions, answered</h2>
        </Reveal>

        <div className="faq-list">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.06}>
                <div className="faq-item" data-open={isOpen}>
                  <h3>
                    <button
                      type="button"
                      className="faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span>{item.q}</span>
                      <motion.span className="faq-icon" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                        <PlusIcon size={18} />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        className="faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                      >
                        <p>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
