import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ExplanationPanel from './ExplanationPanel';

/**
 * Pannello in basso (solo mobile) con la spiegazione del blocco attivo:
 * il codice resta visibile sopra, invece di dover scorrere fino alla sezione.
 */
const ExplanationSheet = ({ explanations, active, activeIndex, onSelect, onClose }) => {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="explanation-sheet-title"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[60dvh] flex-col border-t border-line bg-surface shadow-[0_-4px_16px_rgb(0_0_0/0.08)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line pl-4 pr-1">
        <h2
          id="explanation-sheet-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-[13px] font-medium text-ink outline-none"
        >
          Spiegazione
        </h2>
        <button type="button" onClick={onClose} className="btn btn-ghost h-10 w-10 px-0" aria-label="Chiudi la spiegazione">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <ExplanationPanel
          explanations={explanations}
          active={active}
          activeIndex={activeIndex}
          onSelect={onSelect}
          onClear={onClose}
          showBack={false}
        />
      </div>
    </div>
  );
};

export default ExplanationSheet;
