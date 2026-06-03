import yaml from 'js-yaml';

// Days elapsed (UTC) between two YYYY-MM-DD dates.
function daysBetween(epochISO, todayISO) {
  const a = Date.parse(epochISO + 'T00:00:00Z');
  const b = Date.parse(todayISO + 'T00:00:00Z');
  return Math.floor((b - a) / 86_400_000);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

// Picks the puzzle for a given date. During the proof-of-concept we cycle
// through the available days so there's always something to solve, even past
// day 10. Swap this for a strict 1:1 date mapping once you have a full
// calendar of puzzles.
export async function loadTodaysPuzzle(dateISO = todayISO(), { preview = false } = {}) {
  const manifest = await fetch('/puzzles/index.json').then((r) => r.json());
  const total = manifest.days.length;

  const elapsed = daysBetween(manifest.epoch, dateISO);
  const index = ((elapsed % total) + total) % total; // safe modulo
  const dayNumber = manifest.days[index];

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
