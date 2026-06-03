import { useEffect, useMemo, useState } from 'react';
import { Button } from '@mrmartineau/zui/react';
import {
  loadTodaysPuzzle,
  loadPuzzleByDay,
  getPreviewParams,
  todayISO,
} from './lib/loadPuzzle.js';
import { runTests } from './lib/runner.js';
import { charCount } from './lib/share.js';
import { getDayState, saveDayState, computeStreak, computeStats } from './lib/storage.js';
import { Timer } from './components/Timer.jsx';
import { CodeEditor } from './components/CodeEditor.jsx';
import { TestResults } from './components/TestResults.jsx';
import { ShareCard } from './components/ShareCard.jsx';
import { HelpDialog } from './components/HelpDialog.jsx';
import { SolutionPanel } from './components/SolutionPanel.jsx';
import { StatsDialog } from './components/StatsDialog.jsx';

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState(null);

  // Snapshot stats from localStorage whenever the overlay is opened.
  function openStats() {
    setStats(computeStats(dateISO));
    setStatsOpen(true);
  }

  const dateISO = useMemo(() => todayISO(), []);
  const preview = useMemo(() => getPreviewParams(), []);

  useEffect(() => {
    const load = preview
      ? preview.kind === 'day'
        ? loadPuzzleByDay(preview.day)
        : loadTodaysPuzzle(preview.date, { preview: true })
      : loadTodaysPuzzle(dateISO);

    load
      .then((p) => {
        setPuzzle(p);
        setCode(p.starterCode || '');
        // Restore a completed run from earlier today — never in preview mode,
        // so testing an upcoming puzzle can't read or clobber real progress.
        if (p.preview) return;
        const saved = getDayState(dateISO);
        if (saved && saved.day === p.day) {
          setResults(saved.results);
          setElapsedMs(saved.elapsedMs);
          setCode(saved.code || p.starterCode || '');
        }
      })
      .catch((e) => setLoadError(e.message || String(e)));
  }, [dateISO, preview]);

  // Wordle-style: show the rules automatically the first time someone visits,
  // then never again (unless they tap the ? button). Preview sessions skip it.
  useEffect(() => {
    if (preview) return;
    try {
      if (!localStorage.getItem('reps:seenHelp')) {
        setHelpOpen(true);
        localStorage.setItem('reps:seenHelp', '1');
      }
    } catch {
      /* storage blocked — just don't auto-open */
    }
  }, [preview]);

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

    // Preview runs are throwaway — don't persist to the daily state or streak.
    if (puzzle.preview) return;

    const solved = res.every((r) => r.pass);
    saveDayState(dateISO, {
      day: puzzle.day,
      title: puzzle.title,
      results: res,
      elapsedMs: took,
      code,
      chars: charCount(code),
      solved,
    });

    // Reveal the stats overlay once a solve lands, the way Wordle does.
    if (solved) openStats();
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
        <div className="masthead-actions">
          <button
            type="button"
            className="zui-button zui-button-variant-ghost zui-button-icon"
            aria-label="Statistics"
            title="Statistics"
            onClick={openStats}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="20" x2="6" y2="13" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="18" y1="20" x2="18" y2="9" />
            </svg>
          </button>
          <button
            type="button"
            className="zui-button zui-button-variant-ghost zui-button-icon"
            aria-label="How to play"
            title="How to play"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
        </div>
        <h1 className="wordmark">Reps</h1>
        <p className="tagline">A daily JavaScript puzzle for your coding muscles</p>
      </header>

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      <StatsDialog
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
      />

      {puzzle.preview && (
        <div
          className="preview-banner"
          role="status"
        >
          <span className="zui-badge zui-badge-variant-fill zui-badge-color-amber">
            Preview
          </span>
          <span>
            Testing day {puzzle.day}
            {preview?.kind === 'date' ? ` (as of ${puzzle.dateISO})` : ''} —
            results aren't saved and your streak is untouched.
          </span>
          <a
            className="zui-link"
            href={window.location.pathname}
          >
            Exit preview
          </a>
        </div>
      )}

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

        <SolutionPanel solution={puzzle.solution} />

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
            chars={charCount(code)}
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
