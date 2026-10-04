# Aggiungere un algoritmo

Ogni algoritmo è un oggetto dell'array `algorithms` in `src/data/algorithms.js`. Studio, Pratica
ed Esame lo mostrano automaticamente; il visualizzatore richiede in più un caso in
`src/lib/opencv.js`.

## 1. Dati (`src/data/algorithms.js`)

```js
{
  id: "mio_algoritmo",              // usato anche da runVisualAlgorithm
  name: "Mio Algoritmo",
  params: [                         // facoltativo: cursori del visualizzatore
    {
      key: "th",                    // chiave in params di runVisualAlgorithm
      label: "Soglia",
      min: 0, max: 255, step: 1,
      default: 100,                 // stesso valore del codice C++
      code: "mioAlgoritmo(src, dst, 100);", // riga evidenziata da "Mostra nel codice"
    },
  ],
  description: "Che cosa fa e come ricordarlo.",
  steps: ["Passo 1…", "Passo 2…"],  // sezione "Come funziona" nello Studio
  explanations: [
    {
      startMatch: "void mioAlgoritmo(",  // testo esatto in codeReference: prima riga del blocco
      endMatch: "return;",               // facoltativo: ultima riga (cercata dopo startMatch)
      title: "Titolo del blocco",
      text: "Spiegazione.",
      points: ["…"],                     // facoltativo: elenco puntato
      note: "…",                         // facoltativo: nota a margine
    },
  ],
  codeReference: `#include <opencv2/opencv.hpp>
…
using namespace cv;
using namespace std;

void mioAlgoritmo(const Mat &src, Mat &dst, int th) { … }

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    …
}`,
  cppSkeleton: baseTemplate,        // codice iniziale dell'editor in Pratica ed Esame
}
```

Regole da rispettare:

- `startMatch`/`endMatch` devono comparire **testualmente** in `codeReference`, altrimenti il
  blocco viene ignorato senza errori.
- La parte confrontata dalla verifica va dall'ultimo `using namespace` a `int main(`: mettere lì
  tutte le funzioni dell'algoritmo.
- Se il `main` di riferimento usa `IMREAD_GRAYSCALE`, la diagnostica segnala come errore un
  `imread` senza questo flag nel codice dello studente.
- Le funzioni chiamate nel `main` di riferimento devono essere chiamate anche dallo studente
  (altrimenti compare un avviso).
- Il campo `code` dei parametri deve essere una riga presente in `codeReference`.

## 2. Visualizzatore (`src/lib/opencv.js`)

Aggiungere un `case` con lo stesso `id` nello `switch` di `runVisualAlgorithm`:

```js
case 'mio_algoritmo': {
  const out = track(new cv.Mat());          // ogni Mat va registrata con track()
  cv.threshold(gray, out, p('th', 100), 255, cv.THRESH_BINARY);
  dst = out;
  break;
}
```

- `gray` è Lena 256×256 in scala di grigi; `p(key, fallback)` legge il valore del cursore.
- Le `Mat` registrate con `track` vengono liberate automaticamente.
- Senza un `case` il visualizzatore non mostra nulla per quell'algoritmo.

## 3. Controlli

```bash
npm run lint
npm run dev
```

Verificare a mano che:

1. nello Studio tutti i blocchi delle spiegazioni siano evidenziati e cliccabili;
2. in Pratica, incollando `codeReference` nell'editor, la verifica dia 100% e nessun avviso;
3. il visualizzatore produca un risultato con i parametri di default.
