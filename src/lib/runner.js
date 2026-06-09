// Orchestrates running each test in a fresh worker with a hard timeout.
// A fresh worker per test means one test's infinite loop never blocks the
// others, and gives us a clean "Timed out" result for the strict tier.
//
// React-flavoured puzzles (`kind: react-component` / `react-hook`) need the
// DOM, so they're delegated to reactRunner.js, which renders on the main
// thread. Plain-function puzzles (the default) stay on the worker path below.
import { runReactTests } from './reactRunner.js';

const TIMEOUT_MS = 2000;

const REACT_KINDS = new Set(['react-component', 'react-hook']);

function runOneTest(code, functionName, test) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        name: test.name,
        pass: false,
        error: `Timed out after ${TIMEOUT_MS} ms`,
      });
    }, TIMEOUT_MS);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ name: test.name, ...e.data });
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        name: test.name,
        pass: false,
        error: err.message || 'Worker error',
      });
    };

    worker.postMessage({ code, functionName, test });
  });
}

export async function runTests(code, puzzle) {
  if (REACT_KINDS.has(puzzle.kind)) {
    return runReactTests(code, puzzle);
  }

  // Run sequentially so results stream in order; tests are tiny so this is
  // plenty fast and keeps the UI predictable.
  const results = [];
  for (const test of puzzle.tests) {
    results.push(await runOneTest(code, puzzle.functionName, test));
  }
  return results;
}
