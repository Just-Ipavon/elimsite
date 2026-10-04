import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Mostra l'esito di `verifySolution` con punteggio e funzioni mancanti e,
 * se presenti, gli errori trovati da `diagnoseCode`: cliccandone uno
 * `onSelectLine` porta l'editor su quella riga.
 */
const VerificationResult = ({ result, successTitle, failureTitle, diagnostics = [], onSelectLine }) => {
  const { success, score, missing, empty } = result;
  const tone = success ? 'green' : 'red';
  const Icon = success ? CheckCircle : XCircle;

  let message;
  if (empty) message = "L'editor è vuoto: scrivi la tua implementazione prima di verificarla.";
  else if (success) message = "Il codice contiene l'implementazione di riferimento completa.";
  else if (missing.length > 0) message = 'Mancano alcune chiamate chiave presenti nella soluzione di riferimento:';
  else message = 'Hai usato le funzioni giuste, ma la struttura non corrisponde ancora alla soluzione: ricontrolla i passaggi.';

  return (
    <div
      role="status"
      className={`mt-4 p-4 rounded-md border flex items-start space-x-3 ${
        tone === 'green' ? 'bg-dracula-green/10 border-dracula-green' : 'bg-dracula-red/10 border-dracula-red'
      }`}
    >
      <Icon className={`mt-1 shrink-0 ${tone === 'green' ? 'text-dracula-green' : 'text-dracula-red'}`} size={20} />
      <div className="min-w-0">
        <h3 className={`font-bold ${tone === 'green' ? 'text-dracula-green' : 'text-dracula-red'}`}>
          {success ? successTitle : failureTitle}
        </h3>
        <p className="text-sm mt-1">{message}</p>
        {!success && missing.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {missing.map((name) => (
              <code key={name} className="text-xs bg-dracula-bg px-2 py-0.5 rounded text-dracula-orange">
                {name}()
              </code>
            ))}
          </div>
        )}
        {diagnostics.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-bold text-dracula-fg flex items-center gap-1 mb-1">
              <AlertTriangle size={12} className="text-dracula-orange" aria-hidden="true" />
              Da controllare ({diagnostics.length}) · sottolineati nell'editor
            </h4>
            <ul className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {diagnostics.map((d) => (
                <li key={`${d.line}:${d.startColumn}:${d.message}`}>
                  <button
                    type="button"
                    onClick={() => onSelectLine?.(d.line, d.startColumn)}
                    className="w-full text-left text-xs rounded px-2 py-1 bg-dracula-bg/60 hover:bg-dracula-bg flex gap-2"
                  >
                    <span className={`font-mono shrink-0 ${d.severity === 'error' ? 'text-dracula-red' : 'text-dracula-yellow'}`}>
                      riga {d.line}
                    </span>
                    <span className="text-dracula-fg/90 break-words min-w-0">{d.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!empty && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-dracula-comment mb-1">
              <span>Righe corrispondenti al riferimento</span>
              <span>{score}%</span>
            </div>
            <div className="h-1.5 bg-dracula-bg rounded">
              <div
                className={`h-full rounded ${tone === 'green' ? 'bg-dracula-green' : 'bg-dracula-orange'}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationResult;
