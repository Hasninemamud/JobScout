import type { MouseEvent } from "react";
import { GlobeIcon } from "@/shared/components/Icons";
import { scrollToId } from "@/shared/lib/scrollToId";
import { NAV_ITEMS } from "./navigation";

export function SiteFooter() {
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    scrollToId(id);
  };

  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <a className="brand" href="#top" onClick={go("top")}>
          <span className="brand-mark"><GlobeIcon size={20} /></span>
          <span className="brand-name">JobScout</span>
        </a>
        <nav className="footer-links" aria-label="Footer">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.id}`} onClick={go(item.id)}>{item.label}</a>
          ))}
        </nav>
        <p className="footer-note">
          Job details come from LinkedIn&rsquo;s and bdjobs&rsquo; public pages or a data API and always link back to the
          original posting. JobScout is not affiliated with LinkedIn or bdjobs.
        </p>
      </div>
    </footer>
  );
}
