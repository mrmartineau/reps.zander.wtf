import yaml from 'js-yaml';

// Days elapsed (UTC) between two YYYY-MM-DD dates.
function daysBetween(epochISO, todayISO) {
  const a = Date.parse(epochISO + 'T00:00:00Z');
  const b = Date.parse(todayISO + 'T00:00:00Z');
  return Math.floor((b - a) / 86_400_000);
}

// The player's LOCAL calendar date as YYYY-MM-DD. Deliberately not
// `toISOString()` (which is UTC) — otherwise everyone east of UTC would still
// see "yesterday's" puzzle for the first few hours of their day. Wordle-style:
// the puzzle rolls over at the player's own local midnight.
export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Reads preview intent from the URL querystring. Lets contributors/admins
// test an upcoming puzzle without auth:
//   ?preview=5   (alias ?day=5)  — load that puzzle file directly
//   ?date=2026-07-01            — simulate the live date-cycling for a future day
// Returns null when no preview params are present (normal "today" mode).
export function getPreviewParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const dayRaw = params.get('preview') ?? params.get('day');
  const dateRaw = params.get('date');

  if (dayRaw != null) {
    const day = Number.parseInt(dayRaw, 10);
    if (Number.isInteger(day) && day > 0) return { kind: 'day', day };
  }
  if (dateRaw != null && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { kind: 'date', date: dateRaw };
  }
  return null;
}

// Loads a specific puzzle file by its day number, bypassing date logic.
// Used by preview mode. Throws a readable error when the file is missing.
export async function loadPuzzleByDay(dayNumber) {
  const padded = String(dayNumber).padStart(3, '0');
  const res = await fetch(`/puzzles/day-${padded}.yaml`);
  // A real static host 404s a missing file; dev servers and SPA-fallback hosts
  // answer 200 with index.html instead, so we also validate the parsed shape.
  const missing = () => {
    throw new Error(`No puzzle file for day ${dayNumber} (day-${padded}.yaml)`);
  };
  if (!res.ok) missing();

  let puzzle;
  try {
    puzzle = yaml.load(await res.text());
  } catch {
    missing();
  }
  if (!puzzle || typeof puzzle !== 'object' || puzzle.functionName == null) {
    missing();
  }

  puzzle.dateISO = todayISO();
  puzzle.preview = true;
  return puzzle;
}

// Picks the puzzle for a given date. For now we CYCLE through the available
// days (modulo), so there's always something to solve even after the calendar
// runs out. Once there's a full calendar of puzzles, switch to the strict 1:1
// date→day mapping shown in the commented block below.
export async function loadTodaysPuzzle(dateISO = todayISO(), { preview = false } = {}) {
  const manifest = await fetch('/puzzles/index.json').then((r) => r.json());
  const total = manifest.days.length;

  const elapsed = daysBetween(manifest.epoch, dateISO);

  // --- Cycling mode (active) ---------------------------------------------
  // `elapsed` wrapped back into [0, total) so day `total` shows the first
  // puzzle again, day `total + 1` the second, and so on — forever.
  const index = ((elapsed % total) + total) % total; // safe modulo (handles negatives)
  const dayNumber = manifest.days[index];

  // --- Strict 1:1 mode (swap in when you have a full calendar) ------------
  // Each calendar day maps to exactly one puzzle, in `days` order, with no
  // cycling. Past the end of the list there simply is no puzzle — surface a
  // "you're all caught up" state in App.jsx rather than letting this throw.
  //
  //   if (elapsed < 0 || elapsed >= total) {
  //     throw new Error('No puzzle scheduled for this date');
  //   }
  //   const dayNumber = manifest.days[elapsed];
  //
  // `puzzleNumber` below (elapsed + 1) already matches a 1:1 calendar, so it
  // needs no change when you switch.

  const padded = String(dayNumber).padStart(3, '0');
  const text = await fetch(`/puzzles/day-${padded}.yaml`).then((r) => r.text());
  const puzzle = yaml.load(text);

  // `puzzleNumber` is the running daily count since launch (Wordle-style),
  // distinct from which puzzle file we happen to be showing.
  puzzle.puzzleNumber = elapsed + 1;
  puzzle.dateISO = dateISO;
  if (preview) puzzle.preview = true;
  return puzzle;
}

// Adds `n` days to a YYYY-MM-DD date (UTC), returning YYYY-MM-DD.
function addDays(dateISO, n) {
  return new Date(Date.parse(dateISO + 'T00:00:00Z') + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// Lists every playable date from launch up to `today` (inclusive), newest
// first, for the "play a past puzzle" archive. Each entry carries the date, the
// running puzzle number, which day file it maps to, and that file's title +
// difficulty. Titles/difficulties are fetched once per unique day file.
export async function listPastPuzzles(today = todayISO()) {
  const manifest = await fetch('/puzzles/index.json').then((r) => r.json());
  const total = manifest.days.length;
  const todayElapsed = daysBetween(manifest.epoch, today);
  if (todayElapsed < 0) return [];

  // Fetch metadata once per distinct day file in the manifest.
  const metaByDay = new Map();
  await Promise.all(
    [...new Set(manifest.days)].map(async (day) => {
      const padded = String(day).padStart(3, '0');
      try {
        const p = yaml.load(await fetch(`/puzzles/day-${padded}.yaml`).then((r) => r.text()));
        metaByDay.set(day, { title: p.title, difficulty: p.difficulty });
      } catch {
        metaByDay.set(day, { title: `Day ${day}`, difficulty: null });
      }
    }),
  );

  const list = [];
  for (let elapsed = 0; elapsed <= todayElapsed; elapsed++) {
    const index = ((elapsed % total) + total) % total;
    const day = manifest.days[index];
    const meta = metaByDay.get(day) || {};
    list.push({
      dateISO: addDays(manifest.epoch, elapsed),
      puzzleNumber: elapsed + 1,
      day,
      title: meta.title,
      difficulty: meta.difficulty,
    });
  }
  return list.reverse(); // newest first
}
