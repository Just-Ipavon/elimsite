import { RotateCcw, SlidersHorizontal } from 'lucide-react';

const formatValue = (value, step) => (step < 1 ? Number(value).toFixed(2) : value);

/**
 * Cursori per le soglie di un algoritmo. `onShowCode` riceve la riga del
 * codice C++ in cui compare il parametro, per evidenziarla nell'editor.
 */
const ParamControls = ({ params, values, onChange, onReset, onShowCode }) => {
  if (!params?.length) {
    return (
      <p className="w-full mt-6 text-xs text-dracula-comment text-center">
        Questo algoritmo calcola le soglie da solo: non ci sono parametri da regolare.
      </p>
    );
  }

  return (
    <section className="w-full mt-6 p-4 rounded-lg bg-dracula-bg/60 border border-dracula-current" aria-labelledby="params-title">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 id="params-title" className="text-sm font-bold text-dracula-orange flex items-center gap-2">
          <SlidersHorizontal size={16} aria-hidden="true" /> Soglie e parametri
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-dracula-comment hover:text-dracula-fg flex items-center gap-1"
        >
          <RotateCcw size={12} aria-hidden="true" /> Valori del codice
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {params.map((param) => {
          const id = `param-${param.key}`;
          const changed = values[param.key] !== param.default;
          return (
            <div key={param.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <label htmlFor={id} className="text-dracula-fg">
                  {param.label}
                </label>
                <span className={`font-mono ${changed ? 'text-dracula-orange' : 'text-dracula-green'}`}>
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
                className="w-full accent-dracula-orange"
              />
              <button
                type="button"
                onClick={() => onShowCode(param.code)}
                className="block w-full text-left font-mono text-[11px] text-dracula-comment hover:text-dracula-cyan truncate"
                title="Mostra nel codice"
              >
                {param.code.trim()}
              </button>
              {param.note && <p className="mt-1 text-[11px] text-dracula-yellow/80">{param.note}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ParamControls;
