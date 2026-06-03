import { useEffect, useMemo, useState } from 'react';
import { Button } from '@mrmartineau/zui/react';
import { loadTodaysPuzzle, todayISO } from './lib/loadPuzzle.js';
import { runTests } from './lib/runner.js';
import { getDayState, saveDayState, computeStreak } from './lib/storage.js';
import { Timer } from './components/Timer.jsx';
import { CodeEditor } from './components/CodeEditor.jsx';
import { TestResults } from './components/TestResults.jsx';
import { ShareCard } from './components/ShareCard.jsx';

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(null);

  const dateISO = useMemo(() => todayISO(), []);

  useEffect(() => {
    loadTodaysPuzzle(dateISO)
      .then((p) => {
        setPuzzle(p);
        setCode(p.starterCode || '');
        // Restore a completed run from earlier today, if any.
        const saved = getDayState(dateISO);
        if (saved && saved.day === p.day) {
          setResults(saved.results);
          setElapsedMs(saved.elapsedMs);
          setCode(saved.code || p.starterCode || '');
        }
      })
      .catch((e) => setLoadError(e.message || String(e)));
  }, [dateISO]);

  function handleFirstEdit() {
    if (startedAt == null && elapsedMs == null) setStartedAt(Date.now());
  }

  async function handleRun() {
    if (!puzzle) return;
    setRunning(true);
    const begun = startedAt ?? Date.now();
    if (startedAt == null) setStartedAt(begun);

    const res = await runTests(code, puzzle);
    const took = Date.now() - begun;

    setResults(res);
    setElapsedMs(took);
    setRunning(false);

    const solved = res.every((r) => r.pass);
    saveDayState(dateISO, {
      day: puzzle.day,
      results: res,
      elapsedMs: took,
      code,
      solved,
    });
  }

  function handleReset() {
    setCode(puzzle.starterCode || '');
    setResults(null);
    setElapsedMs(null);
    setStartedAt(null);
  }

  if (loadError) {
    return (
      <main className="app">
        <p className="error">Couldn't load today's puzzle: {loadError}</p>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="app">
        <p className="loading">Loading today's rep…</p>
      </main>
    );
  }

  const done = results != null;
  const streak = done ? computeStreak(dateISO) : 0;

  return (
    <main className="app">
      <header className="masthead">
        <h1 className="wordmark">Reps</h1>
        <p className="tagline">A daily rep for your coding muscles</p>
      </header>

      <section className="puzzle">
        <div className="puzzle-meta">
          <span className="puzzle-number">#{puzzle.puzzleNumber}</span>
          <span className="puzzle-title">{puzzle.title}</span>
          <Timer
            startedAt={startedAt}
            frozenMs={elapsedMs}
          />
        </div>

        <p className="prompt">{puzzle.prompt}</p>

        <CodeEditor
          value={code}
          onChange={setCode}
          onFirstEdit={handleFirstEdit}
          disabled={running}
        />

        <div className="actions">
          <Button onClick={handleRun} disabled={running}>
            {running ? 'Running…' : 'Run tests'}
          </Button>
          <Button variant="ghost" onClick={handleReset} disabled={running}>
            Reset
          </Button>
        </div>

        <TestResults results={results} />

        {done && (
          <ShareCard
            puzzle={puzzle}
            results={results}
            elapsedMs={elapsedMs}
            streak={streak}
          />
        )}
      </section>

      <footer className="footer">
        Built by <a href="https://zander.wtf">Zander Martineau</a> with <a href="https://zui.zander.wtf">ZUI</a> · puzzles are
        plain YAML, contribute one a day.
      </footer>
    </main>
  );
}
