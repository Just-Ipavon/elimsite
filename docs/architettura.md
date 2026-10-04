# Architettura

Applicazione React 19 + Vite 8, senza backend. Lo stile è Tailwind CSS 3 con token di colore
definiti come variabili CSS; l'editor è Monaco (`@monaco-editor/react`); il visualizzatore usa
OpenCV.js caricato da CDN.

## Avvio e routing

- `src/main.jsx` monta l'app dentro `HashRouter` e `ThemeProvider`.
- `src/App.jsx` definisce le rotte e riporta la pagina in cima a ogni cambio di percorso
  (`ScrollToTop`); è presente un link "Vai al contenuto" per la navigazione da tastiera.

| Rotta | Pagina | Voce nella barra |
| --- | --- | --- |
| `/` | `pages/Home.jsx` | — (logo) |
| `/study` | `pages/StudyArea.jsx` | Studio |
| `/ide` | `pages/IdeArea.jsx` | Pratica |
| `/exam` | `pages/ExamArea.jsx` | Esame |
| `*` | redirect a `/` | — |

`HashRouter` + `base: "/elimsite/"` in `vite.config.js` permettono di pubblicare su GitHub Pages
senza regole di rewrite.

## Pagine

### Studio (`StudyArea.jsx`)

- Editor in sola lettura con il `codeReference` dell'algoritmo scelto.
- Le `explanations` dei dati vengono convertite in intervalli di righe (`parseExplanations`,
  tramite `startMatch`/`endMatch`) ed evidenziate con una decorazione Monaco.
  Un click (o un tocco) su una zona evidenziata apre la spiegazione corrispondente.
- Schede **Spiegazione** e **Visualizzatore** su desktop; su mobile le sezioni sono impilate e la
  spiegazione si apre in un foglio a scomparsa (`components/study/ExplanationSheet.jsx`).
- Il visualizzatore esegue `runVisualAlgorithm` su Lena con i parametri dei cursori
  (`ParamControls`); ogni cursore può evidenziare nel codice la riga in cui compare la soglia.

### Pratica (`IdeArea.jsx`)

- Editor modificabile inizializzato con `cppSkeleton`, pulsante per ripristinarlo.
- Pannello laterale con due schede: **Riferimento** (codice completo) ed **Esito** della verifica.
- La verifica (pulsante o `Ctrl/⌘ + Invio`) chiama `verifySolution` e `diagnoseCode` con
  `revealReference: true`: gli avvisi suggeriscono la riga del riferimento più simile.

### Esame (`ExamArea.jsx`)

- Algoritmo estratto a caso (`pickRandomAlgo`, mai lo stesso due volte di fila con "Nuovo esame").
- Timer di 90 minuti (`EXAM_DURATION_S`), che diventa di avviso negli ultimi 5 minuti; allo
  scadere la consegna è disabilitata.
- Nessun codice di riferimento visibile: `diagnoseCode` è chiamato con `revealReference: false`.
- "Mostra risultato atteso" esegue il visualizzatore con i parametri di default.
- Su mobile timer e consegna stanno in una barra fissa in basso.

Pratica ed Esame condividono la struttura di `components/workspace/Workspace.jsx`
(`WorkspaceShell`, `EditorPanel`, `SidePane`), che registra anche la scorciatoia `Ctrl/⌘ + Invio`.

## OpenCV.js (`src/lib/opencv.js`)

- `useOpenCv()` restituisce `'loading' | 'ready' | 'error'` e scarica OpenCV.js 4.8
  (`@techstark/opencv-js` da jsDelivr) una sola volta per sessione.
- Lo script viene eseguito con `define`, `module` ed `exports` nascosti: altrimenti, se il loader
  AMD di Monaco è già presente, OpenCV si registrerebbe lì e `window.cv` non verrebbe creato.
- Timeout di caricamento: 90 s; in caso di errore un nuovo tentativo riparte da zero.
- `runVisualAlgorithm(algoId, img, canvas, params)` lavora su una copia 256×256 in scala di grigi
  (`WORK_SIZE`), così il risultato non dipende dalle dimensioni a schermo. Tutte le `cv.Mat`
  allocate vengono liberate anche in caso di eccezione.
- `defaultParams(algo)` ricava i valori iniziali dei cursori da `algo.params`.

Il visualizzatore mostra il risultato atteso con un equivalente OpenCV.js: **non** esegue il C++
scritto dallo studente.

## Tema

- `src/theme/theme.js`: contesto, hook `useTheme()` e tema iniziale (scelta salvata in
  `localStorage` con chiave `imageproc-theme`, altrimenti `prefers-color-scheme`).
- `src/theme/ThemeProvider.jsx`: applica `data-theme` su `<html>`, aggiorna il `theme-color` e salva la scelta.
- `src/index.css`: token di colore (`--bg`, `--surface`, `--ink`, `--accent`, `--ok`, `--warn`,
  `--err`, …) in formato RGB per il tema chiaro e per `[data-theme='dark']`.
- `tailwind.config.js`: espone i token come colori (`bg-surface`, `text-ink-2`, `border-line`, …)
  e definisce i font (IBM Plex Sans/Mono, Newsreader).
- `src/lib/monacoTheme.js`: temi Monaco abbinati e opzioni comuni dell'editor.

## Layout mobile

- `useIsDesktop()` (`src/lib/useIsDesktop.js`) segue lo stesso breakpoint `lg` (1024 px) di Tailwind.
- `useEditorOptions()` applica su telefono metriche compatte, niente folding e scorrimento della
  pagina con la rotella/il dito a fine editor.
- `scrollIntoViewOnMobile()` porta in vista l'esito dopo una verifica, rispettando
  `prefers-reduced-motion`.
