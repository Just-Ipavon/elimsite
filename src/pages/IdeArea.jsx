import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import { DRACULA_THEME, baseEditorOptions, defineDraculaTheme } from '../lib/monacoTheme';
import { functionSignatures, verifySolution } from '../lib/verify';
import VerificationResult from '../components/VerificationResult';

const IdeArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [code, setCode] = useState(algorithms[0].cppSkeleton);
  const [verificationResult, setVerificationResult] = useState(null);

  const signatures = useMemo(() => functionSignatures(selectedAlgo.codeReference), [selectedAlgo]);

  const handleAlgoChange = (e) => {
    const algo = algorithms.find((a) => a.id === e.target.value);
    setSelectedAlgo(algo);
    setCode(algo.cppSkeleton);
    setVerificationResult(null);
  };

  const resetCode = () => {
    setCode(selectedAlgo.cppSkeleton);
    setVerificationResult(null);
  };

  const verifyCode = () => setVerificationResult(verifySolution(code, selectedAlgo.codeReference));

  return (
    <div className="lg:h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-pink">IDE di Pratica</h1>
          <p className="text-sm text-dracula-comment">
            Scrivi il tuo algoritmo in C++ e confrontalo con l'implementazione di riferimento.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <label htmlFor="ide-algo" className="sr-only">
            Algoritmo
          </label>
          <select
            id="ide-algo"
            className="bg-dracula-current text-dracula-fg border border-dracula-comment rounded px-4 py-2 focus:outline-none focus:border-dracula-pink"
            value={selectedAlgo.id}
            onChange={handleAlgoChange}
          >
            {algorithms.map((algo) => (
              <option key={algo.id} value={algo.id}>
                {algo.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetCode}
            className="flex items-center space-x-2 border border-dracula-comment text-dracula-fg px-4 py-2 rounded hover:border-dracula-pink hover:text-dracula-pink transition-colors"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={verifyCode}
            className="flex items-center space-x-2 bg-dracula-purple text-dracula-bg px-4 py-2 rounded font-bold hover:bg-dracula-pink transition-colors"
          >
            <Play size={16} aria-hidden="true" />
            <span>Verifica</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="w-full lg:w-2/3 h-[60vh] lg:h-full border rounded-lg overflow-hidden border-dracula-comment">
          <Editor
            height="100%"
            language="cpp"
            value={code}
            onChange={(value) => setCode(value ?? '')}
            beforeMount={defineDraculaTheme}
            theme={DRACULA_THEME}
            options={{ ...baseEditorOptions, padding: { top: 16 } }}
          />
        </div>

        <div className="w-full lg:w-1/3 lg:h-full glass rounded-lg p-4 flex flex-col overflow-y-auto">
          <h2 className="text-lg font-bold text-dracula-cyan mb-2 border-b border-dracula-comment pb-2">Output</h2>

          {verificationResult ? (
            <VerificationResult
              result={verificationResult}
              successTitle="Verifica superata"
              failureTitle="Verifica non superata"
            />
          ) : (
            <p className="text-dracula-comment text-sm mt-4">
              In attesa... Scegli un algoritmo, scrivi il codice e premi Verifica.
            </p>
          )}

          <div className="mt-auto pt-6">
            <h3 className="text-sm font-bold text-dracula-orange mb-1">Funzioni da implementare:</h3>
            <pre className="text-xs text-dracula-fg overflow-x-auto bg-dracula-bg p-2 rounded border border-dracula-current">
              {signatures.join('\n')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeArea;
