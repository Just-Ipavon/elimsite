# Verifica del codice

Il codice C++ dello studente **non viene compilato né eseguito**: viene confrontato testualmente
con l'implementazione di riferimento (`codeReference`). La logica è divisa in due moduli:

- `src/lib/verify.js` → esito complessivo (`verifySolution`);
- `src/lib/diagnostics.js` → errori e avvisi riga per riga (`diagnoseCode`), mostrati come
  sottolineature in Monaco da `applyDiagnostics`.

## Parte confrontata

`algorithmCore(reference)` prende il testo compreso tra l'ultima direttiva `using namespace …;` e
`int main(`. Include e `main` restano fuori dal punteggio perché lo scheletro ha un `main` diverso
da quello di riferimento (il `main` ha controlli dedicati, vedi sotto).

## Normalizzazione

- Commenti rimossi (`//` e `/* … */`).
- Ogni riga viene ridotta a una forma canonica (`canonicalLine`): niente spazi, niente `}`
  iniziali e `{` finali. Così `} else {` e `}else{`, oppure un `if` con o senza graffa, si equivalgono.
- Si considerano solo le righe "significative" (più di 2 caratteri dopo la normalizzazione).

## Nomi delle funzioni liberi

`alignReference(code, reference)` permette allo studente di chiamare le proprie funzioni come
preferisce (`myCanny`, `Cammy`, `pippo`, …):

1. vengono estratte le funzioni definite nel riferimento e nel codice, con i tipi dei parametri
   (senza nomi: `const Mat &src` e `const Mat& img` sono uguali);
2. le funzioni con lo stesso nome sono già abbinate;
3. le restanti vengono abbinate solo se hanno lo stesso numero di parametri, preferendo prima
   tipi identici e poi il nome più simile (distanza di Damerau-Levenshtein);
4. nel riferimento il nome viene sostituito con quello dello studente, così definizione e chiamate
   tornano.

## Esito (`verifySolution`)

Restituisce `{ success, score, missing, missingLines }` (più `empty: true` se l'editor è vuoto):

| Campo | Significato |
| --- | --- |
| `score` | Percentuale di righe significative del riferimento presenti nel codice |
| `missing` | Funzioni chiamate dal riferimento che non compaiono nel codice (metodi, template e dichiarazioni esclusi) |
| `missingLines` | Righe del riferimento non trovate |
| `success` | Vero se tutte le righe sono presenti e nessuna funzione manca |

## Diagnostica (`diagnoseCode`)

Restituisce un elenco ordinato per riga di `{ severity, line, startColumn, endColumn, message }`.

**Errori**

- parentesi `()`, `[]`, `{}` non bilanciate;
- identificatori sconosciuti simili a un nome noto: maiuscole/minuscole sbagliate
  (`mat` → `Mat`) o errori di battitura (`ucahr` → `uchar`). Sono considerati noti le parole del
  riferimento, un elenco di parole C++/OpenCV comuni e i nomi dichiarati dallo studente;
- `size(5, 5)` al posto del costruttore `Size(5, 5)`;
- nel `main`, `imread` senza `IMREAD_GRAYSCALE` quando il riferimento lavora in scala di grigi
  (viene sottolineata la parentesi degli argomenti).

**Avvisi**

- righe (prima del `main`) che non compaiono nel riferimento. Se esiste una riga del riferimento
  simile almeno al 60%, viene sottolineata solo la parte diversa;
- il `main` non chiama la funzione principale scritta dallo studente.

Una riga che ha già un errore non riceve anche l'avviso generico.

### `revealReference`

| Area | Valore | Messaggio degli avvisi |
| --- | --- | --- |
| Pratica | `true` | "Diversa dal riferimento. Nel riferimento: `…`" |
| Esame | `false` | "Questa riga è diversa dal riferimento: controlla la parte sottolineata." |

In esame la posizione dell'errore viene mostrata, ma il codice di riferimento no.

## Limiti noti

- Implementazioni corrette ma scritte diversamente dal riferimento (ordine delle istruzioni,
  nomi di variabili diversi, cicli equivalenti) ottengono un punteggio più basso.
- Non vengono rilevati errori di tipo, di semantica o di runtime.
