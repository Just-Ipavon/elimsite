import { useRef, useState } from 'react';
import { Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import { verifySolution } from '../lib/verify';
import { applyDiagnostics, diagnoseCode } from '../lib/diagnostics';
import VerificationResult from '../components/VerificationResult';
import AlgorithmSelect from '../components/ui/AlgorithmSelect';
import EditorFrame from '../components/ui/EditorFrame';
import { EditorPanel, ResultEmpty, SidePane, WorkspaceShell } from '../components/workspace/Workspace';
import { scrollIntoViewOnMobile, useEditorOptions } from '../lib/useIsDesktop';

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
  const sideRef = useRef(null);
  const referenceOptions = useEditorOptions({ readOnly: true, fontSize: 13, lineHeight: 20, domReadOnly: true });

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
    // Su mobile l'esito sta sotto l'editor: lo porta in vista
    scrollIntoViewOnMobile(sideRef.current);
  };

  const toolbar = (
    <>
      <h1 className="mr-auto font-display text-xl tracking-tight text-ink">IDE di pratica</h1>
      <div className="flex w-full items-center gap-2 lg:w-auto">
        <AlgorithmSelect id="ide-algo" value={selectedAlgo.id} onChange={handleAlgoChange} className="min-w-0 flex-1 lg:w-72 lg:flex-none" />
        {/* Sotto lg le azioni stanno nella barra fissa in basso */}
        <button type="button" onClick={resetCode} className="btn btn-secondary hidden lg:inline-flex" title="Ripristina lo scheletro iniziale">
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
        <button type="button" onClick={verifyCode} className="btn btn-primary hidden lg:inline-flex">
          <Play size={15} aria-hidden="true" />
          Verifica
        </button>
      </div>
    </>
  );

  const actionBar = (
    <>
      <button
        type="button"
        onClick={resetCode}
        className="btn btn-secondary h-10 w-10 shrink-0 px-0"
        aria-label="Ripristina lo scheletro iniziale"
        title="Ripristina lo scheletro iniziale"
      >
        <RotateCcw size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={verifyCode} className="btn btn-primary h-10 flex-1">
        <Play size={15} aria-hidden="true" />
        Verifica
      </button>
    </>
  );

  return (
    <WorkspaceShell toolbar={toolbar} actionBar={actionBar}>
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
        <section ref={sideRef} className="panel flex scroll-mt-[4.25rem] flex-1 flex-col overflow-hidden lg:min-h-0">
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
                  <p className="h-8 shrink-0 truncate border-b border-line bg-sunken/60 px-4 font-mono text-2xs leading-8 text-ink-3">
                    riferimento · {selectedAlgo.name} · sola lettura
                  </p>
                  {/* Su mobile il pannello non ha altezza flex: serve un'altezza esplicita */}
                  <div className="h-[55dvh] min-h-[340px] lg:h-auto lg:min-h-0 lg:flex-1">
                    <EditorFrame value={selectedAlgo.codeReference} options={referenceOptions} />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-start p-4">
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
