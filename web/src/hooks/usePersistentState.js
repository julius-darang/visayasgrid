import { useEffect, useState } from "react";
import { readPersistentValue } from "../lib/preferences.js";

// Like useState, but the value is restored from and saved to
// localStorage so personal view preferences survive reloads.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() =>
    readPersistentValue(window.localStorage, key, initial),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / disabled storage
    }
  }, [key, value]);

  return [value, setValue];
}
