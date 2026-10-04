import { useEffect, useRef } from 'react';
import { FileCode2 } from 'lucide-react';
import EditorFrame from '../ui/EditorFrame';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

/** Combinazione da tastiera per verificare/consegnare dall'editor. */
export const SubmitShortcut = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`${MOD_KEY} più Invio`}>
    <kbd className="kbd">{MOD_KEY}</kbd>
    <kbd className="kbd">Enter</kbd>
  </span>
);

/**
 * Pagina a tutta altezza su desktop: barra strumenti in alto, poi
 * l'area divisa (editor a sinistra, pannello laterale a destra).
 */
export const WorkspaceShell = ({ toolbar, children }) => (
  <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-4 md:px-6 lg:h-[calc(100dvh-3.5rem)]">
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3">{toolbar}</div>
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">{children}</div>
  </div>
);

/** Colonna laterale destra: su desktop occupa lo spazio residuo accanto all'editor. */
export const SidePane = ({ children, className = '' }) => (
  <div className={`flex min-h-0 min-w-0 flex-col gap-3 lg:flex-1 ${className}`}>{children}</div>
);

/**
 * Riquadro dell'editor dello studente: intestazione con nome file e stato,
 * editor a filo dei bordi. `onSubmit` viene legato a Ctrl/Cmd+Invio.
 */
export const EditorPanel = ({ filename = 'soluzione.cpp', status, onSubmit, onMount, className = '', ...editorProps }) => {
  // Il comando Monaco viene registrato una volta sola: passa da un ref per
  // chiamare sempre l'ultima versione del gestore (niente closure scadute).
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  const handleMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitRef.current?.());
    onMount?.(editor, monaco);
  };

  return (
    <section
      aria-label="Editor della soluzione"
      className={`panel flex h-[65vh] min-h-[22rem] min-w-0 flex-col overflow-hidden lg:h-auto lg:min-h-0 lg:basis-[58%] lg:shrink-0 ${className}`}
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 size={15} className="shrink-0 text-ink-3" aria-hidden="true" />
          <span className="truncate font-mono text-[13px] text-ink">{filename}</span>
          {status}
        </div>
        {onSubmit && <SubmitShortcut className="hidden shrink-0 sm:inline-flex" />}
      </div>
      <div className="min-h-0 flex-1">
        <EditorFrame onMount={handleMount} {...editorProps} />
      </div>
    </section>
  );
};

/** Stato vuoto del pannello Esito: istruzione breve e scorciatoia. */
export const ResultEmpty = ({ children, action }) => (
  <div className="flex h-full min-h-[8rem] flex-col items-start justify-center gap-3 text-sm text-ink-2">
    <p className="max-w-sm leading-relaxed">{children}</p>
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
      Premi <span className="font-medium text-ink-2">{action}</span> oppure <SubmitShortcut />
    </p>
  </div>
);
