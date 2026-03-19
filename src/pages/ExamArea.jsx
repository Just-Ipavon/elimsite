import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';

const ExamArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [code, setCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 1.5 hours in seconds
  
  const [cvReady, setCvReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Pick random algorithm on mount
    const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
    setSelectedAlgo(randomAlgo);
    setCode(randomAlgo.cppSkeleton);

    const checkCv = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setCvReady(true);
        clearInterval(checkCv);
      } else if (window.cv && typeof window.cv === 'function') {
        const cvPromise = window.cv();
        if (cvPromise && typeof cvPromise.then === 'function') {
          cvPromise.then((resolvedCv) => {
            window.cv = resolvedCv;
            setCvReady(true);
          }).catch(console.error);
        }
        clearInterval(checkCv);
      } else if (window.cv && typeof window.cv.then === 'function') {
        window.cv.then((resolvedCv) => {
          window.cv = resolvedCv;
          setCvReady(true);
        }).catch(console.error);
        clearInterval(checkCv);
      }
    }, 500);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(checkCv);
    };
  }, []);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '282a36', token: '' },
        { foreground: 'f1fa8c', token: 'string' },
        { foreground: 'ff79c6', token: 'keyword' },
        { foreground: '8be9fd', token: 'type' },
        { foreground: '50fa7b', token: 'number' },
        { foreground: 'bd93f9', token: 'constant' },
        { foreground: '6272a4', token: 'comment' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a',
        'editorLineNumber.foreground': '#6272a4',
      }
    });
  };

  const verifyCode = () => {
    if (!selectedAlgo) return;
    const userClean = code.replace(/\s+/g, '');
    const refClean = selectedAlgo.codeReference.replace(/\s+/g, '');
    
    if (userClean.includes(refClean) || refClean.includes(userClean)) {
      setVerificationResult({ success: true, message: 'Esatto! Il codice corrisponde perfettamente.' });
    } else {
      const requiredMethods = selectedAlgo.codeReference.match(/cv::[a-zA-Z]+/g) || [];
      const uniqueMethods = [...new Set(requiredMethods)];
      const missingMethods = uniqueMethods.filter(method => !code.includes(method));
      
      if (missingMethods.length > 0) {
        setVerificationResult({ 
          success: false, 
          message: `Codice non corretto. Ti mancano o stai sbagliando alcuni metodi chiave di OpenCV: ${missingMethods.join(', ')}` 
        });
      } else {
        setVerificationResult({ 
          success: false, 
          message: 'Hai usato i metodi giusti ma la struttura non corrisponde alla soluzione esatta.' 
        });
      }
    }
  };

  const runVisualizer = () => {
    if (!cvReady || !imgRef.current || !canvasRef.current || !selectedAlgo) return;
    setProcessing(true);
    
    setTimeout(() => {
      try {
        const cv = window.cv;
        let src = cv.imread(imgRef.current);
        let dst = new cv.Mat();
        let gray = new cv.Mat();
        
        if (selectedAlgo.id !== 'kmeans' && selectedAlgo.id !== 'split_merge') {
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        }

        switch (selectedAlgo.id) {
          case 'canny':
            cv.Canny(gray, dst, 50, 150, 3, false);
            break;
          case 'harris':
            dst = new cv.Mat(src.rows, src.cols, cv.CV_32FC1);
            cv.cornerHarris(gray, dst, 2, 3, 0.04);
            cv.normalize(dst, dst, 0, 255, cv.NORM_MINMAX, cv.CV_8U);
            cv.convertScaleAbs(dst, dst, 1, 0);
            cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
            break;
          case 'hough_circles':
            dst = src.clone();
            let circles = new cv.Mat();
            cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 45, 75, 40, 0, 0);
            for (let i = 0; i < circles.cols; ++i) {
                let x = circles.data32F[i * 3];
                let y = circles.data32F[i * 3 + 1];
                let radius = circles.data32F[i * 3 + 2];
                let center = new cv.Point(x, y);
                cv.circle(dst, center, radius, [255, 0, 255, 255], 3);
            }
            circles.delete();
            break;
          case 'hough_lines':
            dst = src.clone();
            let edges = new cv.Mat();
            cv.Canny(gray, edges, 50, 200, 3);
            let lines = new cv.Mat();
            cv.HoughLines(edges, lines, 1, Math.PI / 180, 150, 0, 0, 0, Math.PI);
            for (let i = 0; i < lines.rows; ++i) {
                let rho = lines.data32F[i * 2];
                let theta = lines.data32F[i * 2 + 1];
                let a = Math.cos(theta);
                let b = Math.sin(theta);
                let x0 = a * rho;
                let y0 = b * rho;
                let pt1 = new cv.Point(x0 + 1000 * (-b), y0 + 1000 * (a));
                let pt2 = new cv.Point(x0 - 1000 * (-b), y0 - 1000 * (a));
                cv.line(dst, pt1, pt2, [255, 0, 0, 255], 2);
            }
            edges.delete(); lines.delete();
            break;
          case 'otsu':
            cv.threshold(gray, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
            break;
          case 'otsu2k':
            cv.adaptiveThreshold(gray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
            break;
          case 'region_growing':
            dst = src.clone();
            let mask = new cv.Mat.zeros(src.rows + 2, src.cols + 2, cv.CV_8U);
            cv.floodFill(dst, mask, new cv.Point(100, 100), [255, 0, 0, 255], new cv.Rect(), [20, 20, 20, 0], [20, 20, 20, 0], 4 | (255 << 8) | cv.FLOODFILL_FIXED_RANGE);
            mask.delete();
            break;
          case 'kmeans':
          case 'split_merge':
            cv.medianBlur(src, dst, 15);
            break;
          default:
            cv.cvtColor(gray, dst, cv.COLOR_GRAY2RGBA);
        }

        cv.imshow(canvasRef.current, dst);
        src.delete();
        dst.delete();
        gray.delete();
      } catch (err) {
        console.error("OpenCV execution error:", err);
      }
      setProcessing(false);
    }, 100);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!selectedAlgo) return <div className="p-10 text-center text-dracula-fg">Caricamento Esame...</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 pb-0 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-cyan flex items-center gap-3">
            Esame (Senza Soluzioni)
            <span className={`text-lg bg-dracula-current px-3 py-1 rounded flex items-center gap-2 ${timeLeft < 300 ? 'text-dracula-red animate-pulse' : 'text-dracula-fg'}`}>
              <Clock size={16} /> {formatTime(timeLeft)}
            </span>
          </h1>
          <p className="text-lg mt-2 text-dracula-fg border-l-4 border-dracula-cyan pl-3">
            Algoritmo estratto: <span className="font-bold text-dracula-pink">{selectedAlgo.name}</span>
          </p>
        </div>
        
        <div className="flex space-x-4 items-center">
          <button 
            onClick={verifyCode}
            disabled={timeLeft === 0}
            className="flex items-center space-x-2 bg-dracula-cyan text-dracula-bg px-6 py-2 rounded font-bold hover:bg-opacity-80 transition-colors disabled:opacity-50"
          >
            <Play size={16} />
            <span>Invia Codice</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row gap-4 mb-4 min-h-0">
        
        {/* Left Col - Editor */}
        <div className="w-full md:w-1/2 flex flex-col h-full border rounded-lg overflow-hidden border-dracula-cyan relative">
          <div className="absolute top-2 right-2 z-10 bg-dracula-current px-3 py-1 rounded text-xs text-dracula-comment border border-dracula-comment">
            Scrivi il tuo codice C++ qui
          </div>
          <Editor
            height="100%"
            defaultLanguage="cpp"
            value={code}
            onChange={setCode}
            beforeMount={handleEditorWillMount}
            theme="dracula"
            options={{
              minimap: { enabled: false },
              fontSize: 15,
              fontFamily: "'Fira Code', 'Monaco', monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              padding: { top: 32 },
              readOnly: timeLeft === 0
            }}
          />
        </div>
        
        {/* Right Col - Visualizer / Output */}
        <div className="w-full md:w-1/2 flex flex-col h-full gap-4 overflow-y-auto pr-2">
          
          {/* Verification Box */}
          <div className="glass rounded-lg p-4 flex flex-col shrink-0">
            <h2 className="text-lg font-bold text-dracula-cyan mb-2 border-b border-dracula-comment pb-2">Esito Verifica</h2>
            
            {timeLeft === 0 && !verificationResult && (
               <div className="mt-4 p-4 rounded-md border flex items-start space-x-3 bg-dracula-red bg-opacity-10 border-dracula-red">
                <div className="mt-1"><XCircle className="text-dracula-red" size={20} /></div>
                <div>
                  <h3 className="font-bold text-dracula-red">Tempo Scaduto</h3>
                  <p className="text-sm mt-1">Non hai effettuato la consegna in tempo.</p>
                </div>
              </div>
            )}

            {verificationResult ? (
              <div className={`mt-2 p-4 rounded-md border flex items-start space-x-3 ${verificationResult.success ? 'bg-dracula-green bg-opacity-10 border-dracula-green' : 'bg-dracula-red bg-opacity-10 border-dracula-red'}`}>
                <div className="mt-1">
                  {verificationResult.success ? <CheckCircle className="text-dracula-green" size={20} /> : <XCircle className="text-dracula-red" size={20} />}
                </div>
                <div>
                  <h3 className={`font-bold ${verificationResult.success ? 'text-dracula-green' : 'text-dracula-red'}`}>
                    {verificationResult.success ? 'Esame Superato!' : 'Verifica Fallita'}
                  </h3>
                  <p className="text-sm mt-1">{verificationResult.message}</p>
                </div>
              </div>
            ) : (
              <p className="text-dracula-comment text-sm mt-2">{timeLeft > 0 ? "Scrivi la tua implementazione per l'algoritmo estratto e clicca su Invia Codice." : ""}</p>
            )}
          </div>

          {/* Visualizer Box */}
          <div className="glass rounded-lg p-4 flex flex-col shrink-0">
            <div className="w-full flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-dracula-fg flex items-center gap-2 border-b border-dracula-comment pb-2 w-full">
                <ImageIcon className="text-dracula-green" size={20} /> Obiettivo Visivo
                <button 
                  onClick={runVisualizer}
                  disabled={!cvReady || processing}
                  className="ml-auto text-xs flex items-center space-x-2 bg-dracula-green text-dracula-bg px-3 py-1 rounded hover:bg-opacity-80 disabled:opacity-50"
                >
                  <Play size={12} fill="currentColor" />
                  <span>{processing ? '...' : 'Vedi Soluzione Visiva'}</span>
                </button>
              </h2>
            </div>
            
            <div className="flex flex-row justify-center items-center gap-4">
               <div className="flex flex-col items-center">
                 <h4 className="text-xs text-dracula-comment mb-1">Source (Lena)</h4>
                 <div className="bg-dracula-bg border border-dracula-current rounded w-full max-w-[150px]">
                    <img ref={imgRef} src={lenaSrc} alt="Source" className="w-full h-auto rounded" />
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <h4 className="text-xs text-dracula-comment mb-1">Expected Output</h4>
                 <div className="bg-dracula-bg border border-dracula-purple rounded w-full max-w-[150px] min-h-[150px] flex items-center justify-center">
                    <canvas ref={canvasRef} className="w-full h-auto rounded max-w-full" />
                 </div>
               </div>
            </div>
            <p className="text-xs text-dracula-comment mt-4 text-center">
              Questo visualizzatore mostra il risultato atteso per darti un'indicazione visiva sull'algoritmo da programmare.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExamArea;
