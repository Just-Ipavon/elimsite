import { useRef, useState } from 'react';
import { Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import { verifySolution } from '../lib/verify';
import { applyDiagnostics, diagnoseCode } from '../lib/diagnostics';
import VerificationResult from '../components/VerificationResult';
import AlgorithmSelect from '../components/ui/AlgorithmSelect';
import EditorFrame from '../components/ui/EditorFrame';
import { EditorPanel, ResultEmpty, SidePane, WorkspaceShell } from '../components/workspace/Workspace';

const TABS = [
  { id: 'result', label: 'Esito' },
  { id: 'reference', label: 'Riferimento' },
];

const IdeArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [code, setCode] = useState(algorithms[0].cppSkeleton);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showReference, setShowReference] = useState(true);
  const [diagnostics, setDiagnostics] = useState([]);
  // All'inizio il riferimento è più utile dell'esito vuoto
  const [tab, setTab] = useState('reference');
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

  const handleAlgoChange = (algo) => {
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
    setTab('result');
  };

  const toolbar = (
    <>
      <h1 className="mr-auto font-display text-xl tracking-tight text-ink">IDE di pratica</h1>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <AlgorithmSelect id="ide-algo" value={selectedAlgo.id} onChange={handleAlgoChange} className="min-w-0 flex-1 sm:w-72 sm:flex-none" />
        <button type="button" onClick={resetCode} className="btn btn-secondary" title="Ripristina lo scheletro iniziale">
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
        <button type="button" onClick={verifyCode} className="btn btn-primary">
          <Play size={15} aria-hidden="true" />
          Verifica
        </button>
      </div>
    </>
  );

  return (
    <WorkspaceShell toolbar={toolbar}>
      <EditorPanel
        value={code}
        onChange={(value) => setCode(value ?? '')}
        onSubmit={verifyCode}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
        }}
      />

      <SidePane>
        <section className="panel flex min-h-[26rem] flex-1 flex-col overflow-hidden lg:min-h-0">
          <div className="flex h-11 shrink-0 items-stretch justify-between gap-3 border-b border-line pl-2 pr-3">
            <div role="tablist" aria-label="Pannello laterale" className="flex items-stretch">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`ide-tab-${t.id}`}
                    aria-selected={active}
                    aria-controls={`ide-panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={`relative -mb-px flex items-center border-b-2 px-2.5 text-[13px] font-medium transition-colors ${
                      active ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'
                    }`}
                  >
                    {t.label}
                    {t.id === 'result' && verificationResult && !active && (
                      <>
                        <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                        <span className="sr-only"> (disponibile)</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {tab === 'reference' && (
              <button
                type="button"
                onClick={() => setShowReference((v) => !v)}
                aria-expanded={showReference}
                aria-controls="ide-panel-reference"
                className="btn btn-ghost btn-sm self-center"
              >
                {showReference ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                {showReference ? 'Nascondi' : 'Mostra'}
              </button>
            )}
          </div>

          {tab === 'result' ? (
            <div
              role="tabpanel"
              id="ide-panel-result"
              aria-labelledby="ide-tab-result"
              className="min-h-0 flex-1 overflow-y-auto p-4"
            >
              {verificationResult ? (
                <VerificationResult
                  result={verificationResult}
                  successTitle="Verifica superata"
                  failureTitle="Verifica non superata"
                  diagnostics={diagnostics}
                  onSelectLine={goToLine}
                  showMissingLines
                />
              ) : (
                <ResultEmpty action="Verifica">
                  Scegli un algoritmo, completa lo scheletro nell'editor e verifica: qui vedrai errori, avvisi e
                  quanto il codice corrisponde al riferimento.
                </ResultEmpty>
              )}
            </div>
          ) : (
            <div
              role="tabpanel"
              id="ide-panel-reference"
              aria-labelledby="ide-tab-reference"
              className="flex min-h-0 flex-1 flex-col"
            >
              {showReference ? (
                <>
                  <p className="flex h-8 shrink-0 items-center border-b border-line bg-sunken/60 px-4 font-mono text-2xs text-ink-3">
                    riferimento · {selectedAlgo.name} · sola lettura
                  </p>
                  <div className="min-h-[20rem] flex-1 lg:min-h-0">
                    <EditorFrame
                      value={selectedAlgo.codeReference}
                      options={{ readOnly: true, fontSize: 13, lineHeight: 20, domReadOnly: true }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center p-4">
                  <p className="max-w-sm text-sm leading-relaxed text-ink-2">
                    Codice nascosto: prova a scriverlo da solo e premi <span className="font-medium text-ink">Mostra</span>{' '}
                    quando vuoi controllare.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </SidePane>
    </WorkspaceShell>
  );
};

export default IdeArea;
