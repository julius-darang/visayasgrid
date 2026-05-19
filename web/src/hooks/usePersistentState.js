import { useEffect, useState } from "react";

// Like useState, but the value is restored from and saved to
// localStorage so personal view preferences survive reloads.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / disabled storage
    }
  }, [key, value]);

  return [value, setValue];
}
