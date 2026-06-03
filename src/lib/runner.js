// Orchestrates running each test in a fresh worker with a hard timeout.
// A fresh worker per test means one test's infinite loop never blocks the
// others, and gives us a clean "Timed out" result for the strict tier.

const TIMEOUT_MS = 2000;

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
  // Run sequentially so results stream in order; tests are tiny so this is
  // plenty fast and keeps the UI predictable.
  const results = [];
  for (const test of puzzle.tests) {
    results.push(await runOneTest(code, puzzle.functionName, test));
  }
  return results;
}
