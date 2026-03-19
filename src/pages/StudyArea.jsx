import React, { useState, useEffect, useRef } from 'react';
import { algorithms } from '../data/algorithms';
import { Play, Image as ImageIcon } from 'lucide-react';
import lenaSrc from '../assets/lena.png';
import Editor from '@monaco-editor/react';

const StudyArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [cvReady, setCvReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState(null);
  
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsCollection = useRef(null);

  useEffect(() => {
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
    return () => clearInterval(checkCv);
  }, []);

  const updateDecorations = (editor, monaco, algo) => {
    setActiveExplanation(null);
    if (!editor || !monaco) return;

    const code = algo.codeReference;
    const parsedExplanations = (algo.explanations || []).map(exp => {
      const startIndex = code.indexOf(exp.startMatch);
      const endIndex = exp.endMatch ? code.indexOf(exp.endMatch) : startIndex;
      if (startIndex === -1) return null;

      const startLine = code.substring(0, startIndex).split('\n').length;
      let endLine = code.substring(0, endIndex).split('\n').length;
      if (exp.endMatch) {
         endLine += exp.endMatch.split('\n').length - 1;
      }
      return { ...exp, startLine, endLine };
    }).filter(Boolean);

    editor.parsedExplanations = parsedExplanations;

    const decorations = parsedExplanations.map(exp => ({
      range: new monaco.Range(exp.startLine, 1, exp.endLine, 1),
      options: {
        isWholeLine: true,
        className: 'explanation-highlight',
      }
    }));

    if (decorationsCollection.current) {
        decorationsCollection.current.clear();
    }
    decorationsCollection.current = editor.createDecorationsCollection(decorations);
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    editor.onMouseDown((e) => {
      const line = e.target.position?.lineNumber;
      if (!line) return;
      
      const exps = editorRef.current.parsedExplanations || [];
      const clickedExp = exps.find(exp => line >= exp.startLine && line <= exp.endLine);
      setActiveExplanation(clickedExp || null);
    });

    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '282a36' },
        { token: '', foreground: 'f8f8f2', background: '282a36' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editorLineNumber.foreground': '#6272a4',
        'editor.selectionBackground': '#44475a',
        'editor.lineHighlightBackground': '#44475a80',
      }
    });
    monaco.editor.setTheme('dracula');
    
    updateDecorations(editor, monaco, selectedAlgo);
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
        updateDecorations(editorRef.current, monacoRef.current, selectedAlgo);
    }
  }, [selectedAlgo]);

  const runAlgorithm = () => {
    if (!cvReady || !imgRef.current || !canvasRef.current) return;
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
        alert("Errore nell'esecuzione di OpenCV.js: " + err);
      }
      setProcessing(false);
    }, 100);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 md:px-10 pb-10">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Col - Info */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="glass p-6 rounded-xl border border-dracula-comment">
            <h1 className="text-3xl font-bold font-mono text-dracula-cyan mb-2">Algorithm Study</h1>
            <p className="text-dracula-comment mb-6">Select an algorithm to read the C++ implementation. Test it visually on the right using OpenCV.js.</p>
            
            <select 
              className="w-full bg-dracula-bg text-dracula-fg border border-dracula-comment rounded-lg px-4 py-3 focus:outline-none focus:border-dracula-cyan mb-6"
              value={selectedAlgo.id}
              onChange={(e) => {
                setSelectedAlgo(algorithms.find(a => a.id === e.target.value));
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }}
            >
              {algorithms.map(algo => (
                <option key={algo.id} value={algo.id}>{algo.name}</option>
              ))}
            </select>

            <h2 className="text-xl font-bold text-dracula-fg mb-2">{selectedAlgo.name}</h2>
            <p className="text-dracula-comment text-sm mb-6 leading-relaxed">
              {selectedAlgo.description}
            </p>

            {activeExplanation && (
              <div className="mt-4 p-5 border-l-4 border-dracula-pink bg-dracula-bg bg-opacity-80 rounded-lg shadow-lg">
                 <h4 className="font-bold text-dracula-pink mb-2 text-lg">{activeExplanation.title}</h4>
                 <p className="text-dracula-fg leading-relaxed">{activeExplanation.text}</p>
              </div>
            )}
            {!activeExplanation && selectedAlgo.explanations?.length > 0 && (
              <div className="mt-4 p-4 border-l-4 border-dracula-cyan bg-dracula-bg bg-opacity-50 rounded-lg">
                 <p className="text-sm text-dracula-cyan italic flex items-center gap-2">
                   💡 Clicca sulle zone evidenziate nel codice per esplorarne il funzionamento!
                 </p>
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-xl border border-dracula-comment flex-grow flex flex-col">
            <h3 className="text-lg font-bold text-dracula-yellow mb-4">C++ Reference Code</h3>
            <div className="w-full h-[500px] lg:h-[700px] rounded-lg overflow-hidden border border-dracula-current shadow-inner">
              <Editor
                height="100%"
                defaultLanguage="cpp"
                theme="dracula"
                value={selectedAlgo.codeReference}
                onMount={handleEditorMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Col - Visual Testing */}
        <div className="w-full lg:w-1/3 glass p-6 rounded-xl border border-dracula-comment flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-dracula-fg flex items-center gap-2">
                <ImageIcon className="text-dracula-green" /> Visualizer
              </h2>
              <button 
                onClick={runAlgorithm}
                disabled={!cvReady || processing}
                className="flex items-center space-x-2 bg-dracula-green text-dracula-bg px-5 py-2 rounded-lg font-bold hover:bg-opacity-80 transition-colors disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" />
                <span>{processing ? 'Processing...' : (cvReady ? 'Run Algo' : 'Loading Engine...')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 w-full">
               <div className="flex flex-col items-center">
                 <h4 className="text-sm font-semibold text-dracula-comment mb-2">Source (Lena)</h4>
                 <div className="bg-dracula-bg border-2 border-dashed border-dracula-current p-1 rounded-lg w-full max-w-[256px]">
                    <img 
                      ref={imgRef}
                      src={lenaSrc} 
                      alt="Source Lena" 
                      className="w-full h-auto rounded"
                    />
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <h4 className="text-sm font-semibold text-dracula-comment mb-2">Output</h4>
                 <div className="bg-dracula-bg border-2 border-solid border-dracula-purple p-1 rounded-lg w-full max-w-[256px] min-h-[256px] flex items-center justify-center">
                    <canvas ref={canvasRef} className="w-full h-auto rounded max-w-full" />
                 </div>
               </div>
            </div>
            
            <p className="text-xs text-dracula-comment mt-8 text-center max-w-sm">
              Visualizer uses OpenCV.js to emulate the C++ algorithms inside the browser. For complex recursive or native algorithms (like Region Growing, K-means), a simplified JS equivalent is used to demonstrate the visual effect.
            </p>
        </div>

      </div>
    </div>
  );
};

export default StudyArea;
