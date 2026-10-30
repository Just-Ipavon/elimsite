import { useEffect, useState } from 'react';

// Larghezza dell'editor in Pratica (in % dell'area di lavoro, solo desktop).
export const SPLIT_DEFAULT = 58;
export const SPLIT_MIN = 25;
export const SPLIT_MAX = 75;
export const SPLIT_STEP = 2;
const clampSplit = (value) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));

/** Larghezza dell'editor in % (desktop), ricordata nel browser con `storageKey`. */
export const useSplit = (storageKey) => {
  const [split, setSplit] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(storageKey));
      return stored ? clampSplit(stored) : SPLIT_DEFAULT;
    } catch {
      return SPLIT_DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(Math.round(split * 10) / 10));
    } catch {
      // Senza storage la larghezza vale solo per questa visita.
    }
  }, [storageKey, split]);
  return [split, (value) => setSplit(clampSplit(value))];
};
