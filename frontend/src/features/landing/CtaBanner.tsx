import { motion } from "framer-motion";
import { ArrowRightIcon } from "@/shared/components/Icons";
import { Reveal } from "@/shared/components/Reveal";
import { scrollToId } from "@/shared/lib/scrollToId";

export function CtaBanner() {
  const startSearching = () => {
    scrollToId("top");
    // Focus once the smooth scroll has mostly finished, so the page doesn't jump.
    setTimeout(() => document.querySelector<HTMLInputElement>('input[name="position"]')?.focus({ preventScroll: true }), 650);
  };

  return (
    <section className="section section--cream section--cta">
      <div className="container">
        <Reveal>
          <div className="cta-banner">
            <motion.span
              className="cta-orb cta-orb--one"
              aria-hidden="true"
              animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="cta-orb cta-orb--two"
              aria-hidden="true"
              animate={{ y: [0, 14, 0], x: [0, -12, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <h2 className="display cta-title">Get the latest jobs before everyone else</h2>
            <p>Check the past hour. The best roles often fill within days of posting.</p>
            <button type="button" className="btn btn-lime btn-shine cta-button" onClick={startSearching}>
              Start searching <ArrowRightIcon size={16} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
