import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'imageproc-theme';

export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

/** Tema attivo ('light' | 'dark') e funzione per cambiarlo. */
export const useTheme = () => useContext(ThemeContext);

/** Tema iniziale: scelta salvata, altrimenti preferenza del sistema. */
export const initialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage non disponibile: si usa la preferenza del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
