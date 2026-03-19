import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { algorithms } from '../data/algorithms';

const IdeArea = () => {
  const [selectedAlgo, setSelectedAlgo] = useState(algorithms[0]);
  const [code, setCode] = useState(algorithms[0].cppSkeleton);
  const [verificationResult, setVerificationResult] = useState(null);

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

  const handleAlgoChange = (e) => {
    const algo = algorithms.find(a => a.id === e.target.value);
    setSelectedAlgo(algo);
    setCode(algo.cppSkeleton);
    setVerificationResult(null);
  };

  const verifyCode = () => {
    // A simple structural check for educational purposes
    // Remove whitespaces to do a basic structure comparison
    const userClean = code.replace(/\s+/g, '');
    const refClean = selectedAlgo.codeReference.replace(/\s+/g, '');
    
    // In a real app, this would be an AST check or sending to a C++ Judge0 backend
    if (userClean === refClean) {
      setVerificationResult({ success: true, message: 'Perfect match! Your C++ implementation is correct.' });
    } else {
      // Basic check if they used key opencv methods
      const requiredMethods = selectedAlgo.codeReference.match(/cv::[a-zA-Z]+/g) || [];
      const uniqueMethods = [...new Set(requiredMethods)];
      
      const missingMethods = uniqueMethods.filter(method => !code.includes(method));
      
      if (missingMethods.length > 0) {
        setVerificationResult({ 
          success: false, 
          message: `You are missing some key OpenCV methods: ${missingMethods.join(', ')}` 
        });
      } else {
        setVerificationResult({ 
          success: false, 
          message: 'The structure looks okay, but it does not exactly match the reference solution. Double check the steps!' 
        });
      }
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 pb-0">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-dracula-pink">Practice IDE</h1>
          <p className="text-sm text-dracula-comment">Write your C++ algorithm and verify it vs. the original.</p>
        </div>
        
        <div className="flex space-x-4 items-center">
          <select 
            className="bg-dracula-current text-dracula-fg border border-dracula-comment rounded px-4 py-2 focus:outline-none focus:border-dracula-pink"
            value={selectedAlgo.id}
            onChange={handleAlgoChange}
          >
            {algorithms.map(algo => (
              <option key={algo.id} value={algo.id}>{algo.name}</option>
            ))}
          </select>
          
          <button 
            onClick={verifyCode}
            className="flex items-center space-x-2 bg-dracula-purple text-dracula-bg px-4 py-2 rounded font-bold hover:bg-dracula-pink transition-colors"
          >
            <Play size={16} />
            <span>Verify Code</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-2/3 h-full border rounded-lg overflow-hidden border-dracula-comment">
          <Editor
            height="100%"
            defaultLanguage="cpp"
            value={code}
            onChange={setCode}
            beforeMount={handleEditorWillMount}
            theme="dracula"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', 'Monaco', monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              padding: { top: 16 }
            }}
          />
        </div>
        
        <div className="w-full md:w-1/3 h-full glass rounded-lg p-4 flex flex-col">
          <h2 className="text-lg font-bold text-dracula-cyan mb-2 border-b border-dracula-comment pb-2">Output / Terminal</h2>
          
          {verificationResult ? (
            <div className={`mt-4 p-4 rounded-md border flex items-start space-x-3 ${verificationResult.success ? 'bg-dracula-green bg-opacity-10 border-dracula-green' : 'bg-dracula-red bg-opacity-10 border-dracula-red'}`}>
              <div className="mt-1">
                {verificationResult.success ? <CheckCircle className="text-dracula-green" size={20} /> : <XCircle className="text-dracula-red" size={20} />}
              </div>
              <div>
                <h3 className={`font-bold ${verificationResult.success ? 'text-dracula-green' : 'text-dracula-red'}`}>
                  {verificationResult.success ? 'Compilation Success' : 'Verification Failed'}
                </h3>
                <p className="text-sm mt-1">{verificationResult.message}</p>
              </div>
            </div>
          ) : (
            <p className="text-dracula-comment text-sm mt-4">Waiting for execution... Select an algorithm and click Verify Code.</p>
          )}

          <div className="mt-auto">
             <h3 className="text-sm font-bold text-dracula-orange mb-1">Expected Signature:</h3>
             <pre className="text-xs text-dracula-comment overflow-x-auto bg-dracula-bg p-2 rounded border border-dracula-current">
               {selectedAlgo.codeReference.split('\\n')[0]}
             </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeArea;
