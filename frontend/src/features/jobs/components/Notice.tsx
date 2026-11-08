import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Inline banner that slides open and closed. Pass `null` children to hide it. */
export function Notice({ children }: { children: ReactNode | null }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          key="notice"
          role="status"
          className="notice"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="notice-body">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
