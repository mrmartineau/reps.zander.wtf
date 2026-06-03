// Builds the spoiler-free share string: squares for test pass/fail plus the
// solve time and code-golf char count. Never includes the user's code or the
// puzzle answer.

export function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Code-golf metric: characters in the submitted solution, ignoring surrounding
// whitespace. A secondary score — time is still the headline.
export function charCount(code) {
  return (code || '').trim().length;
}

export function buildShareText(puzzle, results, elapsedMs, chars) {
  const squares = results.map((r) => (r.pass ? '🟩' : '⬛')).join('');
  const passed = results.filter((r) => r.pass).length;
  const time = formatTime(elapsedMs);

  const meta = typeof chars === 'number' ? `${time} · ${chars} chars` : time;

  return [
    `Reps #${puzzle.puzzleNumber} · ${meta}`,
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
