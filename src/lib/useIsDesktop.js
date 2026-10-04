import { useSyncExternalStore } from 'react';
import { baseEditorOptions } from './monacoTheme';

const QUERY = '(min-width: 1024px)';

const subscribe = (callback) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** true da `lg` in su (stesso breakpoint di Tailwind): layout affiancato. */
export const useIsDesktop = () => useSyncExternalStore(subscribe, getSnapshot, () => true);

// Su telefono: testo più compatto, niente folding e la rotella/il dito
// a fine editor fanno scorrere la pagina invece di restare intrappolati.
const MOBILE_EDITOR_OPTIONS = {
  fontSize: 12.5,
  lineHeight: 19,
  lineNumbersMinChars: 3,
  folding: false,
  padding: { top: 10, bottom: 10 },
  scrollbar: { ...baseEditorOptions.scrollbar, alwaysConsumeMouseWheel: false },
};

/** Opzioni Monaco adattate alla larghezza: su mobile vincono le metriche compatte. */
export const useEditorOptions = (options) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? options : { ...options, ...MOBILE_EDITOR_OPTIONS };
};

/** Porta un elemento in vista solo su mobile, dove i pannelli sono impilati. */
export const scrollIntoViewOnMobile = (el) => {
  if (!el || window.matchMedia(QUERY).matches) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Dopo il render, così il pannello ha già il contenuto nuovo
  requestAnimationFrame(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
};
