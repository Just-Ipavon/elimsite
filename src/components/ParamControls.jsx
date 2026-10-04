import { RotateCcw } from 'lucide-react';

const formatValue = (value, step) => (step < 1 ? Number(value).toFixed(2) : value);

/**
 * Cursori per le soglie di un algoritmo. `onShowCode` riceve la riga del
 * codice C++ in cui compare il parametro, per evidenziarla nell'editor.
 */
const ParamControls = ({ params, values, onChange, onReset, onShowCode }) => {
  if (!params?.length) {
    return (
      <p className="text-xs text-ink-3 leading-relaxed">
        Questo algoritmo calcola le soglie da solo: non ci sono parametri da regolare.
      </p>
    );
  }

  const anyChanged = params.some((param) => values[param.key] !== param.default);

  return (
    <section aria-labelledby="params-title">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 id="params-title" className="eyebrow">
          Parametri
        </h3>
        <button
          type="button"
          onClick={onReset}
          disabled={!anyChanged}
          className="btn btn-ghost btn-sm h-7 px-2 text-xs"
          title="Ripristina i valori del codice C++"
        >
          <RotateCcw size={12} aria-hidden="true" /> Ripristina
        </button>
      </div>

      <div className="flex flex-col divide-y divide-line">
        {params.map((param) => {
          const id = `param-${param.key}`;
          const changed = values[param.key] !== param.default;
          return (
            <div key={param.key} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-[13px] text-ink-2 min-w-0 truncate">
                  {param.label}
                </label>
                <span
                  className={`font-mono text-xs tabular-nums shrink-0 ${changed ? 'text-accent font-medium' : 'text-ink'}`}
                >
                  {formatValue(values[param.key], param.step)}
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={values[param.key]}
                onChange={(e) => onChange(param.key, Number(e.target.value))}
                className="range mt-1"
              />
              <button
                type="button"
                onClick={() => onShowCode(param.code)}
                className="block max-w-full truncate rounded-sm text-left font-mono text-2xs text-ink-3 hover:text-accent transition-colors"
                title="Mostra nel codice"
                aria-label={`Mostra nel codice: ${param.code.trim()}`}
              >
                {param.code.trim()}
              </button>
              {param.note && <p className="mt-1 text-2xs leading-4 text-ink-3">{param.note}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ParamControls;
