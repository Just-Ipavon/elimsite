# ImageProc – OpenCV C++ Study Hub

Hub di studio interattivo per gli algoritmi di elaborazione delle immagini in OpenCV C++:
Canny, Harris, Hough (cerchi e rette), K-means, Otsu, Otsu multilivello, Region Growing e Split and Merge.

| Area | Percorso | Cosa offre |
| --- | --- | --- |
| **Studio** | `#/study` | Codice C++ di riferimento con blocchi evidenziati e spiegazioni cliccabili, sezione "Come funziona" e visualizzatore OpenCV.js su Lena con soglie regolabili. |
| **Pratica** | `#/ide` | Editor Monaco per scrivere la propria implementazione, riferimento consultabile a fianco, verifica con punteggio ed errori sottolineati nel codice. |
| **Esame** | `#/exam` | Algoritmo estratto a caso, timer di 90 minuti, nessuna soluzione visibile: gli errori vengono segnalati senza rivelare le righe del riferimento. |

Altre caratteristiche:

- tema chiaro/scuro (segue il sistema, la scelta viene salvata nel browser);
- layout a tutta larghezza su desktop e versione mobile dedicata (pannelli impilati, spiegazioni in un foglio a scomparsa, barra fissa con timer e consegna in esame);
- nessun backend: tutto gira nel browser, OpenCV.js (4.8, WebAssembly) viene scaricato da jsDelivr all'apertura di Studio o Esame.

## Avvio rapido

Requisiti: Node.js 20.19+ o 22.12+ (richiesto da Vite 8).

```bash
npm install
npm run dev      # server di sviluppo (http://localhost:5173/elimsite/)
npm run lint     # ESLint
npm run build    # build di produzione in dist/
npm run preview  # anteprima locale della build
npm run deploy   # build + pubblicazione di dist/ su GitHub Pages (branch gh-pages)
```

Il sito è servito sotto `/elimsite/` (vedi `base` in `vite.config.js`) e usa `HashRouter`,
quindi funziona su GitHub Pages senza configurazioni aggiuntive.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `src/data/algorithms.js` | Algoritmi: descrizione, passaggi, parametri, codice di riferimento, scheletro e spiegazioni |
| `src/lib/opencv.js` | Caricamento di OpenCV.js ed equivalenti visivi degli algoritmi (immagine di lavoro 256×256) |
| `src/lib/verify.js` | Confronto tra il codice dello studente e il riferimento (punteggio, funzioni e righe mancanti) |
| `src/lib/diagnostics.js` | Errori e avvisi riga per riga, mostrati come sottolineature in Monaco |
| `src/lib/monacoTheme.js` | Temi chiaro/scuro e opzioni condivise per l'editor |
| `src/lib/useIsDesktop.js` | Breakpoint desktop/mobile e opzioni compatte dell'editor su telefono |
| `src/components/ui/` | Componenti di base (pannello, editor, avvisi, scelta dell'algoritmo) |
| `src/components/study/` | Pannello delle spiegazioni (desktop) e foglio a scomparsa (mobile) |
| `src/components/workspace/` | Struttura comune a Pratica ed Esame (editor + pannello laterale) |
| `src/components/` | Barra di navigazione, cursori dei parametri, esito della verifica |
| `src/theme/` | Tema chiaro/scuro e relativo contesto React |
| `src/pages/` | Pagine Home, Studio, Pratica (IDE) ed Esame |

## Documentazione

- [Architettura](docs/architettura.md) – pagine, routing, tema, layout mobile e caricamento di OpenCV.js.
- [Verifica del codice](docs/verifica.md) – come vengono calcolati punteggio, errori e avvisi.
- [Aggiungere un algoritmo](docs/aggiungere-un-algoritmo.md) – formato dei dati e passi necessari.

## Note

La verifica è un confronto testuale con la parte algoritmica dell'implementazione di riferimento
(commenti e spazi esclusi, graffe opzionali, nomi delle funzioni liberi): il codice C++ **non viene
compilato né eseguito**. Il visualizzatore mostra il risultato atteso con un equivalente OpenCV.js,
non l'output del codice scritto dallo studente.
