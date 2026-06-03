// Builds the spoiler-free share string: squares for test pass/fail plus the
// solve time. Never includes the user's code or the puzzle answer.

export function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function buildShareText(puzzle, results, elapsedMs) {
  const squares = results.map((r) => (r.pass ? '🟩' : '⬛')).join('');
  const passed = results.filter((r) => r.pass).length;
  const time = formatTime(elapsedMs);

  return [
    `Reps #${puzzle.puzzleNumber} · ${time}`,
    squares,
    `${passed}/${results.length} tests`,
    'reps.zander.wtf',
  ].join('\n');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
