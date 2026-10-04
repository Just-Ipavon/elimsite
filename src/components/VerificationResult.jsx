import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Mostra l'esito di `verifySolution` con punteggio e funzioni mancanti.
 */
const VerificationResult = ({ result, successTitle, failureTitle }) => {
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
