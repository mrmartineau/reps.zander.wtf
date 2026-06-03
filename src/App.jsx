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
import {
  getDayState,
  saveDayState,
  computeStreak,
  computeStats,
  getDraft,
  saveDraft,
} from './lib/storage.js';
import { Timer } from './components/Timer.jsx';
import { CodeEditor } from './components/CodeEditor.jsx';
import { TestResults } from './components/TestResults.jsx';
import { ShareCard } from './components/ShareCard.jsx';
import { HelpDialog } from './components/HelpDialog.jsx';
import { SolutionPanel } from './components/SolutionPanel.jsx';
import { Markdown } from './components/Markdown.jsx';
import { StatsDialog } from './components/StatsDialog.jsx';

// Delay between revealing each test result, so a run reads like live execution.
const REVEAL_STAGGER_MS = 100;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Difficulty → ZUI badge colour.
const DIFFICULTY_COLOR = { easy: 'emerald', medium: 'amber', hard: 'rose' };

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [pendingNames, setPendingNames] = useState([]);
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
        // Never read or write real progress in preview mode, so testing an
        // upcoming puzzle can't clobber it.
        if (p.preview) return;

        // Restore a completed run from earlier today (results + time).
        const saved = getDayState(dateISO);
        if (saved && saved.day === p.day) {
          setResults(saved.results);
          setElapsedMs(saved.elapsedMs);
        }

        // Restore the editor itself, preferring the most recent in-progress
        // draft over the last submitted code, so a refresh never loses edits.
        const draft = getDraft(dateISO);
        const restoredCode =
          (draft && draft.day === p.day && draft.code) ||
          (saved && saved.day === p.day && saved.code) ||
          p.starterCode ||
          '';
        setCode(restoredCode);
      })
      .catch((e) => setLoadError(e.message || String(e)));
  }, [dateISO, preview]);

  // Persist the editor draft as the user types, so a refresh or back-button
  // never loses work. Debounced to avoid a write on every keystroke. Skipped in
  // preview mode and before the puzzle has loaded.
  useEffect(() => {
    if (!puzzle || puzzle.preview) return;
    const id = setTimeout(() => {
      saveDraft(dateISO, { day: puzzle.day, code });
    }, 400);
    return () => clearTimeout(id);
  }, [code, puzzle, dateISO]);

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

    // Show every test as "running" up front, then reveal results one at a time
    // so it reads like a live test run even though the worker is near-instant.
    setResults([]);
    setPendingNames(puzzle.tests.map((t) => t.name));

    const res = await runTests(code, puzzle);
    const took = Date.now() - begun;
    // Freeze the timer at the true run time, not the animated reveal duration.
    setElapsedMs(took);

    for (let i = 0; i < res.length; i++) {
      await delay(REVEAL_STAGGER_MS);
      setResults(res.slice(0, i + 1));
      setPendingNames(puzzle.tests.slice(i + 1).map((t) => t.name));
    }

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
    setPendingNames([]);
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

  // "Done" only once the staggered reveal has finished — not mid-animation.
  const done = !running && results != null && results.length > 0;
  const streak = done ? computeStreak(dateISO) : 0;

  return (
    <main className="app">
      <header className="masthead">
        <div className="masthead-actions">
          <Button
            aria-label="Statistics"
            title="Statistics"
            onClick={openStats}
            variant="ghost"
            size="xs"
          >
            Stats
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
          </Button>
          <Button
            aria-label="How to play"
            title="How to play"
            onClick={() => setHelpOpen(true)}
            variant="ghost"
            size="xs"
          >
            Help ?
          </Button>
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
          {puzzle.difficulty && (
            <span
              className={`zui-badge zui-badge-variant-subtle zui-badge-color-${DIFFICULTY_COLOR[puzzle.difficulty]} difficulty-badge`}
            >
              {puzzle.difficulty}
            </span>
          )}
          <Timer
            startedAt={startedAt}
            frozenMs={elapsedMs}
          />
        </div>

        <Markdown className="prompt">{puzzle.prompt}</Markdown>

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

        <TestResults
          results={results}
          pendingNames={pendingNames}
        />

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
