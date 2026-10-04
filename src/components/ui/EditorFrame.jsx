import Editor from '@monaco-editor/react';
import { baseEditorOptions, defineEditorThemes, useEditorTheme } from '../../lib/monacoTheme';

const Loading = () => (
  <div className="flex h-full w-full items-center justify-center bg-surface text-xs font-mono text-ink-3">
    caricamento editor…
  </div>
);

/**
 * Editor Monaco C++ con il tema dell'app. Le opzioni passate si sommano a
 * quelle di base; gli altri props vanno direttamente a <Editor>.
 */
const EditorFrame = ({ options, className = '', ...props }) => {
  const theme = useEditorTheme();
  return (
    <div className={`h-full w-full overflow-hidden bg-surface ${className}`}>
      <Editor
        height="100%"
        language="cpp"
        theme={theme}
        beforeMount={defineEditorThemes}
        loading={<Loading />}
        options={{ ...baseEditorOptions, ...options }}
        {...props}
      />
    </div>
  );
};

export default EditorFrame;
