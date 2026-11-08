import { motion } from "framer-motion";
import { Reveal } from "@/shared/components/Reveal";

const STEPS = [
  { n: "01", title: "Search a position", text: "Type a job title and, if you like, a city or country. Or tap one of the popular roles." },
  { n: "02", title: "Filter to what fits", text: "Pick how recent the posting should be, then narrow by job type or remote." },
  { n: "03", title: "Open the posting", text: "Read the full details here, save the role for later, or jump straight to LinkedIn to apply." },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="section section--cream">
      <div className="container">
        <Reveal className="section-head section-head--center">
          <h2 className="display section-title">How it works</h2>
        </Reveal>

        <div className="steps">
          <motion.span
            className="steps-line"
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12} className="step">
              <motion.div className="step-card" whileHover={{ y: -6 }}>
                <span className="display step-number">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
