import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { concepts } from '../../data/concepts';

/**
 * Glossario dei concetti di base usati dall'algoritmo. Ogni voce si apre
 * da sola (details/summary); su mobile l'intera sezione parte chiusa,
 * come "Come funziona", per non spingere il codice in basso.
 */
const ConceptList = ({ keys }) => {
  const [open, setOpen] = useState(false);
  const items = (keys ?? []).map((key) => ({ key, ...concepts[key] })).filter((item) => item.term);
  if (!items.length) return null;

  return (
    <section aria-labelledby="concepts-title">
      <h2 id="concepts-title" className="eyebrow mb-2 hidden lg:block">
        Concetti di base
      </h2>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="concepts-list"
        className="flex h-10 w-full items-center justify-between gap-3 border-t border-line text-left lg:hidden"
      >
        <span className="eyebrow">
          Concetti di base · <span className="tabular-nums">{items.length} voci</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <ul id="concepts-list" className={`flex-col border-t border-line lg:flex ${open ? 'flex' : 'hidden'}`}>
        {items.map((item) => (
          <li key={item.key} className="border-b border-line">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[13px] text-ink hover:text-accent lg:py-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">{item.term}</span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-ink-3 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-3 text-[13px] leading-relaxed text-ink-2">{item.text}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ConceptList;
