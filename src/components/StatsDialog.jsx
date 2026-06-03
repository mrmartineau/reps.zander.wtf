import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  Button,
} from '@mrmartineau/zui/react';
import { formatTime } from '../lib/share.js';

function Stat({ value, label }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Wordle-style statistics overlay: headline numbers plus a scrollable history
// of past days. `stats` comes from computeStats(); recomputed each open.
export function StatsDialog({ open, onClose, stats }) {
  const s = stats ?? {};
  const history = s.history ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
    >
      <DialogHeader>
        <DialogTitle>Statistics</DialogTitle>
        <DialogDescription>Your reps so far — stored only in this browser.</DialogDescription>
      </DialogHeader>

      <DialogBody>
        {s.played ? (
          <>
            <div className="stats-grid">
              <Stat value={s.played} label="Played" />
              <Stat value={`${s.winPct}%`} label="Solved" />
              <Stat value={s.currentStreak} label="Current streak" />
              <Stat value={s.maxStreak} label="Max streak" />
              <Stat value={s.bestTimeMs != null ? formatTime(s.bestTimeMs) : '—'} label="Best time" />
              <Stat value={s.avgTimeMs != null ? formatTime(s.avgTimeMs) : '—'} label="Avg time" />
              <Stat value={s.bestCharCount != null ? `${s.bestCharCount} ch` : '—'} label="Best golf" />
            </div>

            <h3 className="stats-subhead">History</h3>
            <ul className="stats-history">
              {history.map((h) => (
                <li
                  key={h.dateISO}
                  className="stats-row"
                >
                  <span className={`stats-mark ${h.solved ? 'is-solved' : 'is-missed'}`}>
                    {h.solved ? '✓' : '✗'}
                  </span>
                  <span className="stats-main">
                    <span className="stats-puzzle">{h.title || `Day ${h.day}`}</span>
                    <span className="stats-date">{h.dateISO}</span>
                  </span>
                  <span className="stats-detail">
                    {h.total ? `${h.passed}/${h.total}` : '—'}
                  </span>
                  <span className="stats-time">
                    {h.elapsedMs != null ? formatTime(h.elapsedMs) : ''}
                  </span>
                  <span className="stats-chars">
                    {h.chars != null ? `${h.chars} ch` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="stats-empty">
            No reps recorded yet. Solve today's puzzle and your stats will start filling in.
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}
