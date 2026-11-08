/** Page sections reachable from the header and footer. `id` matches the section's DOM id. */
export const NAV_ITEMS = [
  { id: "top", label: "Home" },
  { id: "popular", label: "Popular" },
  { id: "why", label: "Why us" },
  { id: "how", label: "How it works" },
  { id: "faq", label: "FAQ" },
] as const;

export const NAV_IDS = NAV_ITEMS.map((item) => item.id);
