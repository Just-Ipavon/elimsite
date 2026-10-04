import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Image as ImageIcon, Lightbulb } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';
import { DRACULA_THEME, baseEditorOptions, defineDraculaTheme } from '../lib/monacoTheme';
import { clearCanvas, runVisualAlgorithm, useOpenCv } from '../lib/opencv';

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

const engineLabel = { loading: 'Caricamento OpenCV...', ready: 'Esegui', error: 'OpenCV non disponibile' };

const StudyArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [processing, setProcessing] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState(null);
  const [runError, setRunError] = useState(null);
  const cvStatus = useOpenCv();

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const explanationsRef = useRef([]);

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

    editor.onMouseDown((e) => {
      const line = e.target.position?.lineNumber;
      if (!line) return;
      const clicked = explanationsRef.current.find((exp) => line >= exp.startLine && line <= exp.endLine);
      setActiveExplanation(clicked ?? null);
    });

    applyDecorations(selectedAlgo);
  };

  // Le decorazioni vanno ricalcolate dopo che l'editor ha caricato il nuovo codice.
  useEffect(() => {
    applyDecorations(selectedAlgo);
  }, [selectedAlgo]);

  const handleAlgoChange = (e) => {
    setSelectedAlgo(algorithms.find((a) => a.id === e.target.value));
    setActiveExplanation(null);
    setRunError(null);
    clearCanvas(canvasRef.current);
  };

  const runAlgorithm = () => {
    if (cvStatus !== 'ready' || !imgRef.current || !canvasRef.current) return;
    setProcessing(true);
    setRunError(null);

    // Lascia al browser il tempo di mostrare lo stato "in esecuzione".
    setTimeout(() => {
      try {
        runVisualAlgorithm(selectedAlgo.id, imgRef.current, canvasRef.current);
      } catch (err) {
        console.error('OpenCV execution error:', err);
        setRunError(`Errore durante l'esecuzione di OpenCV.js: ${err?.message ?? err}`);
      } finally {
        setProcessing(false);
      }
    }, 50);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 md:px-10 pb-10">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonna sinistra: teoria e codice */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="glass p-6 rounded-xl">
            <h1 className="text-3xl font-bold font-mono text-dracula-cyan mb-2">Studio degli Algoritmi</h1>
            <p className="text-dracula-comment mb-6">
              Scegli un algoritmo per leggerne l'implementazione C++ e provalo visivamente con OpenCV.js.
            </p>

            <label htmlFor="study-algo" className="sr-only">
              Algoritmo
            </label>
            <select
              id="study-algo"
              className="w-full bg-dracula-bg text-dracula-fg border border-dracula-comment rounded-lg px-4 py-3 focus:outline-none focus:border-dracula-cyan mb-6"
              value={selectedAlgo.id}
              onChange={handleAlgoChange}
            >
              {algorithms.map((algo) => (
                <option key={algo.id} value={algo.id}>
                  {algo.name}
                </option>
              ))}
            </select>

            <h2 className="text-xl font-bold text-dracula-fg mb-2">{selectedAlgo.name}</h2>
            <p className="text-dracula-comment text-sm leading-relaxed">{selectedAlgo.description}</p>

            {activeExplanation ? (
              <div className="mt-6 p-5 border-l-4 border-dracula-pink bg-dracula-bg/80 rounded-lg shadow-lg" aria-live="polite">
                <h3 className="font-bold text-dracula-pink mb-2 text-lg">{activeExplanation.title}</h3>
                <p className="text-dracula-fg leading-relaxed">{activeExplanation.text}</p>
              </div>
            ) : (
              selectedAlgo.explanations?.length > 0 && (
                <div className="mt-6 p-4 border-l-4 border-dracula-cyan bg-dracula-bg/50 rounded-lg">
                  <p className="text-sm text-dracula-cyan italic flex items-center gap-2">
                    <Lightbulb size={16} aria-hidden="true" />
                    Clicca sulle zone evidenziate nel codice per scoprirne il funzionamento.
                  </p>
                </div>
              )
            )}
          </div>

          <div className="glass p-6 rounded-xl flex-grow flex flex-col">
            <h3 className="text-lg font-bold text-dracula-yellow mb-4">Codice C++ di riferimento</h3>
            <div className="w-full h-[500px] lg:h-[700px] rounded-lg overflow-hidden border border-dracula-current shadow-inner">
              <Editor
                height="100%"
                language="cpp"
                theme={DRACULA_THEME}
                value={selectedAlgo.codeReference}
                beforeMount={defineDraculaTheme}
                onMount={handleEditorMount}
                options={{
                  ...baseEditorOptions,
                  readOnly: true,
                  wordWrap: 'on',
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          </div>
        </div>

        {/* Colonna destra: visualizzatore */}
        <div className="w-full lg:w-1/3 lg:self-start lg:sticky lg:top-20 glass p-6 rounded-xl flex flex-col items-center">
          <div className="w-full flex justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-dracula-fg flex items-center gap-2">
              <ImageIcon className="text-dracula-green" aria-hidden="true" /> Visualizzatore
            </h2>
            <button
              type="button"
              onClick={runAlgorithm}
              disabled={cvStatus !== 'ready' || processing}
              className="flex items-center space-x-2 bg-dracula-green text-dracula-bg px-5 py-2 rounded-lg font-bold hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              <span>{processing ? 'Elaborazione...' : engineLabel[cvStatus]}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 w-full">
            <figure className="flex flex-col items-center">
              <figcaption className="text-sm font-semibold text-dracula-comment mb-2">Sorgente (Lena)</figcaption>
              <div className="bg-dracula-bg border-2 border-dashed border-dracula-current p-1 rounded-lg w-full max-w-[256px]">
                <img ref={imgRef} src={lenaSrc} alt="Immagine sorgente: Lena" className="w-full h-auto rounded" />
              </div>
            </figure>

            <figure className="flex flex-col items-center">
              <figcaption className="text-sm font-semibold text-dracula-comment mb-2">Output</figcaption>
              <div className="bg-dracula-bg border-2 border-solid border-dracula-purple p-1 rounded-lg w-full max-w-[256px] aspect-square flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-auto rounded max-w-full" />
              </div>
            </figure>
          </div>

          {runError && (
            <p role="alert" className="mt-6 text-sm text-dracula-red text-center">
              {runError}
            </p>
          )}
          {cvStatus === 'error' && (
            <p role="alert" className="mt-6 text-sm text-dracula-red text-center">
              Impossibile caricare OpenCV.js: controlla la connessione e ricarica la pagina.
            </p>
          )}

          <p className="text-xs text-dracula-comment mt-8 text-center max-w-sm">
            Il visualizzatore usa le funzioni native di OpenCV.js per emulare il risultato degli algoritmi C++ nel
            browser. Per gli algoritmi più complessi (Region Growing, Split and Merge, Otsu multilivello) viene usato
            un equivalente semplificato che ne mostra l'effetto visivo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudyArea;
