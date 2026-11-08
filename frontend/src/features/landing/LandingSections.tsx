import { CtaBanner } from "./CtaBanner";
import { FaqSection } from "./FaqSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { MarqueeBand } from "./MarqueeBand";
import { WhySection } from "./WhySection";

/** Marketing sections shown below the job search. Purely presentational. */
export function LandingSections() {
  return (
    <>
      <MarqueeBand />
      <WhySection />
      <HowItWorksSection />
      <FaqSection />
      <CtaBanner />
    </>
  );
}
