import { useEffect, useMemo, useState } from 'react';
import { Button } from '@mrmartineau/zui/react';
import {
  loadTodaysPuzzle,
  loadPuzzleByDay,
  getPreviewParams,
  listPastPuzzles,
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
  getHistory,
} from './lib/storage.js';
import { Timer } from './components/Timer.jsx';
import { CodeEditor } from './components/CodeEditor.jsx';
import { TestResults } from './components/TestResults.jsx';
import { ShareCard } from './components/ShareCard.jsx';
import { HelpDialog } from './components/HelpDialog.jsx';
import { SolutionPanel } from './components/SolutionPanel.jsx';
import { Markdown } from './components/Markdown.jsx';
import { StatsDialog } from './components/StatsDialog.jsx';
import { ArchiveDialog } from './components/ArchiveDialog.jsx';

const TITLE = 'Reps';
const TAGLINE = 'A daily JavaScript puzzle for your coding muscles';

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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState({ solved: new Set(), played: new Set() });

  const today = useMemo(() => todayISO(), []);
  const preview = useMemo(() => getPreviewParams(), []);

  // Highest available puzzle-day file, so `?day=N` preview nav knows where to
  // stop. Only fetched when stepping through days in preview.
  const [maxDay, setMaxDay] = useState(null);

  // The day currently being played. Defaults to today; the archive can point it
  // at any past date. Ignored in preview mode (the querystring drives that).
  const [activeDate, setActiveDate] = useState(today);

  // Snapshot stats from localStorage whenever the overlay is opened. Streaks are
  // always measured ending today, regardless of which day you're replaying.
  function openStats() {
    setStats(computeStats(today));
    setStatsOpen(true);
  }

  // Open the past-puzzle archive, snapshotting which days are solved/played.
  function openArchive() {
    setArchiveLoading(true);
    setArchiveOpen(true);
    const history = getHistory();
    setArchiveProgress({
      solved: new Set(history.filter((h) => h.solved).map((h) => h.dateISO)),
      played: new Set(history.map((h) => h.dateISO)),
    });
    listPastPuzzles(today)
      .then((entries) => setArchiveEntries(entries))
      .catch(() => setArchiveEntries([]))
      .finally(() => setArchiveLoading(false));
  }

  // Switch to a different day. Clears the transient run state so nothing from
  // the previous day lingers; the load effect then restores that day's saved
  // results/draft.
  function playDate(nextDate) {
    setArchiveOpen(false);
    if (nextDate === activeDate) return;
    setResults(null);
    setPendingNames([]);
    setElapsedMs(null);
    setStartedAt(null);
    setActiveDate(nextDate);
  }

  useEffect(() => {
    const load = preview
      ? preview.kind === 'day'
        ? loadPuzzleByDay(preview.day)
        : loadTodaysPuzzle(preview.date, { preview: true })
      : loadTodaysPuzzle(activeDate);

    setLoadError(null);
    load
      .then((p) => {
        setPuzzle(p);
        setCode(p.starterCode || '');
        // Never read or write real progress in preview mode, so testing an
        // upcoming puzzle can't clobber it.
        if (p.preview) return;

        // Restore a completed run for this day (results + time).
        const saved = getDayState(activeDate);
        if (saved && saved.day === p.day) {
          setResults(saved.results);
          setElapsedMs(saved.elapsedMs);
        }

        // Restore the editor itself, preferring the most recent in-progress
        // draft over the last submitted code, so a refresh never loses edits.
        const draft = getDraft(activeDate);
        const restoredCode =
          (draft && draft.day === p.day && draft.code) ||
          (saved && saved.day === p.day && saved.code) ||
          p.starterCode ||
          '';
        setCode(restoredCode);
      })
      .catch((e) => setLoadError(e.message || String(e)));
  }, [activeDate, preview]);

  // In `?day=N` preview, learn the highest day file so the Next button can
  // disable at the end. The manifest lists every available day number.
  useEffect(() => {
    if (preview?.kind !== 'day') return;
    fetch('/puzzles/index.json')
      .then((r) => r.json())
      .then((m) => setMaxDay(Math.max(...m.days)))
      .catch(() => {});
  }, [preview]);

  // Jump to another preview day by reloading with a new querystring. A full
  // reload (rather than SPA state) keeps the preview params, read once on
  // mount, the single source of truth.
  function gotoPreviewDay(day) {
    window.location.search = `?day=${day}`;
  }

  // Persist the editor draft as the user types, so a refresh or back-button
  // never loses work. Debounced to avoid a write on every keystroke. Skipped in
  // preview mode and before the puzzle has loaded.
  useEffect(() => {
    if (!puzzle || puzzle.preview) return;
    const id = setTimeout(() => {
      saveDraft(activeDate, { day: puzzle.day, code });
    }, 400);
    return () => clearTimeout(id);
  }, [code, puzzle, activeDate]);

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
    saveDayState(activeDate, {
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
  const streak = done ? computeStreak(activeDate) : 0;
  const isPastDay = !preview && activeDate !== today;

  return (
    <main className="app">
      <header className="masthead">
        <div className="masthead-actions">
          {!preview && (
            <Button
              aria-label="Past puzzles"
              title="Past puzzles"
              onClick={openArchive}
              variant="ghost"
              size="xs"
            >
              Archive
            </Button>
          )}
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
        <h1 className="wordmark">{TITLE}</h1>
        <p className="tagline">{TAGLINE}</p>
      </header>

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={TITLE}
        subtitle={TAGLINE}
      />

      <StatsDialog
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
      />

      <ArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        entries={archiveEntries}
        loading={archiveLoading}
        solvedDates={archiveProgress.solved}
        playedDates={archiveProgress.played}
        activeDate={activeDate}
        today={today}
        onPick={playDate}
      />

      {isPastDay && (
        <div
          className="preview-banner"
          role="status"
        >
          <span className="zui-badge zui-badge-variant-fill zui-badge-color-sky">
            Past puzzle
          </span>
          <span>
            Playing {activeDate} (#{puzzle.puzzleNumber}) — your progress is saved for that day.
          </span>
          <button
            type="button"
            className="zui-link"
            onClick={() => playDate(today)}
          >
            Back to today
          </button>
        </div>
      )}

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
          <div className="flex-center gap-xs">
            {preview?.kind === 'day' && (
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={preview.day <= 1}
                  onClick={() => gotoPreviewDay(preview.day - 1)}
                  aria-label="Previous day"
                >
                  ← Prev
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={maxDay != null && preview.day >= maxDay}
                  onClick={() => gotoPreviewDay(preview.day + 1)}
                  aria-label="Next day"
                >
                  Next →
                </Button></>
            )}
            <a
              className="zui-link"
              href={window.location.pathname}
            >
              Exit preview
            </a>
          </div>
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

        <SolutionPanel
          solution={puzzle.solution}
          explanation={puzzle.solutionExplanation}
        />

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
        Built by <a href="https://zander.wtf" className="zui-link">Zander Martineau</a> with <a href="https://zui.zander.wtf" className="zui-link">ZUI</a>. Puzzles are
        plain YAML, contribute one a day.
        <br/>
        Read about how you can contribute <a href="https://github.com/mrmartineau/reps.zander.wtf/blob/main/CONTRIBUTORS.md" className="zui-link">here</a>.
      </footer>
    </main>
  );
}
