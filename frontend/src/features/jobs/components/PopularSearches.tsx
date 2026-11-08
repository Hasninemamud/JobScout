import { useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoltIcon,
  BriefcaseIcon,
  GlobeIcon,
  SearchIcon,
  SlidersIcon,
} from "@/shared/components/Icons";
import { Reveal } from "@/shared/components/Reveal";

const POPULAR: { title: string; field: string; icon: ReactNode }[] = [
  { title: "Software Engineer", field: "Engineering", icon: <BoltIcon size={26} /> },
  { title: "Product Manager", field: "Product", icon: <BriefcaseIcon size={26} /> },
  { title: "Data Analyst", field: "Data", icon: <SlidersIcon size={26} /> },
  { title: "UX Designer", field: "Design", icon: <GlobeIcon size={26} /> },
  { title: "Marketing Manager", field: "Marketing", icon: <SearchIcon size={26} /> },
  { title: "DevOps Engineer", field: "Infrastructure", icon: <BoltIcon size={26} /> },
  { title: "Sales Representative", field: "Sales", icon: <BriefcaseIcon size={26} /> },
  { title: "Customer Success Manager", field: "Support", icon: <GlobeIcon size={26} /> },
];

export function PopularSearches({ onPick }: { onPick: (position: string) => void }) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="container">
      <Reveal className="section-head">
        <h2 className="display section-title">Find your popular roles worldwide</h2>
        <div className="carousel-arrows">
          <button type="button" className="icon-btn" aria-label="Previous roles" onClick={() => scrollBy(-1)}>
            <ArrowLeftIcon />
          </button>
          <button type="button" className="icon-btn icon-btn--orange" aria-label="Next roles" onClick={() => scrollBy(1)}>
            <ArrowRightIcon />
          </button>
        </div>
      </Reveal>

      <ul className="carousel" ref={trackRef}>
        {POPULAR.map((item, i) => (
          <motion.li
            key={item.title}
            className="popular-card"
            data-hue={i % 8}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: Math.min(i, 4) * 0.07 }}
            whileHover={{ y: -6 }}
          >
            <div className="popular-card-media">
              <span className="popular-card-icon">{item.icon}</span>
              <span className="popular-card-field">{item.field}</span>
            </div>
            <div className="popular-card-body">
              <h3>{item.title}</h3>
              <p>Latest postings, newest first</p>
              <button
                type="button"
                className={`btn btn-sm ${i === 0 ? "btn-orange" : "btn-dark"}`}
                onClick={() => onPick(item.title)}
              >
                Search now <ArrowRightIcon size={14} />
              </button>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
