import { useTheme } from '../theme/theme';

const LIGHT = 'imageproc-light';
const DARK = 'imageproc-dark';

// Temi Monaco allineati ai token di index.css: sintassi sobria, un solo accento caldo.
export const defineEditorThemes = (monaco) => {
  monaco.editor.defineTheme(LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '1c1b19' },
      { token: 'comment', foreground: '8a867c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'b4400f' },
      { token: 'type', foreground: '1f5f8b' },
      { token: 'string', foreground: '3d7a2a' },
      { token: 'number', foreground: '7a3fb0' },
      { token: 'constant', foreground: '7a3fb0' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1c1b19',
      'editor.lineHighlightBackground': '#f4f2ee',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#f2d6c4',
      'editor.inactiveSelectionBackground': '#f4e6dc',
      'editorLineNumber.foreground': '#b9b5ab',
      'editorLineNumber.activeForeground': '#57544d',
      'editorCursor.foreground': '#c2410c',
      'editorIndentGuide.background1': '#eeece6',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e4e1da',
    },
  });

  monaco.editor.defineTheme(DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ecebe6' },
      { token: 'comment', foreground: '7d7a72', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f39a6b' },
      { token: 'type', foreground: '8fc1e3' },
      { token: 'string', foreground: 'a9d18e' },
      { token: 'number', foreground: 'c9a6f0' },
      { token: 'constant', foreground: 'c9a6f0' },
    ],
    colors: {
      'editor.background': '#1b1b19',
      'editor.foreground': '#ecebe6',
      'editor.lineHighlightBackground': '#232320',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#5a3420',
      'editor.inactiveSelectionBackground': '#3a2a20',
      'editorLineNumber.foreground': '#4d4b46',
      'editorLineNumber.activeForeground': '#a8a59c',
      'editorCursor.foreground': '#f07a3c',
      'editorIndentGuide.background1': '#2a2a27',
      'editorWidget.background': '#1b1b19',
      'editorWidget.border': '#2e2d2a',
    },
  });
};

/** Nome del tema Monaco che corrisponde al tema dell'app. */
export const useEditorTheme = () => (useTheme().theme === 'dark' ? DARK : LIGHT);

export const baseEditorOptions = {
  minimap: { enabled: false },
  fontSize: 13.5,
  lineHeight: 21,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  renderLineHighlight: 'line',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
  guides: { indentation: true },
  padding: { top: 14, bottom: 14 },
};
