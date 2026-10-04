import { useEffect, useRef, useState } from 'react';
import { Clock, Play, Send, Shuffle } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';
import { clearCanvas, runVisualAlgorithm, useOpenCv } from '../lib/opencv';
import { verifySolution } from '../lib/verify';
import { applyDiagnostics, diagnoseCode } from '../lib/diagnostics';
import VerificationResult from '../components/VerificationResult';
import Callout from '../components/ui/Callout';
import Panel from '../components/ui/Panel';
import { EditorPanel, ResultEmpty, SidePane, WorkspaceShell } from '../components/workspace/Workspace';

const EXAM_DURATION_S = 90 * 60;
const WARNING_THRESHOLD_S = 5 * 60;

const pickRandomAlgo = (excludeId) => {
  const pool = algorithms.length > 1 ? algorithms.filter((a) => a.id !== excludeId) : algorithms;
  return pool[Math.floor(Math.random() * pool.length)];
};

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

const ExamArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(() => pickRandomAlgo());
  const [code, setCode] = useState(() => selectedAlgo.cppSkeleton);
  const [verificationResult, setVerificationResult] = useState(null);
  const [deadline, setDeadline] = useState(() => Date.now() + EXAM_DURATION_S * 1000);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_S);
  const [processing, setProcessing] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);
  const cvStatus = useOpenCv();

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [diagnostics, setDiagnostics] = useState([]);

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

  // Il tempo residuo è calcolato dalla scadenza assoluta, così non "deriva"
  // se il tab resta in background e i timer vengono rallentati.
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const timeUp = timeLeft === 0;
  const lowTime = !timeUp && timeLeft < WARNING_THRESHOLD_S;

  const newExam = () => {
    // Evita di buttare via per sbaglio una soluzione in corso
    const dirty = !timeUp && code !== selectedAlgo.cppSkeleton;
    if (dirty && !window.confirm('Iniziare un nuovo esame? Il codice scritto finora andrà perso.')) return;
    const algo = pickRandomAlgo(selectedAlgo.id);
    setSelectedAlgo(algo);
    setCode(algo.cppSkeleton);
    setVerificationResult(null);
    setProblems([]);
    setDeadline(Date.now() + EXAM_DURATION_S * 1000);
    setTimeLeft(EXAM_DURATION_S);
    clearCanvas(canvasRef.current);
    setHasOutput(false);
  };

  // In esame gli errori vengono evidenziati senza mostrare le righe del riferimento.
  const verifyCode = () => {
    setVerificationResult(verifySolution(code, selectedAlgo.codeReference));
    setProblems(diagnoseCode(code, selectedAlgo.codeReference, { revealReference: false }));
  };

  const submitFromEditor = () => {
    if (!timeUp) verifyCode();
  };

  const runVisualizer = () => {
    if (cvStatus !== 'ready' || !imgRef.current || !canvasRef.current) return;
    setProcessing(true);
    setTimeout(() => {
      try {
        runVisualAlgorithm(selectedAlgo.id, imgRef.current, canvasRef.current);
        setHasOutput(true);
      } catch (err) {
        console.error('OpenCV execution error:', err);
      } finally {
        setProcessing(false);
      }
    }, 50);
  };

  const timerTone = timeUp
    ? 'border-err/40 bg-err/5 text-err'
    : lowTime
      ? 'border-warn/40 bg-warn/5 text-warn'
      : 'border-line-strong bg-surface text-ink';

  const runLabel = processing ? 'Elaborazione…' : cvStatus === 'loading' ? 'Caricamento OpenCV…' : 'Mostra risultato atteso';

  const toolbar = (
    <>
      <div className="mr-auto flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl tracking-tight text-ink">Esame</h1>
        <p className="min-w-0 text-sm text-ink-2">
          Traccia: <span className="font-medium text-ink">{selectedAlgo.name}</span>
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <span
          role="timer"
          aria-label={`Tempo rimanente ${formatTime(timeLeft)}`}
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-sm tabular-nums ${timerTone}`}
        >
          <Clock size={14} aria-hidden="true" />
          {formatTime(timeLeft)}
        </span>
        <button type="button" onClick={newExam} className="btn btn-secondary ml-auto sm:ml-0" title="Nuovo esame">
          <Shuffle size={15} aria-hidden="true" />
          <span className="max-[400px]:sr-only">Nuovo esame</span>
        </button>
        <button type="button" onClick={verifyCode} disabled={timeUp} className="btn btn-primary">
          <Send size={15} aria-hidden="true" />
          Consegna
        </button>
      </div>
    </>
  );

  return (
    <WorkspaceShell toolbar={toolbar}>
      <EditorPanel
        value={code}
        onChange={(value) => setCode(value ?? '')}
        onSubmit={submitFromEditor}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
        }}
        options={{ readOnly: timeUp }}
        status={
          timeUp ? (
            <span className="shrink-0 rounded border border-err/30 bg-err/5 px-1.5 font-mono text-2xs text-err">
              sola lettura
            </span>
          ) : (
            lowTime && (
              <span className="shrink-0 rounded border border-warn/30 bg-warn/5 px-1.5 font-mono text-2xs text-warn">
                ultimi minuti
              </span>
            )
          )
        }
      />

      <SidePane>
        <Panel title="Esito" className="min-h-[14rem] flex-1 lg:min-h-[10rem]" bodyClassName="flex-1 overflow-y-auto p-4">
          {timeUp && !verificationResult && (
            <Callout tone="err" role="alert" title="Tempo scaduto">
              Non hai consegnato in tempo. Avvia un nuovo esame per riprovare.
            </Callout>
          )}

          {verificationResult ? (
            <VerificationResult
              result={verificationResult}
              successTitle="Esame superato"
              failureTitle="Verifica non superata"
              diagnostics={diagnostics}
              onSelectLine={goToLine}
            />
          ) : (
            !timeUp && (
              <ResultEmpty action="Consegna">
                Scrivi la tua implementazione dell'algoritmo estratto, senza codice di riferimento. Gli errori
                verranno evidenziati nell'editor.
              </ResultEmpty>
            )
          )}
        </Panel>

        <Panel
          title="Obiettivo visivo"
          className="shrink-0"
          actions={
            <button
              type="button"
              onClick={runVisualizer}
              disabled={cvStatus !== 'ready' || processing}
              className="btn btn-secondary btn-sm"
            >
              <Play size={13} aria-hidden="true" />
              <span className="hidden sm:inline">{runLabel}</span>
              <span className="sm:hidden">{processing || cvStatus === 'loading' ? '…' : 'Esegui'}</span>
            </button>
          }
        >
          <div className="grid max-w-[22rem] grid-cols-2 gap-3">
            <figure className="min-w-0">
              <figcaption className="eyebrow mb-1.5">Sorgente</figcaption>
              <div className="overflow-hidden rounded-md border border-line bg-sunken">
                <img ref={imgRef} src={lenaSrc} alt="Immagine sorgente: Lena" className="block aspect-square w-full object-cover" />
              </div>
            </figure>
            <figure className="min-w-0">
              <figcaption className="eyebrow mb-1.5">Output atteso</figcaption>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-line bg-sunken">
                {!hasOutput && (
                  <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-mono text-2xs text-ink-3">
                    non ancora eseguito
                  </span>
                )}
                <canvas ref={canvasRef} className="relative block h-auto w-full" />
              </div>
            </figure>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${cvStatus === 'error' ? 'text-err' : 'text-ink-3'}`}>
            {cvStatus === 'error'
              ? 'Impossibile caricare OpenCV.js: controlla la connessione e ricarica la pagina.'
              : "Il risultato atteso su Lena ti dà un'indicazione sull'algoritmo da implementare."}
          </p>
        </Panel>
      </SidePane>
    </WorkspaceShell>
  );
};

export default ExamArea;
