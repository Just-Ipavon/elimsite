# ImageProc – OpenCV C++ Study Hub

Hub di studio interattivo per gli algoritmi di elaborazione delle immagini in OpenCV C++
(Canny, Harris, Hough cerchi/rette, K-means, Otsu, Otsu multilivello, Region Growing, Split and Merge).

- **Studio** – codice C++ di riferimento con spiegazioni cliccabili e visualizzatore OpenCV.js sull'immagine di Lena.
- **IDE** – editor Monaco per scrivere la propria implementazione e confrontarla con il riferimento.
- **Esame** – algoritmo estratto a caso, timer di 90 minuti e nessuna soluzione visibile.

## Sviluppo

```bash
npm install
npm run dev      # server di sviluppo
npm run lint     # ESLint
npm run build    # build di produzione in dist/
npm run deploy   # pubblica dist/ su GitHub Pages
```

Il sito è servito sotto `/elimsite/` (vedi `base` in `vite.config.js`) e usa `HashRouter`,
quindi funziona su GitHub Pages senza configurazioni aggiuntive.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `src/data/algorithms.js` | Algoritmi: descrizione, codice di riferimento, scheletro e spiegazioni |
| `src/lib/opencv.js` | Caricamento di OpenCV.js ed equivalenti visivi degli algoritmi |
| `src/lib/verify.js` | Confronto tra il codice dello studente e il riferimento |
| `src/lib/monacoTheme.js` | Tema Dracula e opzioni condivise per l'editor |
| `src/pages/` | Pagine Home, Studio, IDE ed Esame |

## Note

La verifica del codice è un confronto testuale (commenti e spazi esclusi) con la parte algoritmica
dell'implementazione di riferimento: il codice C++ non viene compilato né eseguito.
