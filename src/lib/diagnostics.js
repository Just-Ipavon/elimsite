import { algorithmCore, alignReference, canonicalLine, editDistance, similarity } from './verify.js';

// Analisi "statica" del codice dello studente: il C++ non viene compilato,
// quindi gli errori si cercano confrontandolo con il riferimento.
//  - errori: parentesi non bilanciate, nomi scritti male (`ucahr`, `inst`,
//    `mat`) e `size(...)` usato al posto del costruttore `Size(...)`;
//  - avvisi: righe che non compaiono nel riferimento, con la riga più simile
//    come suggerimento (solo se `revealReference` è vero, quindi non in esame).

const CPP_WORDS = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'const', 'static',
  'void', 'int', 'float', 'double', 'char', 'bool', 'long', 'short', 'unsigned', 'signed', 'auto', 'true',
  'false', 'new', 'delete', 'nullptr', 'class', 'struct', 'public', 'private', 'protected', 'this', 'using',
  'namespace', 'std', 'cv', 'include', 'define', 'sizeof', 'main', 'argc', 'argv', 'String', 'string', 'cout',
  'cin', 'endl', 'printf', 'exit', 'abs', 'sqrt', 'pow', 'min', 'max', 'round', 'cos', 'sin', 'atan2', 'vector',
  'stack', 'queue', 'size', 'push', 'pop', 'top', 'empty', 'clone', 'rows', 'cols', 'at', 'data', 'type',
  'imread', 'imshow', 'waitKey', 'IMREAD_GRAYSCALE', 'IMREAD_COLOR', 'Mat', 'Size', 'Point', 'Scalar', 'Rect',
  'Vec3b', 'uchar', 'CV_8U', 'CV_8UC1', 'CV_8UC3', 'CV_32F', 'CV_32FC1', 'CV_PI', 'zeros', 'ones',
];
const TYPE_WORDS = /^(?:const\s+)?(?:unsigned\s+)?(?:void|int|float|double|uchar|char|bool|long|auto|Mat|Point|Scalar|Rect|Size|Vec3b|String|string|[A-Z]\w*\*?|vector<.+?>|stack<.+?>)\s*[&*]?\s+/;

// Commenti sostituiti da spazi: righe e colonne restano invariate.
const blankComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length));

const position = (code, index) => {
  const before = code.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - before.lastIndexOf('\n') };
};

const checkBrackets = (clean) => {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  const issues = [];
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch, i });
    else if (pairs[ch]) {
      const open = stack.pop();
      if (!open || open.ch !== pairs[ch]) {
        issues.push({ index: i, message: `Parentesi \`${ch}\` senza la corrispondente \`${pairs[ch]}\`.` });
        if (open) stack.push(open);
      }
    }
  }
  stack.forEach(({ ch, i }) => issues.push({ index: i, message: `Parentesi \`${ch}\` aperta e mai chiusa.` }));
  return issues.map(({ index, message }) => {
    const { line, column } = position(clean, index);
    return { severity: 'error', line, startColumn: column, endColumn: column + 1, message };
  });
};

// Nomi dichiarati dallo studente (variabili, parametri, funzioni): non vanno
// segnalati come errori di battitura anche se somigliano a nomi noti.
const declaredNames = (clean) => {
  const names = new Set();
  for (const raw of clean.split(/[;{}()]/)) {
    for (const part of raw.split(',')) {
      const decl = part.trim().replace(TYPE_WORDS, '');
      if (decl !== part.trim()) {
        const name = decl.match(/^[*&]?\s*([A-Za-z_]\w*)/)?.[1];
        if (name) names.add(name);
      }
    }
  }
  // Anche i nomi successivi in `Mat a, b, c;`.
  for (const match of clean.matchAll(/^\s*(?:const\s+)?[A-Za-z_][\w<>:]*\s+([^;=(]+);/gm)) {
    match[1].split(',').forEach((n) => {
      const name = n.trim().match(/^[*&]?\s*([A-Za-z_]\w*)/)?.[1];
      if (name) names.add(name);
    });
  }
  return names;
};

const checkIdentifiers = (clean, reference) => {
  const known = new Set(CPP_WORDS);
  for (const [word] of blankComments(reference).matchAll(/[A-Za-z_]\w*/g)) known.add(word);
  const declared = declaredNames(clean);
  const knownList = [...known];
  const verdicts = new Map();
  const diagnostics = [];

  for (const match of clean.matchAll(/[A-Za-z_]\w*/g)) {
    const word = match[0];
    if (known.has(word) || declared.has(word)) continue;
    if (!verdicts.has(word)) {
      const sameCase = knownList.find((k) => k.toLowerCase() === word.toLowerCase());
      let hint = null;
      if (sameCase) hint = `Attenzione a maiuscole e minuscole: forse \`${sameCase}\`?`;
      else if (word.length >= 3) {
        const maxDist = word.length >= 5 ? 2 : 1;
        let close = null;
        let closeDist = Infinity;
        for (const k of knownList) {
          if (k.length < 3 || Math.abs(k.length - word.length) > maxDist) continue;
          const dist = editDistance(word, k);
          // A parità di distanza si preferisce il nome lungo quanto la parola scritta.
          if (dist < closeDist || (dist === closeDist && k.length === word.length)) {
            close = k;
            closeDist = dist;
          }
        }
        if (closeDist > maxDist) close = null;
        if (close) hint = `\`${word}\` non è definito: forse volevi scrivere \`${close}\`?`;
      }
      verdicts.set(word, hint);
    }
    const hint = verdicts.get(word);
    if (!hint) continue;
    const { line, column } = position(clean, match.index);
    diagnostics.push({ severity: 'error', line, startColumn: column, endColumn: column + word.length, message: hint });
  }

  // `size(5, 5)` al posto del costruttore `Size(5, 5)` (`.size()` è invece un metodo valido).
  for (const match of clean.matchAll(/(^|[^.\w>])(size)\s*\(\s*\d/g)) {
    const { line, column } = position(clean, match.index + match[1].length);
    diagnostics.push({
      severity: 'error',
      line,
      startColumn: column,
      endColumn: column + 4,
      message: 'Il costruttore della dimensione si scrive `Size` con la S maiuscola (es. `Size(5, 5)`).',
    });
  }
  return diagnostics;
};

// Colonne (1-based) dei caratteri non spazio di una riga.
const nonSpaceColumns = (line) => [...line].flatMap((ch, i) => (/\s/.test(ch) ? [] : [i + 1]));

const checkLines = (clean, reference, revealReference) => {
  const refLines = blankComments(algorithmCore(reference))
    .split('\n')
    .map((raw) => ({ raw: raw.trim(), norm: canonicalLine(raw) }))
    .filter(({ norm }) => norm.length > 2);
  const refSet = new Set(refLines.map(({ norm }) => norm));

  const mainIndex = clean.search(/\bint\s+main\s*\(/);
  const scope = mainIndex === -1 ? clean : clean.slice(0, mainIndex);
  const diagnostics = [];

  scope.split('\n').forEach((raw, idx) => {
    const norm = canonicalLine(raw);
    if (norm.length <= 2 || refSet.has(norm) || /^#|^usingnamespace/.test(norm)) return;

    let best = null;
    let bestScore = 0;
    for (const ref of refLines) {
      const score = similarity(norm, ref.norm);
      if (score > bestScore) {
        bestScore = score;
        best = ref;
      }
    }

    const trimmed = raw.replace(/^\s*\}+/, (m) => ' '.repeat(m.length)).replace(/\{+\s*$/, (m) => ' '.repeat(m.length));
    const cols = nonSpaceColumns(trimmed);
    let startColumn = cols[0];
    let endColumn = cols[cols.length - 1] + 1;
    let message = 'Questa riga non compare nel codice di riferimento: controllala.';

    if (best && bestScore >= 0.6) {
      // Si sottolinea solo la parte diversa (prefisso e suffisso comuni esclusi).
      const studentNorm = trimmed.replace(/\s+/g, '');
      let pre = 0;
      while (pre < studentNorm.length && pre < best.norm.length && studentNorm[pre] === best.norm[pre]) pre += 1;
      let suf = 0;
      while (
        suf < studentNorm.length - pre &&
        suf < best.norm.length - pre &&
        studentNorm[studentNorm.length - 1 - suf] === best.norm[best.norm.length - 1 - suf]
      ) suf += 1;
      const from = Math.min(pre, cols.length - 1);
      const to = Math.max(from, studentNorm.length - suf - 1);
      startColumn = cols[from];
      endColumn = cols[Math.min(to, cols.length - 1)] + 1;
      message = revealReference
        ? `Diversa dal riferimento. Nel riferimento: \`${best.raw}\``
        : 'Questa riga è diversa dal riferimento: controlla la parte sottolineata.';
    } else if (!revealReference) {
      message = 'Questa riga non corrisponde al riferimento: controllala.';
    }

    diagnostics.push({ severity: 'warning', line: idx + 1, startColumn, endColumn, message });
  });
  return diagnostics;
};

// Controlli sul main: deve leggere l'immagine come nel riferimento (es. in
// scala di grigi) e chiamare la funzione principale scritta dallo studente.
const checkMain = (clean, reference) => {
  const mainIndex = clean.search(/\bint\s+main\s*\(/);
  const refMainIndex = reference.search(/\bint\s+main\s*\(/);
  if (mainIndex === -1 || refMainIndex === -1) return [];
  const main = clean.slice(mainIndex);
  const refMain = reference.slice(refMainIndex);
  const lineOf = (offset) => clean.slice(0, mainIndex + offset).split('\n').length;
  const diagnostics = [];

  const imread = main.match(/imread\s*(\(([^;]*)\))\s*;/);
  if (imread && /IMREAD_GRAYSCALE/.test(refMain) && !/IMREAD_GRAYSCALE|IMREAD_REDUCED_GRAYSCALE|,\s*0\s*$/.test(imread[2])) {
    // Si sottolinea la parentesi degli argomenti: è lì che manca IMREAD_GRAYSCALE.
    const argsOffset = imread.index + imread[0].indexOf(imread[1]);
    const { line, column } = position(clean, mainIndex + argsOffset);
    diagnostics.push({
      severity: 'error',
      line,
      startColumn: column,
      endColumn: column + imread[1].split('\n')[0].length,
      message: "Manca `IMREAD_GRAYSCALE`: l'algoritmo lavora su un solo canale, scrivi `imread(argv[1], IMREAD_GRAYSCALE)`.",
    });
  }

  // Funzioni del riferimento chiamate nel main (es. myCanny), già rinominate
  // con i nomi dello studente da alignReference.
  const ownFunctions = new Set(
    [...algorithmCore(reference).matchAll(/^[A-Za-z_][\w<>:,*& ]*[\s*&]([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/gm)].map((m) => m[1]),
  );
  for (const [, name] of refMain.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
    if (!ownFunctions.has(name) || new RegExp(`\\b${name}\\s*\\(`).test(main)) continue;
    diagnostics.push({
      severity: 'warning',
      line: lineOf(0),
      startColumn: 1,
      endColumn: 9,
      message: `Il main non chiama mai \`${name}\`: così la tua implementazione non viene eseguita.`,
    });
  }
  return diagnostics;
};

/**
 * Restituisce gli errori e gli avvisi trovati nel codice dello studente,
 * ordinati per riga: { severity: 'error'|'warning', line, startColumn,
 * endColumn, message }.
 */
export const diagnoseCode = (code, originalReference, { revealReference = true } = {}) => {
  if (!code.trim()) return [];
  // Le funzioni dello studente con un nome diverso valgono come quelle del riferimento.
  const reference = alignReference(code, originalReference);
  const clean = blankComments(code);
  const errors = [...checkBrackets(clean), ...checkIdentifiers(clean, reference), ...checkMain(clean, reference)];
  const errorLines = new Set(errors.map((d) => d.line));
  // Una riga con un errore vero non riceve anche l'avviso generico.
  const warnings = checkLines(clean, reference, revealReference).filter((d) => !errorLines.has(d.line));
  return [...errors, ...warnings].sort((a, b) => a.line - b.line || a.startColumn - b.startColumn);
};

/** Mostra i risultati di `diagnoseCode` come sottolineature nell'editor Monaco. */
export const applyDiagnostics = (monaco, editor, diagnostics) => {
  const model = editor?.getModel();
  if (!monaco || !model) return;
  monaco.editor.setModelMarkers(
    model,
    'verifica',
    diagnostics.map((d) => ({
      severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      startLineNumber: d.line,
      endLineNumber: d.line,
      startColumn: d.startColumn,
      endColumn: d.endColumn,
      message: d.message,
    })),
  );
};
