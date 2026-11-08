import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

/**
 * useState that persists to localStorage and stays in sync across tabs.
 * Writes happen in the setter (an event handler), never inside a React updater, so renders stay pure.
 * Storage failures (private mode, quota) are ignored.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  // Always the newest value, so back-to-back updates compose and never start from a stale copy.
  const latest = useRef(value);

  // Pick up changes made in other tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== key) return;
      try {
        const next = e.newValue === null ? initialRef.current : (JSON.parse(e.newValue) as T);
        latest.current = next;
        setValue(next);
      } catch {
        /* ignore malformed data written by something else */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback(
    (action: SetStateAction<T>) => {
      const next = typeof action === "function" ? (action as (prev: T) => T)(latest.current) : action;
      latest.current = next;
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );

  return [value, set] as const;
}
