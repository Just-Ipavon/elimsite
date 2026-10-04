import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import { DRACULA_THEME, baseEditorOptions, defineDraculaTheme } from '../lib/monacoTheme';
import { verifySolution } from '../lib/verify';
import { applyDiagnostics, diagnoseCode } from '../lib/diagnostics';
import VerificationResult from '../components/VerificationResult';

const IdeArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [code, setCode] = useState(algorithms[0].cppSkeleton);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showReference, setShowReference] = useState(true);
  const [diagnostics, setDiagnostics] = useState([]);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const setProblems = (list) => {
    setDiagnostics(list);
    applyDiagnostics(monacoRef.current, editorRef.current, list);
  };

  const goToLine = (line, column = 1) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column });
    editor.focus();
  };

  const handleAlgoChange = (e) => {
    const algo = algorithms.find((a) => a.id === e.target.value);
    setSelectedAlgo(algo);
    setCode(algo.cppSkeleton);
    setVerificationResult(null);
    setProblems([]);
  };

  const resetCode = () => {
    setCode(selectedAlgo.cppSkeleton);
    setVerificationResult(null);
    setProblems([]);
  };

  const verifyCode = () => {
    setVerificationResult(verifySolution(code, selectedAlgo.codeReference));
    setProblems(diagnoseCode(code, selectedAlgo.codeReference, { revealReference: true }));
  };

  return (
    <div className="lg:h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-pink">IDE di Pratica</h1>
          <p className="text-sm text-dracula-comment">
            Scrivi il tuo algoritmo in C++ con il codice di riferimento a fianco, poi verificalo.
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
        {/* Colonna sinistra: il codice dello studente */}
        <div className="w-full lg:w-1/2 h-[60vh] lg:h-full border rounded-lg overflow-hidden border-dracula-comment">
          <Editor
            height="100%"
            language="cpp"
            value={code}
            onChange={(value) => setCode(value ?? '')}
            beforeMount={defineDraculaTheme}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
            }}
            theme={DRACULA_THEME}
            options={{ ...baseEditorOptions, padding: { top: 16 } }}
          />
        </div>

        {/* Colonna destra: esito della verifica e codice di riferimento */}
        <div className="w-full lg:w-1/2 lg:h-full flex flex-col gap-4 min-h-0">
          <div className="glass rounded-lg p-4 shrink-0 max-h-[40%] overflow-y-auto">
            <h2 className="text-lg font-bold text-dracula-cyan mb-2 border-b border-dracula-comment pb-2">Output</h2>
            {verificationResult ? (
              <VerificationResult
                result={verificationResult}
                successTitle="Verifica superata"
                failureTitle="Verifica non superata"
                diagnostics={diagnostics}
                onSelectLine={goToLine}
              />
            ) : (
              <p className="text-dracula-comment text-sm">
                In attesa... Scegli un algoritmo, scrivi il codice e premi Verifica.
              </p>
            )}
          </div>

          <div className="glass rounded-lg p-4 flex flex-col flex-grow min-h-0">
            <div className="flex items-center justify-between gap-2 mb-2 border-b border-dracula-comment pb-2">
              <h2 className="text-lg font-bold text-dracula-yellow">Codice di riferimento</h2>
              <button
                type="button"
                onClick={() => setShowReference((v) => !v)}
                aria-expanded={showReference}
                className="text-xs flex items-center gap-1 text-dracula-comment hover:text-dracula-fg"
              >
                {showReference ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                {showReference ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            {showReference ? (
              <div className="h-[60vh] lg:h-auto lg:flex-grow min-h-0 rounded overflow-hidden border border-dracula-current">
                <Editor
                  height="100%"
                  language="cpp"
                  value={selectedAlgo.codeReference}
                  beforeMount={defineDraculaTheme}
                  theme={DRACULA_THEME}
                  options={{ ...baseEditorOptions, readOnly: true, fontSize: 13, padding: { top: 12 } }}
                />
              </div>
            ) : (
              <p className="text-sm text-dracula-comment">
                Codice nascosto: prova a scriverlo da solo e premi Mostra quando vuoi controllare.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeArea;
