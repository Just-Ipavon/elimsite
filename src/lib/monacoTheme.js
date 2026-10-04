export const DRACULA_THEME = 'dracula';

// Monaco tema Dracula condiviso da tutti gli editor dell'app.
export const defineDraculaTheme = (monaco) => {
  monaco.editor.defineTheme(DRACULA_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'f8f8f2', background: '282a36' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'constant', foreground: 'bd93f9' },
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#44475a',
      'editor.lineHighlightBackground': '#44475a80',
      'editorLineNumber.foreground': '#6272a4',
      'editorCursor.foreground': '#f8f8f2',
    },
  });
};

export const baseEditorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "'Fira Code', 'Monaco', monospace",
  fontLigatures: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
};
