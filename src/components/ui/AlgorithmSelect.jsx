import { ChevronDown } from 'lucide-react';
import { algorithms } from '../../data/algorithms';

/** Menu a tendina con tutti gli algoritmi; `onChange` riceve l'oggetto algoritmo. */
const AlgorithmSelect = ({ id, value, onChange, className = '' }) => (
  <div className={`relative ${className}`}>
    <label htmlFor={id} className="sr-only">
      Algoritmo
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(algorithms.find((a) => a.id === e.target.value))}
      className="field appearance-none pr-9 cursor-pointer font-medium"
    >
      {algorithms.map((algo, i) => (
        <option key={algo.id} value={algo.id}>
          {String(i + 1).padStart(2, '0')} · {algo.name}
        </option>
      ))}
    </select>
    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
  </div>
);

export default AlgorithmSelect;
