import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
// Side-effect: configures Monaco workers, themes, and the loader (idempotent).
import '../lib/monacoSetup.js';

function prefersDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

const LINE_HEIGHT = 20;
const V_PADDING = 16;

// A non-editable Monaco viewer — syntax highlighting and the app theme, but no
// gutter, minimap, scrollbars, or interaction. Sized to its content so it reads
// like a static code block.
export function ReadOnlyCode({ value, language = 'javascript' }) {
  const [dark, setDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChangeScheme = (e) => setDark(e.matches);
    mq.addEventListener('change', onChangeScheme);
    return () => mq.removeEventListener('change', onChangeScheme);
  }, []);

  const code = (value || '').replace(/\n+$/, '');
  const height = code.split('\n').length * LINE_HEIGHT + V_PADDING;

  return (
    <Editor
      height={height}
      language={language}
      theme={dark ? 'reps-dark' : 'reps-light'}
      value={code}
      loading={<div className="readonly-code-loading">Loading…</div>}
      onMount={(_editor, monaco) => {
        // Recompute glyph metrics once Geist Mono has actually loaded.
        const remeasure = () => monaco.editor.remeasureFonts();
        if (document.fonts?.ready) {
          document.fonts.load('13px "Geist Mono"').then(remeasure).catch(remeasure);
          document.fonts.ready.then(remeasure);
        }
      }}
      options={{
        readOnly: true,
        domReadOnly: true,
        fontFamily: 'var(--font-code)',
        fontLigatures: false,
        fontSize: 13,
        lineHeight: LINE_HEIGHT,
        tabSize: 2,
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        minimap: { enabled: false },
        renderLineHighlight: 'none',
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0,
        contextmenu: false,
        guides: { indentation: false },
        padding: { top: 8, bottom: 8 },
        automaticLayout: true,
        scrollbar: {
          vertical: 'hidden',
          horizontalScrollbarSize: 8,
          handleMouseWheel: false,
          alwaysConsumeMouseWheel: false,
        },
      }}
    />
  );
}
