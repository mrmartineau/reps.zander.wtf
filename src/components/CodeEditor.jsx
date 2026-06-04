import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
// Side-effect import: configures Monaco workers, themes, and the loader.
import '../lib/monacoSetup.js';

function prefersDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

// Monaco-backed editor: syntax highlighting, bracket matching, multi-cursor,
// the usual. Keeps the original component's contract (value / onChange /
// onFirstEdit / disabled) so App.jsx is unchanged.
export function CodeEditor({ value, onChange, onFirstEdit, disabled }) {
  const touched = useRef(false);
  const [dark, setDark] = useState(prefersDark);

  // Follow the system colour scheme, matching the app's light-dark() theming.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChangeScheme = (e) => setDark(e.matches);
    mq.addEventListener('change', onChangeScheme);
    return () => mq.removeEventListener('change', onChangeScheme);
  }, []);

  // The wrapper suppresses onChange for programmatic value updates (initial load,
  // Reset), so this only fires on genuine user edits — exactly what arms the timer.
  function handleChange(next) {
    if (!touched.current) {
      touched.current = true;
      onFirstEdit?.();
    }
    onChange(next ?? '');
  }

  return (
    <div className="editor-shell">
      <div className="editor-lang">
        <span className="editor-lang-dot" aria-hidden="true" />
        JavaScript
      </div>
      <Editor
        height="260px"
        language="javascript"
        theme={dark ? 'reps-dark' : 'reps-light'}
        value={value}
        onChange={handleChange}
        onMount={(_editor, monaco) => {
          // Monaco caches glyph metrics at mount. If Geist Mono is still
          // loading then, it measures with a fallback and the caret/selection
          // drift. Remeasure once the webfont is actually ready.
          const remeasure = () => monaco.editor.remeasureFonts();
          if (document.fonts?.ready) {
            document.fonts.load('14px "Geist Mono"').then(remeasure).catch(remeasure);
            document.fonts.ready.then(remeasure);
          }
        }}
        loading={<div className="editor-loading">Loading editor…</div>}
        options={{
          readOnly: disabled,
          fontFamily: "var(--font-code)",
          fontLigatures: false,
          fontSize: 14,
          lineHeight: 22,
          tabSize: 2,
          insertSpaces: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: 'line',
          automaticLayout: true,
          fixedOverflowWidgets: true,
          overviewRulerLanes: 0,
          smoothScrolling: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
