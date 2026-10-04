import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const lineLabel = (exp) => (exp.startLine === exp.endLine ? `r. ${exp.startLine}` : `r. ${exp.startLine}–${exp.endLine}`);

/**
 * Spiegazione del blocco di codice attivo. Senza blocco attivo mostra
 * l'elenco dei blocchi commentati: cliccandone uno lo si apre nell'editor.
 */
const ExplanationPanel = ({ explanations, active, activeIndex, onSelect, onClear, showBack = true }) => {
  if (!explanations.length) {
    return <p className="text-sm text-ink-3">Per questo algoritmo non ci sono blocchi commentati.</p>;
  }

  if (!active) {
    return (
      <div>
        <p className="text-sm text-ink-2 leading-relaxed">
          Clicca una zona evidenziata nel codice, oppure scegli un blocco qui sotto.
        </p>
        <ol className="mt-3 flex flex-col">
          {explanations.map((exp, i) => (
            <li key={`${exp.startLine}-${exp.title}`}>
              <button
                type="button"
                onClick={() => onSelect(exp)}
                className="group flex w-full items-baseline gap-3 rounded-md px-2 py-2.5 -mx-2 lg:py-2 text-left hover:bg-sunken transition-colors"
              >
                <span className="font-mono text-2xs tabular-nums text-ink-3 w-5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0 text-sm text-ink group-hover:text-accent">{exp.title}</span>
                <span className="font-mono text-2xs tabular-nums text-ink-3 shrink-0">{lineLabel(exp)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const prev = explanations[activeIndex - 1];
  const next = explanations[activeIndex + 1];

  return (
    <article aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        {showBack ? (
          <button type="button" onClick={onClear} className="btn btn-ghost btn-sm h-10 -ml-2 px-2 text-xs lg:h-7">
            <ArrowLeft size={12} aria-hidden="true" /> Tutti i blocchi
          </button>
        ) : (
          <span className="eyebrow">Blocco commentato</span>
        )}
        <div className="flex items-center gap-1">
          <span className="font-mono text-2xs tabular-nums text-ink-3 mr-1">
            {activeIndex + 1}/{explanations.length}
          </span>
          <button
            type="button"
            onClick={() => onSelect(prev)}
            disabled={!prev}
            className="btn btn-ghost btn-sm h-10 w-10 px-0 lg:h-7 lg:w-7"
            aria-label="Blocco precedente"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(next)}
            disabled={!next}
            className="btn btn-ghost btn-sm h-10 w-10 px-0 lg:h-7 lg:w-7"
            aria-label="Blocco successivo"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="eyebrow mt-3">{lineLabel(active)}</p>
      <h3 className="mt-1 text-base font-medium text-ink leading-snug">{active.title}</h3>
      <p className="mt-2 text-sm text-ink-2 leading-relaxed">{active.text}</p>

      {active.points?.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-2 leading-relaxed">
          {active.points.map((point) => (
            <li key={point} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-ink-3">
              {point}
            </li>
          ))}
        </ul>
      )}

      {active.note && (
        <div className="mt-4 rounded-md border border-line bg-sunken/60 px-3 py-2.5 text-[13px] text-ink-2 leading-relaxed">
          <span className="eyebrow mr-1.5">Nota</span>
          {active.note}
        </div>
      )}
    </article>
  );
};

export default ExplanationPanel;
