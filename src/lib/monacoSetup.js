// Bundles Monaco locally (no CDN at runtime) and wires its web workers through
// Vite's `?worker` imports. Importing this module for its side effects is enough
// — it must run once before any <Editor> mounts.
//
// We import the editor API + the editor feature set + ONLY the JavaScript
// language, instead of the `monaco-editor` barrel (which ships every language —
// php, ruby, sql… — and bloats the bundle to ~4 MB). This is the only language
// the puzzles use.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { loader } from '@monaco-editor/react';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

// Themes mirror the app's light-dark() palette (see styles.css) so the editor
// blends into the card instead of looking like a pasted-in IDE.
monaco.editor.defineTheme('reps-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#1d1b16',
    'editor.foreground': '#f0ece1',
    'editorLineNumber.foreground': '#5a5648',
    'editorLineNumber.activeForeground': '#948c79',
    'editorCursor.foreground': '#e8895f',
    'editor.selectionBackground': '#3a3328',
    'editor.lineHighlightBackground': '#211f19',
  },
});

monaco.editor.defineTheme('reps-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#fffdf8',
    'editor.foreground': '#1a1813',
    'editorLineNumber.foreground': '#b3ab97',
    'editorLineNumber.activeForeground': '#6b6557',
    'editorCursor.foreground': '#b4451f',
    'editor.selectionBackground': '#e2dccd',
    'editor.lineHighlightBackground': '#f7f3ea',
  },
});

// Drop semantic squiggles (e.g. "cannot find name") — distracting for a puzzle
// where the test harness defines the contract. Keep syntax errors, which catch
// real typos. The typescript namespace registers asynchronously with the
// trimmed esm build, so this is best-effort and must never break editor setup.
function tuneDiagnostics() {
  const defaults = monaco.languages?.typescript?.javascriptDefaults;
  if (!defaults) return false;
  defaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  // Let the JS language service parse JSX so React puzzles don't light up with
  // bogus syntax errors. Harmless for the plain-JS puzzles, which contain none.
  defaults.setCompilerOptions({
    ...defaults.getCompilerOptions(),
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
  });
  return true;
}
if (!tuneDiagnostics()) {
  // Namespace not attached yet — retry once on the next tick.
  setTimeout(tuneDiagnostics, 0);
}

loader.config({ monaco });
