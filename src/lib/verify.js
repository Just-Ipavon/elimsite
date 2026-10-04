const CPP_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'return', 'sizeof', 'catch', 'main', 'int', 'double', 'float',
]);
// Parole che possono precedere una chiamata a funzione (`return foo(...)`).
const CALL_PREFIXES = new Set(['return', 'new', 'else', 'delete', 'throw']);

const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const normalize = (code) => stripComments(code).replace(/\s+/g, '');

// La parte "algoritmica" del riferimento: tutto ciò che sta tra le direttive
// iniziali e il main (che nello scheletro è diverso da quello di riferimento).
const algorithmCore = (reference) => {
  const start = reference.lastIndexOf('using namespace std;');
  const end = reference.indexOf('int main');
  return reference.slice(start === -1 ? 0 : start + 'using namespace std;'.length, end === -1 ? undefined : end);
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
  const core = algorithmCore(reference);
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

/** Firme delle funzioni globali definite nel riferimento (escluso il main). */
export const functionSignatures = (reference) =>
  [...algorithmCore(reference).matchAll(/^([A-Za-z_][\w<>,:*& ]*?[\w>*&]\s+[*&]?\w+\s*\([^)]*\))\s*\{/gm)]
    .map(([, signature]) => signature.trim())
    .filter((signature) => !/^(if|for|while|switch|else)\b/.test(signature));
