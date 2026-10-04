const CPP_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'return', 'sizeof', 'catch', 'main', 'int', 'double', 'float',
]);
// Parole che possono precedere una chiamata a funzione (`return foo(...)`).
const CALL_PREFIXES = new Set(['return', 'new', 'else', 'delete', 'throw']);

const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const normalize = (code) => stripComments(code).replace(/\s+/g, '');

// La parte "algoritmica" del riferimento: tutto ciò che sta tra l'ultima
// direttiva `using namespace` (in qualunque ordine) e il main, che nello
// scheletro è diverso da quello di riferimento.
export const algorithmCore = (reference) => {
  const directives = [...reference.matchAll(/using\s+namespace\s+\w+\s*;/g)];
  const last = directives.at(-1);
  const start = last ? last.index + last[0].length : 0;
  const end = reference.search(/\bint\s+main\s*\(/);
  return reference.slice(start, end === -1 ? undefined : end);
};

// Distanza di edit con scambio di due lettere adiacenti (Damerau).
export const editDistance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
};

export const similarity = (a, b) => 1 - editDistance(a, b) / Math.max(a.length, b.length, 1);

// Funzioni definite nel codice: nome e tipi dei parametri (senza i nomi,
// così `const Mat &src` e `const Mat& img` risultano uguali).
const definedFunctions = (code) =>
  [...stripComments(code).matchAll(/^[ \t]*(?:static\s+|inline\s+)*[A-Za-z_][\w<>:,]*[\s*&]+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?\{/gm)]
    .map(([, name, params]) => ({
      name,
      types: params
        .split(',')
        // `const Mat &src` → `const Mat &`; un parametro senza nome (`int`) resta com'è.
        .map((param) => param.trim().match(/^(.*[\s*&>])[A-Za-z_]\w*(\[[^\]]*\])?$/)?.[1] ?? param.trim())
        .map((type) => type.replace(/\s+/g, ''))
        .filter(Boolean),
    }))
    .filter(({ name }) => !['main', 'if', 'for', 'while', 'switch'].includes(name));

/**
 * Tolleranza sui nomi delle funzioni: lo studente può chiamare le sue funzioni
 * come vuole (`Canny`, `Cammy`, `pippo`...). Ogni sua funzione viene abbinata
 * a una del riferimento con lo stesso numero di parametri, preferendo quella
 * con gli stessi tipi e poi quella con il nome più simile; nel riferimento il
 * nome viene poi sostituito con il suo, così definizione e chiamate tornano.
 */
export const alignReference = (code, reference) => {
  const refFns = definedFunctions(algorithmCore(reference));
  const refNames = new Set(refFns.map(({ name }) => name));
  const userFns = definedFunctions(code);
  const userNames = new Set(userFns.map(({ name }) => name));

  // Funzioni con lo stesso nome: già a posto.
  const freeRef = refFns.filter(({ name }) => !userNames.has(name));
  const freeUser = userFns.filter(({ name }) => !refNames.has(name));

  // Tutte le coppie possibili, dalla più convincente alla meno convincente.
  const pairs = [];
  for (const userFn of freeUser) {
    for (const refFn of freeRef) {
      if (refFn.types.length !== userFn.types.length) continue;
      const sameTypes = refFn.types.join(',') === userFn.types.join(',');
      const score = (sameTypes ? 2 : 1) + similarity(userFn.name.toLowerCase(), refFn.name.toLowerCase());
      pairs.push({ userFn, refFn, score });
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  const usedUser = new Set();
  const usedRef = new Set();
  let aligned = reference;
  for (const { userFn, refFn } of pairs) {
    if (usedUser.has(userFn.name) || usedRef.has(refFn.name)) continue;
    usedUser.add(userFn.name);
    usedRef.add(refFn.name);
    aligned = aligned.replace(new RegExp(`\\b${refFn.name}\\b(?=\\s*\\()`, 'g'), userFn.name);
  }
  return aligned;
};

// Vero se la parentesi aperta in `openIdx - 1` chiude una firma seguita da `{`.
const isDefinition = (code, openIdx) => {
  let depth = 1;
  let i = openIdx;
  while (i < code.length && depth > 0) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') depth -= 1;
    i += 1;
  }
  return /^\s*(const\s*)?\{/.test(code.slice(i, i + 16));
};

// Funzioni libere/costruttori chiamati nel codice. Si escludono metodi
// (`obj.f(`, `ptr->f(`), argomenti template e dichiarazioni (`Mat votes(...)`).
const calledFunctions = (code) => {
  const clean = stripComments(code);
  const names = new Set();
  for (const match of clean.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
    const name = match[1];
    if (CPP_KEYWORDS.has(name)) continue;
    const before = clean.slice(0, match.index).trimEnd();
    const prevChar = before.at(-1);
    if (prevChar === '.' || prevChar === '>' || prevChar === '<') continue;
    const prevWord = before.match(/(\w+)$/)?.[1];
    if (prevWord && !CALL_PREFIXES.has(prevWord)) continue;
    if (isDefinition(clean, match.index + match[0].length)) continue;
    names.add(name);
  }
  return names;
};

const meaningfulLines = (code) =>
  stripComments(code)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ''))
    .filter((line) => line.length > 2);

/**
 * Confronta il codice dello studente con l'implementazione di riferimento.
 * Restituisce { success, score, missing } dove `score` è la percentuale di
 * righe significative del riferimento presenti nel codice e `missing` sono
 * le funzioni chiamate dal riferimento che non compaiono nel codice.
 */
export const verifySolution = (code, reference) => {
  const core = algorithmCore(alignReference(code, reference));
  const userNorm = normalize(code);
  const coreNorm = normalize(core);

  if (!userNorm) return { success: false, score: 0, missing: [], empty: true };

  const userCalls = calledFunctions(code);
  const missing = [...calledFunctions(core)].filter((name) => !userCalls.has(name));

  const userLines = new Set(meaningfulLines(code));
  const refLines = meaningfulLines(core);
  const matched = refLines.filter((line) => userLines.has(line)).length;
  const score = refLines.length ? Math.round((matched / refLines.length) * 100) : 0;

  return { success: coreNorm.length > 0 && userNorm.includes(coreNorm), score, missing };
};
