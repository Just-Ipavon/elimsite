import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const SectionLabel = ({ children }) => <h4 className="eyebrow mb-2">{children}</h4>;

// Elenco cliccabile di errori o avvisi: il clic porta l'editor sulla riga.
const DiagnosticList = ({ title, tone, items, onSelectLine }) => {
  if (!items.length) return null;
  const Icon = tone === 'err' ? XCircle : AlertTriangle;
  const color = tone === 'err' ? 'text-err' : 'text-warn';
  return (
    <div>
      <h4 className="eyebrow mb-1.5 flex items-center gap-1.5">
        <Icon size={12} className={color} aria-hidden="true" />
        {title}
        <span className="tabular-nums">· {items.length}</span>
      </h4>
      <ul className="-mx-2">
        {items.map((d) => (
          <li key={`${d.line}:${d.startColumn}:${d.message}`}>
            <button
              type="button"
              onClick={() => onSelectLine?.(d.line, d.startColumn)}
              className="flex min-h-10 w-full items-baseline gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-sunken lg:min-h-0 lg:py-1.5"
            >
              <span className={`w-11 shrink-0 font-mono text-2xs tabular-nums ${color}`}>r. {d.line}</span>
              <span className="min-w-0 break-words text-[13px] leading-snug text-ink-2">{d.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Mostra l'esito di `verifySolution` con punteggio e funzioni mancanti e,
 * se presenti, gli errori trovati da `diagnoseCode`: cliccandone uno
 * `onSelectLine` porta l'editor su quella riga.
 */
const VerificationResult = ({
  result,
  successTitle,
  failureTitle,
  diagnostics = [],
  onSelectLine,
  showMissingLines = false,
}) => {
  const { score, missing, empty, missingLines = [] } = result;
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity !== 'error');
  const hasErrors = errors.length > 0;
  // Con un errore vero (es. nome sbagliato) il codice non compilerebbe: niente verde.
  const success = result.success && !hasErrors;
  const Icon = success ? CheckCircle2 : XCircle;

  let message;
  if (empty) message = "L'editor è vuoto: scrivi la tua implementazione prima di verificarla.";
  else if (success) message = "Il codice contiene l'implementazione di riferimento completa.";
  else if (hasErrors)
    message = `${errors.length === 1 ? "C'è 1 errore" : `Ci sono ${errors.length} errori`} da correggere (sottolineati in rosso nell'editor).`;
  else if (missing.length > 0) message = 'Mancano alcune chiamate chiave presenti nella soluzione di riferimento:';
  else message = 'Hai usato le funzioni giuste, ma la struttura non corrisponde ancora alla soluzione: ricontrolla i passaggi.';

  return (
    <div role="status" className="space-y-5">
      <div className={`border-l-2 pl-3 ${success ? 'border-l-ok' : 'border-l-err'}`}>
        <h3 className={`flex items-center gap-2 text-sm font-medium ${success ? 'text-ok' : 'text-err'}`}>
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          {success ? successTitle : failureTitle}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{message}</p>
        {!success && missing.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {missing.map((name) => (
              <code key={name} className="max-w-full break-all rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-xs text-ink">
                {name}()
              </code>
            ))}
          </div>
        )}
      </div>

      {!empty && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="eyebrow">Corrispondenza con il riferimento</span>
            <span className={`font-mono text-xs tabular-nums ${success ? 'text-ok' : 'text-ink'}`}>{score}%</span>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-label="Righe corrispondenti al riferimento"
          >
            <div className={`h-full rounded-full ${success ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}

      <DiagnosticList title="Errori" tone="err" items={errors} onSelectLine={onSelectLine} />
      <DiagnosticList title="Da controllare" tone="warn" items={warnings} onSelectLine={onSelectLine} />

      {!success && missingLines.length > 0 && (
        <div>
          <SectionLabel>
            Righe del riferimento non trovate <span className="tabular-nums">· {missingLines.length}</span>
          </SectionLabel>
          {showMissingLines ? (
            // Le righe lunghe scorrono dentro il riquadro, non allargano la pagina
            <div className="overflow-x-auto rounded-md border border-line bg-sunken">
              <ul className="w-max min-w-full divide-y divide-line">
                {missingLines.map((line) => (
                  <li key={line}>
                    <code className="block whitespace-pre px-2.5 py-1.5 font-mono text-xs text-ink-2">{line}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-3">
              Controlla i passaggi dell'algoritmo: qualcosa manca o è scritto in modo diverso.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationResult;
