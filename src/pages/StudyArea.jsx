import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Play } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';
import { clearCanvas, defaultParams, runVisualAlgorithm, useOpenCv } from '../lib/opencv';
import { baseEditorOptions } from '../lib/monacoTheme';
import AlgorithmSelect from '../components/ui/AlgorithmSelect';
import Callout from '../components/ui/Callout';
import EditorFrame from '../components/ui/EditorFrame';
import Panel from '../components/ui/Panel';
import ParamControls from '../components/ParamControls';
import ExplanationPanel from '../components/study/ExplanationPanel';
import ExplanationSheet from '../components/study/ExplanationSheet';
import { useIsDesktop } from '../lib/useIsDesktop';

// Converte startMatch/endMatch delle spiegazioni in intervalli di righe del codice.
const parseExplanations = (algo) => {
  const code = algo.codeReference;
  const lineOf = (index) => code.slice(0, index).split('\n').length;

  return (algo.explanations ?? [])
    .map((exp) => {
      const startIndex = code.indexOf(exp.startMatch);
      if (startIndex === -1) return null;
      const endIndex = exp.endMatch ? code.indexOf(exp.endMatch, startIndex) : startIndex;
      const endLine = endIndex === -1
        ? lineOf(startIndex)
        : lineOf(endIndex) + (exp.endMatch ? exp.endMatch.split('\n').length - 1 : 0);
      return { ...exp, startLine: lineOf(startIndex), endLine };
    })
    .filter(Boolean);
};

// Il click nell'editor e l'elenco producono oggetti diversi per lo stesso blocco.
const sameBlock = (a, b) => Boolean(a && b && a.startLine === b.startLine && a.title === b.title);

const engineLabel = { loading: 'Caricamento OpenCV…', ready: 'Esegui', error: 'OpenCV non disponibile' };

const editorOptions = { readOnly: true, wordWrap: 'on', domReadOnly: true };

// Su telefono il C++ andrebbe a capo quasi a ogni riga: meglio scorrere in
// orizzontale dentro l'editor, con carattere e margini più compatti. La
// rotella/il trascinamento non resta intrappolato nell'editor.
const mobileEditorOptions = {
  ...editorOptions,
  wordWrap: 'off',
  fontSize: 12,
  lineHeight: 18,
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 6,
  folding: false,
  glyphMargin: false,
  stickyScroll: { enabled: false },
  padding: { top: 10, bottom: 10 },
  scrollbar: { ...baseEditorOptions.scrollbar, alwaysConsumeMouseWheel: false },
};

const tabs = [
  { id: 'explanation', label: 'Spiegazione' },
  { id: 'viewer', label: 'Visualizzatore' },
];

/** Intestazione di sezione visibile solo su mobile (su desktop ci sono le schede). */
const MobileHeading = ({ id, children }) => (
  <div className="flex items-center h-11 px-4 border-b border-line lg:hidden">
    <h2 id={id} className="text-[13px] font-medium text-ink">
      {children}
    </h2>
  </div>
);

const StudyArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [processing, setProcessing] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState(null);
  const [runError, setRunError] = useState(null);
  const [params, setParams] = useState(() => defaultParams(algorithms[0]));
  const [hasOutput, setHasOutput] = useState(false);
  const [tab, setTab] = useState('explanation');
  const [stepsOpen, setStepsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cvStatus = useOpenCv();
  const isDesktop = useIsDesktop();
  // Letto dentro gli handler di Monaco, registrati una sola volta al mount.
  const isDesktopRef = useRef(isDesktop);
  isDesktopRef.current = isDesktop;

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const activeDecorationRef = useRef(null);
  const explanationsRef = useRef([]);
  const editorPanelRef = useRef(null);

  const explanations = useMemo(() => parseExplanations(selectedAlgo), [selectedAlgo]);
  const activeIndex = explanations.findIndex((exp) => sameBlock(exp, activeExplanation));
  const algoIndex = algorithms.findIndex((a) => a.id === selectedAlgo.id);

  const applyDecorations = (algo) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    explanationsRef.current = parseExplanations(algo);
    decorationsRef.current?.clear();
    decorationsRef.current = editor.createDecorationsCollection(
      explanationsRef.current.map((exp) => ({
        range: new monaco.Range(exp.startLine, 1, exp.endLine, 1),
        options: { isWholeLine: true, className: 'explanation-highlight' },
      })),
    );
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const openBlockAt = (line) => {
      const clicked = explanationsRef.current.find((exp) => line >= exp.startLine && line <= exp.endLine);
      setActiveExplanation(clicked ?? null);
      // La spiegazione appare subito accanto al codice (su mobile nel pannello in basso).
      if (clicked) setTab('explanation');
      if (!isDesktopRef.current) {
        setSheetOpen(Boolean(clicked));
        // Il pannello copre la metà bassa: il blocco va portato in cima all'editor.
        if (clicked) {
          bringEditorIntoView();
          editor.revealLineNearTop(clicked.startLine);
        }
      }
    };

    editor.onMouseDown((e) => {
      const line = e.target.position?.lineNumber;
      if (line) openBlockAt(line);
    });

    // Con il tocco Monaco non emette onMouseDown: sposta solo il cursore (sorgente 'mouse').
    editor.onDidChangeCursorPosition((e) => {
      if (isDesktopRef.current || e.source !== 'mouse') return;
      openBlockAt(e.position.lineNumber);
    });

    applyDecorations(selectedAlgo);
  };

  // Se l'output è già visibile, lo ricalcola quando si muove un cursore.
  const rerunTimer = useRef(null);
  const updateParams = (next) => {
    setParams(next);
    if (!hasOutput) return;
    clearTimeout(rerunTimer.current);
    rerunTimer.current = setTimeout(() => runAlgorithm(next), 150);
  };

  // Le decorazioni vanno ricalcolate dopo che l'editor ha caricato il nuovo codice.
  useEffect(() => {
    applyDecorations(selectedAlgo);
  }, [selectedAlgo]);

  // Evidenziazione più marcata per il blocco di cui si sta leggendo la spiegazione.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    activeDecorationRef.current?.clear();
    if (!editor || !monaco || !activeExplanation) return;
    activeDecorationRef.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(activeExplanation.startLine, 1, activeExplanation.endLine, 1),
        options: { isWholeLine: true, className: 'explanation-active' },
      },
    ]);
  }, [activeExplanation, selectedAlgo]);

  const handleAlgoChange = (algo) => {
    setSelectedAlgo(algo);
    setParams(defaultParams(algo));
    setHasOutput(false);
    setActiveExplanation(null);
    setSheetOpen(false);
    setRunError(null);
    clearCanvas(canvasRef.current);
  };

  // Su mobile l'editor può essere fuori schermo: lo riporta in vista prima di mostrare la riga.
  // In alto (sotto la barra) e non al centro, perché la metà bassa la occupa il pannello.
  function bringEditorIntoView() {
    if (isDesktopRef.current) return;
    editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Dall'elenco: porta il blocco nell'editor e lo rende attivo (su mobile apre il pannello in basso).
  const selectExplanation = (exp) => {
    setActiveExplanation(exp);
    if (isDesktopRef.current) {
      editorRef.current?.revealLineInCenter(exp.startLine);
      return;
    }
    bringEditorIntoView();
    editorRef.current?.revealLineNearTop(exp.startLine);
    setSheetOpen(true);
  };

  // Nel pannello in basso il codice è già in vista: basta spostare l'editor.
  const selectFromSheet = (exp) => {
    setActiveExplanation(exp);
    editorRef.current?.revealLineNearTop(exp.startLine);
  };

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // Evidenzia nell'editor la riga del codice C++ che contiene il parametro.
  const showInCode = (snippet) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const index = selectedAlgo.codeReference.indexOf(snippet);
    if (!editor || !monaco || index === -1) return;
    const line = selectedAlgo.codeReference.slice(0, index).split('\n').length;
    bringEditorIntoView();
    editor.revealLineInCenter(line);
    editor.setSelection(new monaco.Range(line, 1, line, editor.getModel().getLineMaxColumn(line)));
  };

  const runAlgorithm = (values = params) => {
    if (cvStatus !== 'ready' || !imgRef.current || !canvasRef.current) return;
    setProcessing(true);
    setRunError(null);

    // Lascia al browser il tempo di mostrare lo stato "in esecuzione".
    setTimeout(() => {
      try {
        runVisualAlgorithm(selectedAlgo.id, imgRef.current, canvasRef.current, values);
        setHasOutput(true);
      } catch (err) {
        console.error('OpenCV execution error:', err);
        setRunError(`Errore durante l'esecuzione di OpenCV.js: ${err?.message ?? err}`);
      } finally {
        setProcessing(false);
      }
    }, 50);
  };

  const hiddenOnDesktop = (id) => (tab === id ? '' : 'lg:hidden');

  return (
    <div className="grid w-full gap-4 px-4 py-4 md:px-6 lg:h-[calc(100dvh-3.5rem)] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[clamp(240px,18vw,380px)_minmax(0,1fr)_clamp(340px,27vw,600px)]">
      {/* Sinistra: scelta dell'algoritmo e teoria */}
      <aside className="flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <div>
          <p className="eyebrow mb-2">
            Studio · <span className="tabular-nums">{String(algoIndex + 1).padStart(2, '0')}/{String(algorithms.length).padStart(2, '0')}</span>
          </p>
          <AlgorithmSelect id="study-algo" value={selectedAlgo.id} onChange={handleAlgoChange} />
        </div>

        <div>
          <h1 className="font-display text-2xl tracking-tight text-ink leading-tight">{selectedAlgo.name}</h1>
          <p className="mt-2 text-sm text-ink-2 leading-relaxed">{selectedAlgo.description}</p>
        </div>

        {selectedAlgo.steps?.length > 0 && (
          <section aria-labelledby="steps-title">
            {/* Su mobile i passi sono chiusi di default per non spingere il codice in basso. */}
            <h2 id="steps-title" className="eyebrow mb-2 hidden lg:block">
              Come funziona
            </h2>
            <button
              type="button"
              onClick={() => setStepsOpen((open) => !open)}
              aria-expanded={stepsOpen}
              aria-controls="steps-list"
              className="flex h-10 w-full items-center justify-between gap-3 border-t border-line text-left lg:hidden"
            >
              <span className="eyebrow">
                Come funziona · <span className="tabular-nums">{selectedAlgo.steps.length} passi</span>
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`text-ink-3 transition-transform ${stepsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <ol
              id="steps-list"
              className={`flex-col gap-2.5 border-t border-line pt-3 lg:flex ${stepsOpen ? 'flex' : 'hidden'}`}
            >
              {selectedAlgo.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-[13px] text-ink-2 leading-relaxed">
                  <span className="font-mono text-2xs tabular-nums text-ink-3 pt-[3px] w-5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </aside>

      {/* Centro: codice di riferimento */}
      <Panel
        title="Implementazione C++"
        actions={
          <span className="font-mono text-2xs text-ink-3">
            {explanations.length > 0 ? (
              <>
                <span className="sm:hidden">tocca le zone</span>
                <span className="hidden sm:inline">clicca le zone evidenziate</span>
              </>
            ) : (
              'sola lettura'
            )}
          </span>
        }
        ref={editorPanelRef}
        className="h-[60dvh] min-h-[360px] scroll-mt-16 lg:h-auto lg:min-h-0"
        bodyClassName="relative flex-1"
      >
        <div className="absolute inset-0">
          <EditorFrame
            className="rounded-b-lg"
            value={selectedAlgo.codeReference}
            onMount={handleEditorMount}
            options={isDesktop ? editorOptions : mobileEditorOptions}
          />
        </div>
      </Panel>

      {/* Destra: spiegazione e visualizzatore (schede su desktop, in colonna su mobile) */}
      <div className="flex flex-col gap-4 lg:panel lg:min-h-0 lg:gap-0">
        <div role="tablist" aria-label="Pannelli" className="hidden lg:flex items-center gap-1 h-11 px-2 border-b border-line shrink-0">
          {tabs.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`pane-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative h-11 px-2.5 text-[13px] font-medium transition-colors ${
                  selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {t.label}
                {t.id === 'explanation' && explanations.length > 0 && (
                  <span className="ml-1.5 font-mono text-2xs tabular-nums text-ink-3">{explanations.length}</span>
                )}
                {selected && <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <section
          id="pane-explanation"
          aria-labelledby="explanation-title"
          className={`panel lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:border-0 lg:rounded-none lg:bg-transparent ${hiddenOnDesktop('explanation')}`}
        >
          <MobileHeading id="explanation-title">Spiegazione</MobileHeading>
          <div className="p-4">
            <ExplanationPanel
              explanations={explanations}
              active={activeIndex === -1 ? null : explanations[activeIndex]}
              activeIndex={activeIndex}
              onSelect={selectExplanation}
              onClear={() => setActiveExplanation(null)}
            />
          </div>
        </section>

        <section
          id="pane-viewer"
          aria-labelledby="viewer-title"
          className={`panel lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:border-0 lg:rounded-none lg:bg-transparent ${hiddenOnDesktop('viewer')}`}
        >
          <MobileHeading id="viewer-title">Visualizzatore</MobileHeading>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p role="status" className="min-w-0 font-mono text-2xs text-ink-3">
                {cvStatus === 'loading' && 'caricamento OpenCV.js…'}
                {cvStatus === 'ready' && (processing ? 'elaborazione…' : hasOutput ? 'output aggiornato' : 'OpenCV.js pronto')}
                {cvStatus === 'error' && 'OpenCV.js non disponibile'}
              </p>
              <button
                type="button"
                onClick={() => runAlgorithm()}
                disabled={cvStatus !== 'ready' || processing}
                className="btn btn-primary btn-sm h-10 shrink-0 px-4 lg:h-8 lg:px-2.5"
              >
                {processing || cvStatus === 'loading' ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play size={14} aria-hidden="true" />
                )}
                {processing ? 'Elaborazione…' : engineLabel[cvStatus]}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <figure className="min-w-0">
                <figcaption className="eyebrow mb-1.5">Sorgente</figcaption>
                <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-sunken">
                  <img ref={imgRef} src={lenaSrc} alt="Immagine sorgente: Lena" className="absolute inset-0 h-full w-full object-contain" />
                </div>
              </figure>
              <figure className="min-w-0">
                <figcaption className="eyebrow mb-1.5">Output</figcaption>
                <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-sunken">
                  {/* Il canvas resta sempre montato: runVisualAlgorithm ci disegna sopra. */}
                  <canvas
                    ref={canvasRef}
                    aria-label={`Output di ${selectedAlgo.name}`}
                    className={`absolute inset-0 h-full w-full object-contain ${hasOutput ? '' : 'invisible'}`}
                  />
                  {!hasOutput && (
                    <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-mono text-2xs text-ink-3">
                      {processing ? 'elaborazione…' : 'premi Esegui'}
                    </span>
                  )}
                </div>
              </figure>
            </div>

            {runError && (
              <Callout tone="err" role="alert">
                {runError}
              </Callout>
            )}
            {cvStatus === 'error' && (
              <Callout tone="err" role="alert" title="Impossibile caricare OpenCV.js">
                Controlla la connessione e ricarica la pagina.
              </Callout>
            )}

            <div className="border-t border-line pt-4">
              <ParamControls
                params={selectedAlgo.params}
                values={params}
                onChange={(key, value) => updateParams({ ...params, [key]: value })}
                onReset={() => updateParams(defaultParams(selectedAlgo))}
                onShowCode={showInCode}
              />
            </div>

            <p className="border-t border-line pt-3 text-2xs leading-4 text-ink-3">
              Il visualizzatore lavora su Lena ridotta a 256×256. Canny, Harris, Hough Lines, Otsu, Otsu 2K e Region
              Growing riproducono la logica del codice C++ (in Harris un solo cerchio per angolo); Hough Circles e
              K-means usano le funzioni di OpenCV.js e Split and Merge mostra solo la fase di split. Dopo la prima
              esecuzione, muovendo i cursori l'output si aggiorna da solo.
            </p>
          </div>
        </section>
      </div>

      {sheetOpen && !isDesktop && activeIndex !== -1 && (
        <ExplanationSheet
          explanations={explanations}
          active={explanations[activeIndex]}
          activeIndex={activeIndex}
          onSelect={selectFromSheet}
          onClose={closeSheet}
        />
      )}
    </div>
  );
};

export default StudyArea;
