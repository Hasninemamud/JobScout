import { useEffect } from "react";

// Shared across every caller so overlapping locks (e.g. one modal closing while another opens)
// restore the page's original styles exactly once, when the last lock is released.
let activeLocks = 0;
let original: { overflow: string; paddingRight: string } | null = null;

/** Locks page scrolling while the calling component is mounted, without shifting the layout. */
export function useScrollLock() {
  useEffect(() => {
    const { body, documentElement } = document;
    if (activeLocks++ === 0) {
      original = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      if (--activeLocks === 0 && original) {
        body.style.overflow = original.overflow;
        body.style.paddingRight = original.paddingRight;
        original = null;
      }
    };
  }, []);
}
