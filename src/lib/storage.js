// Tiny persistence layer for daily state + streak. This is a real local app
// (not a sandboxed artifact), so localStorage is the right tool here — same
// model Wordle uses.

const KEY = 'reps:v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

export function getDayState(dateISO) {
  return read()[dateISO] || null;
}

export function saveDayState(dateISO, payload) {
  const state = read();
  state[dateISO] = payload;
  write(state);
}

// Streak = consecutive days (ending today) with at least one solve recorded.
export function computeStreak(dateISO) {
  const state = read();
  let streak = 0;
  const d = new Date(dateISO + 'T00:00:00Z');
  // walk backwards day by day
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (state[iso] && state[iso].solved) {
      streak += 1;
      d.setUTCDate(d.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Every recorded day, newest first: [{ dateISO, day, solved, elapsedMs, passed, total }].
export function getHistory() {
  const state = read();
  return Object.entries(state)
    .map(([dateISO, s]) => {
      const results = Array.isArray(s.results) ? s.results : [];
      return {
        dateISO,
        day: s.day,
        solved: Boolean(s.solved),
        elapsedMs: s.elapsedMs ?? null,
        passed: results.filter((r) => r.pass).length,
        total: results.length,
      };
    })
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

// Longest run of consecutive calendar days with a solve, anywhere in history.
function maxStreak(history) {
  const solvedDates = history
    .filter((h) => h.solved)
    .map((h) => h.dateISO)
    .sort(); // ascending
  let best = 0;
  let run = 0;
  let prev = null;
  for (const iso of solvedDates) {
    if (prev) {
      const gap = (Date.parse(iso + 'T00:00:00Z') - Date.parse(prev + 'T00:00:00Z')) / 86_400_000;
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = iso;
  }
  return best;
}

// Aggregate stats for the stats overlay.
export function computeStats(dateISO) {
  const history = getHistory();
  const played = history.length;
  const solvedDays = history.filter((h) => h.solved);
  const wins = solvedDays.length;
  const times = solvedDays
    .map((h) => h.elapsedMs)
    .filter((ms) => typeof ms === 'number' && ms >= 0);

  return {
    played,
    wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    currentStreak: computeStreak(dateISO),
    maxStreak: maxStreak(history),
    bestTimeMs: times.length ? Math.min(...times) : null,
    avgTimeMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    history,
  };
}
