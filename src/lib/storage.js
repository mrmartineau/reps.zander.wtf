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
