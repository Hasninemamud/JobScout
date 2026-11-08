import { useCallback } from "react";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

const MAX_RECENT = 5;

export function useRecentSearches() {
  const [recent, setRecent] = useLocalStorage<string[]>("jobscout.recent", []);

  const addRecent = useCallback(
    (position: string) =>
      setRecent((list) =>
        [position, ...list.filter((p) => p.toLowerCase() !== position.toLowerCase())].slice(0, MAX_RECENT),
      ),
    [setRecent],
  );

  return { recent, addRecent };
}
