import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  Button,
} from '@mrmartineau/zui/react';

const DIFFICULTY_COLOR = { easy: 'emerald', medium: 'amber', hard: 'rose' };

// Lets the player jump back and play any past day. `entries` come from
// listPastPuzzles(); `solvedDates`/`playedDates` mark progress; `activeDate`
// is the one currently loaded. Selecting a row calls onPick(dateISO).
export function ArchiveDialog({
  open,
  onClose,
  entries,
  loading,
  solvedDates,
  playedDates,
  activeDate,
  today,
  onPick,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
    >
      <DialogHeader>
        <DialogTitle>Past puzzles</DialogTitle>
        <DialogDescription>Replay any day since launch — progress is saved per day.</DialogDescription>
      </DialogHeader>

      <DialogBody>
        {loading ? (
          <p className="archive-empty">Loading the archive…</p>
        ) : entries.length === 0 ? (
          <p className="archive-empty">No past puzzles yet — come back tomorrow.</p>
        ) : (
          <ul className="archive-list">
            {entries.map((e) => {
              const solved = solvedDates.has(e.dateISO);
              const played = playedDates.has(e.dateISO);
              const isActive = e.dateISO === activeDate;
              const isToday = e.dateISO === today;
              return (
                <li key={e.dateISO}>
                  <button
                    type="button"
                    className={`archive-row${isActive ? ' is-active' : ''}`}
                    onClick={() => onPick(e.dateISO)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className={`archive-mark ${solved ? 'is-solved' : played ? 'is-played' : 'is-new'}`}>
                      {solved ? '✓' : played ? '·' : ''}
                    </span>
                    <span className="archive-main">
                      <span className="archive-title">
                        #{e.puzzleNumber} {e.title || `Day ${e.day}`}
                      </span>
                      <span className="archive-date">
                        {e.dateISO}
                        {isToday ? ' · today' : ''}
                      </span>
                    </span>
                    {e.difficulty && (
                      <span
                        className={`zui-badge zui-badge-variant-subtle zui-badge-color-${DIFFICULTY_COLOR[e.difficulty]} difficulty-badge`}
                      >
                        {e.difficulty}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogBody>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}
