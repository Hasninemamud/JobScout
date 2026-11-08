/** "just now", "12 min ago", "5h ago", "3 days ago". */
export function formatPostedTime(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const ms = now - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.max(0, ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.floor(mins)} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.floor(mins / 1440);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function isPostedWithinHours(iso: string | null, hours: number, now = Date.now()): boolean {
  return Boolean(iso) && now - new Date(iso as string).getTime() < hours * 3_600_000;
}
