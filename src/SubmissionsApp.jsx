import { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';
import { Button } from '@mrmartineau/zui/react';
import { runTests } from './lib/runner.js';
import { CodeEditor } from './components/CodeEditor.jsx';
import { TestResults } from './components/TestResults.jsx';
import { SolutionPanel } from './components/SolutionPanel.jsx';
import { Markdown } from './components/Markdown.jsx';

const REVEAL_STAGGER_MS = 100;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DIFFICULTY_COLOR = { easy: 'emerald', medium: 'amber', hard: 'rose' };

// Submission preview: a stripped-down clone of the main game for reviewing a
// contributed puzzle from submissions/. A <select> chooses which draft to load.
// No streaks, stats, drafts, or persistence — it's a throwaway review tool.
export function SubmissionsApp() {
  const [manifest, setManifest] = useState(null); // null = loading
  const [file, setFile] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [pendingNames, setPendingNames] = useState([]);
  const [running, setRunning] = useState(false);

  const initialFile = useMemo(
    () => new URLSearchParams(window.location.search).get('file'),
    [],
  );

  // Load the manifest of available submissions once.
  useEffect(() => {
    fetch('/submissions/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setManifest(Array.isArray(list) ? list : []);
        if (list.length) {
          const wanted = list.find((s) => s.file === initialFile);
          setFile(wanted ? wanted.file : list[0].file);
        }
      })
      .catch(() => setManifest([]));
  }, [initialFile]);

  // Load the selected submission's YAML.
  useEffect(() => {
    if (!file) return;
    setPuzzle(null);
    setLoadError(null);
    setResults(null);
    setPendingNames([]);
    fetch(`/submissions/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Couldn't fetch ${file}`);
        return r.text();
      })
      .then((text) => {
        const p = yaml.load(text);
        setPuzzle(p);
        setCode(p.starterCode || '');
      })
      .catch((e) => setLoadError(e.message || String(e)));
  }, [file]);

  async function handleRun() {
    if (!puzzle) return;
    setRunning(true);
    setResults([]);
    setPendingNames(puzzle.tests.map((t) => t.name));

    const res = await runTests(code, puzzle);
    for (let i = 0; i < res.length; i++) {
      await delay(REVEAL_STAGGER_MS);
      setResults(res.slice(0, i + 1));
      setPendingNames(puzzle.tests.slice(i + 1).map((t) => t.name));
    }
    setRunning(false);
  }

  function handleReset() {
    setCode(puzzle?.starterCode || '');
    setResults(null);
    setPendingNames([]);
  }

  return (
    <main className="app">
      <header className="masthead">
        <h1 className="wordmark">Reps</h1>
        <p className="tagline">Submission preview</p>
      </header>

      <div
        className="preview-banner"
        role="status"
      >
        <span className="zui-badge zui-badge-variant-fill zui-badge-color-violet">
          Preview
        </span>
        <span>Reviewing a contributed puzzle — not part of the live game.</span>
        <a
          className="zui-link"
          href="/"
        >
          Go to the game
        </a>
      </div>

      {manifest === null ? (
        <p className="loading">Loading submissions…</p>
      ) : manifest.length === 0 ? (
        <p className="loading">No submissions to preview yet.</p>
      ) : (
        <>
          <label className="submission-picker">
            <span className="submission-picker-label">Submission</span>
            <select
              className="zui-select"
              value={file ?? ''}
              onChange={(e) => setFile(e.target.value)}
            >
              {manifest.map((s) => (
                <option key={s.file} value={s.file}>
                  {s.title}
                  {s.difficulty ? ` — ${s.difficulty}` : ''} ({s.file})
                </option>
              ))}
            </select>
          </label>

          {loadError && <p className="error">Couldn't load submission: {loadError}</p>}

          {puzzle && !loadError && (
            <section className="puzzle">
              <div className="puzzle-meta">
                <span className="puzzle-title">{puzzle.title}</span>
                {puzzle.difficulty && (
                  <span
                    className={`zui-badge zui-badge-variant-subtle zui-badge-color-${DIFFICULTY_COLOR[puzzle.difficulty] || 'gray'} difficulty-badge`}
                  >
                    {puzzle.difficulty}
                  </span>
                )}
              </div>

              <Markdown className="prompt">{puzzle.prompt || '_No prompt._'}</Markdown>

              <CodeEditor
                value={code}
                onChange={setCode}
                disabled={running}
              />

              <SolutionPanel solution={puzzle.solution} />

              <div className="actions">
                <Button onClick={handleRun} disabled={running}>
                  {running ? 'Running…' : 'Run tests'}
                </Button>
                <Button variant="ghost" onClick={handleReset} disabled={running}>
                  Reset
                </Button>
              </div>

              <p className="run-hint">
                Tip: any <code>console.log</code> output shows beneath each test when you run.
              </p>

              <TestResults
                results={results}
                pendingNames={pendingNames}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
