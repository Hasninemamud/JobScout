import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkIcon, CloseIcon, GlobeIcon, MenuIcon } from "@/shared/components/Icons";
import { useActiveSection } from "@/shared/hooks/useActiveSection";
import { scrollToId } from "@/shared/lib/scrollToId";
import { NAV_IDS, NAV_ITEMS } from "./navigation";

interface AppHeaderProps {
  savedCount: number;
  showingSaved: boolean;
  onToggleSaved: () => void;
}

export function AppHeader({ savedCount, showingSaved, onToggleSaved }: AppHeaderProps) {
  const active = useActiveSection(NAV_IDS);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <motion.header
      className="app-header"
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 130, damping: 20 }}
    >
      <div className="container app-header-bar">
        <a className="brand" href="#top" onClick={go("top")} aria-label="JobScout home">
          <motion.span
            className="brand-mark"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.6 }}
          >
            <GlobeIcon size={20} />
          </motion.span>
          <span className="brand-name">JobScout</span>
        </a>

        <nav className="nav-pill" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav-link"
              data-active={active === item.id}
              aria-current={active === item.id ? "true" : undefined}
              onClick={go(item.id)}
            >
              {active === item.id && (
                <motion.span
                  layoutId="nav-active"
                  className="nav-link-bg"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="nav-link-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="app-header-actions">
          <button
            type="button"
            className="btn btn-orange btn-sm saved-btn"
            aria-pressed={showingSaved}
            onClick={onToggleSaved}
          >
            <BookmarkIcon size={16} filled={showingSaved} />
            <span className="saved-btn-label">{showingSaved ? "Back to search" : "Saved jobs"}</span>
            <motion.span
              key={savedCount}
              className="count-pill"
              initial={{ scale: 1.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
            >
              {savedCount}
            </motion.span>
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="container mobile-menu-inner">
              {NAV_ITEMS.map((item, i) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  className="mobile-menu-link"
                  data-active={active === item.id}
                  onClick={go(item.id)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  {item.label}
                </motion.a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
