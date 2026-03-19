import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { algorithms } from '../data/algorithms';

const ExamArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [code, setCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 1.5 hours in seconds

  useEffect(() => {
    // Pick random algorithm on mount
    const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
    setSelectedAlgo(randomAlgo);
    setCode(randomAlgo.cppSkeleton);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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
      setVerificationResult({ success: true, message: 'Perfect match!' });
    } else {
      const requiredMethods = selectedAlgo.codeReference.match(/cv::[a-zA-Z]+/g) || [];
      const uniqueMethods = [...new Set(requiredMethods)];
      const missingMethods = uniqueMethods.filter(method => !code.includes(method));
      
      if (missingMethods.length > 0) {
        setVerificationResult({ 
          success: false, 
          message: `Stai saltando o sbagliando l'uso di alcuni metodi OpenCV: ${missingMethods.join(', ')}` 
        });
      } else {
        setVerificationResult({ 
          success: false, 
          message: 'Hai usato le funzioni chiave ma la struttura non corrisponde alla soluzione esatta.' 
        });
      }
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!selectedAlgo) return <div className="p-10 text-center text-dracula-fg">Caricamento Esame...</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 pb-0">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-red flex items-center gap-3">
            Simulazione Esame
            <span className={`text-lg bg-dracula-current px-3 py-1 rounded flex items-center gap-2 ${timeLeft < 300 ? 'text-dracula-red animate-pulse' : 'text-dracula-fg'}`}>
              <Clock size={16} /> {formatTime(timeLeft)}
            </span>
          </h1>
          <p className="text-xl mt-2 text-dracula-fg">
            Implementa: <span className="font-bold text-dracula-cyan">{selectedAlgo.name}</span>
          </p>
        </div>
        
        <div className="flex space-x-4 items-center">
          <button 
            onClick={verifyCode}
            disabled={timeLeft === 0}
            className="flex items-center space-x-2 bg-dracula-red text-dracula-bg px-6 py-2 rounded font-bold hover:bg-opacity-80 transition-colors disabled:opacity-50"
          >
            <Play size={16} />
            <span>Invia Codice</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-3/4 h-full border rounded-lg overflow-hidden border-dracula-red">
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
              padding: { top: 16 },
              readOnly: timeLeft === 0
            }}
          />
        </div>
        
        <div className="w-full md:w-1/4 h-full glass rounded-lg p-4 flex flex-col">
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
            <div className={`mt-4 p-4 rounded-md border flex items-start space-x-3 ${verificationResult.success ? 'bg-dracula-green bg-opacity-10 border-dracula-green' : 'bg-dracula-red bg-opacity-10 border-dracula-red'}`}>
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
            <p className="text-dracula-comment text-sm mt-4">{timeLeft > 0 ? "Scrivi la tua implementazione e clicca su Invia Codice." : ""}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamArea;
