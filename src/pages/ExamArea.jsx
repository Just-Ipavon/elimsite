import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, XCircle, Clock, Image as ImageIcon, Shuffle } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';
import { DRACULA_THEME, baseEditorOptions, defineDraculaTheme } from '../lib/monacoTheme';
import { clearCanvas, runVisualAlgorithm, useOpenCv } from '../lib/opencv';
import { verifySolution } from '../lib/verify';
import VerificationResult from '../components/VerificationResult';

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
  const cvStatus = useOpenCv();

  const imgRef = useRef(null);
  const canvasRef = useRef(null);

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

  const newExam = () => {
    const algo = pickRandomAlgo(selectedAlgo.id);
    setSelectedAlgo(algo);
    setCode(algo.cppSkeleton);
    setVerificationResult(null);
    setDeadline(Date.now() + EXAM_DURATION_S * 1000);
    setTimeLeft(EXAM_DURATION_S);
    clearCanvas(canvasRef.current);
  };

  const verifyCode = () => setVerificationResult(verifySolution(code, selectedAlgo.codeReference));

  const runVisualizer = () => {
    if (cvStatus !== 'ready' || !imgRef.current || !canvasRef.current) return;
    setProcessing(true);
    setTimeout(() => {
      try {
        runVisualAlgorithm(selectedAlgo.id, imgRef.current, canvasRef.current);
      } catch (err) {
        console.error('OpenCV execution error:', err);
      } finally {
        setProcessing(false);
      }
    }, 50);
  };

  return (
    <div className="lg:h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-cyan flex flex-wrap items-center gap-3">
            Esame (senza soluzioni)
            <span
              role="timer"
              aria-label="Tempo rimanente"
              className={`text-lg bg-dracula-current px-3 py-1 rounded flex items-center gap-2 ${
                timeLeft < WARNING_THRESHOLD_S ? 'text-dracula-red animate-pulse' : 'text-dracula-fg'
              }`}
            >
              <Clock size={16} aria-hidden="true" /> {formatTime(timeLeft)}
            </span>
          </h1>
          <p className="text-lg mt-2 text-dracula-fg border-l-4 border-dracula-cyan pl-3">
            Algoritmo estratto: <span className="font-bold text-dracula-pink">{selectedAlgo.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={newExam}
            className="flex items-center space-x-2 border border-dracula-comment text-dracula-fg px-4 py-2 rounded hover:border-dracula-cyan hover:text-dracula-cyan transition-colors"
          >
            <Shuffle size={16} aria-hidden="true" />
            <span>Nuovo esame</span>
          </button>
          <button
            type="button"
            onClick={verifyCode}
            disabled={timeUp}
            className="flex items-center space-x-2 bg-dracula-cyan text-dracula-bg px-6 py-2 rounded font-bold hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} aria-hidden="true" />
            <span>Consegna</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Colonna sinistra: editor */}
        <div className="w-full lg:w-1/2 h-[60vh] lg:h-full flex flex-col border rounded-lg overflow-hidden border-dracula-cyan relative">
          <div className="absolute top-2 right-4 z-10 bg-dracula-current px-3 py-1 rounded text-xs text-dracula-comment border border-dracula-comment pointer-events-none">
            {timeUp ? 'Tempo scaduto: editor in sola lettura' : 'Scrivi qui il tuo codice C++'}
          </div>
          <Editor
            height="100%"
            language="cpp"
            value={code}
            onChange={(value) => setCode(value ?? '')}
            beforeMount={defineDraculaTheme}
            theme={DRACULA_THEME}
            options={{ ...baseEditorOptions, fontSize: 15, padding: { top: 40 }, readOnly: timeUp }}
          />
        </div>

        {/* Colonna destra: esito e visualizzatore */}
        <div className="w-full lg:w-1/2 flex flex-col lg:h-full gap-4 lg:overflow-y-auto lg:pr-2">
          <div className="glass rounded-lg p-4 flex flex-col shrink-0">
            <h2 className="text-lg font-bold text-dracula-cyan mb-2 border-b border-dracula-comment pb-2">
              Esito verifica
            </h2>

            {timeUp && !verificationResult && (
              <div role="alert" className="mt-4 p-4 rounded-md border flex items-start space-x-3 bg-dracula-red/10 border-dracula-red">
                <XCircle className="mt-1 shrink-0 text-dracula-red" size={20} aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-dracula-red">Tempo scaduto</h3>
                  <p className="text-sm mt-1">Non hai consegnato in tempo. Avvia un nuovo esame per riprovare.</p>
                </div>
              </div>
            )}

            {verificationResult ? (
              <VerificationResult
                result={verificationResult}
                successTitle="Esame superato!"
                failureTitle="Verifica fallita"
              />
            ) : (
              !timeUp && (
                <p className="text-dracula-comment text-sm mt-2">
                  Scrivi la tua implementazione dell'algoritmo estratto e premi Consegna.
                </p>
              )
            )}
          </div>

          <div className="glass rounded-lg p-4 flex flex-col shrink-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-dracula-comment pb-2 mb-4">
              <h2 className="text-lg font-bold text-dracula-fg flex items-center gap-2">
                <ImageIcon className="text-dracula-green" size={20} aria-hidden="true" /> Obiettivo visivo
              </h2>
              <button
                type="button"
                onClick={runVisualizer}
                disabled={cvStatus !== 'ready' || processing}
                className="ml-auto text-xs flex items-center space-x-2 bg-dracula-green text-dracula-bg px-3 py-1 rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={12} fill="currentColor" aria-hidden="true" />
                <span>
                  {processing ? 'Elaborazione...' : cvStatus === 'loading' ? 'Caricamento OpenCV...' : 'Mostra risultato atteso'}
                </span>
              </button>
            </div>

            <div className="flex flex-row justify-center items-start gap-4">
              <figure className="flex flex-col items-center w-full max-w-[180px]">
                <figcaption className="text-xs text-dracula-comment mb-1">Sorgente (Lena)</figcaption>
                <div className="bg-dracula-bg border border-dracula-current rounded w-full">
                  <img ref={imgRef} src={lenaSrc} alt="Immagine sorgente: Lena" className="w-full h-auto rounded" />
                </div>
              </figure>

              <figure className="flex flex-col items-center w-full max-w-[180px]">
                <figcaption className="text-xs text-dracula-comment mb-1">Output atteso</figcaption>
                <div className="bg-dracula-bg border border-dracula-purple rounded w-full aspect-square flex items-center justify-center">
                  <canvas ref={canvasRef} className="w-full h-auto rounded max-w-full" />
                </div>
              </figure>
            </div>
            <p className="text-xs text-dracula-comment mt-4 text-center">
              {cvStatus === 'error'
                ? 'Impossibile caricare OpenCV.js: controlla la connessione e ricarica la pagina.'
                : "Il visualizzatore mostra il risultato atteso per darti un'indicazione sull'algoritmo da implementare."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamArea;
