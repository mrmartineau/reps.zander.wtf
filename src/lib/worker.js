// Runs entirely off the main thread so a runaway solution (infinite loop)
// can be killed by terminating the worker from the runner.
import { deepEqual, show } from './equal.js';

const MAX_LOG_LINES = 100;

self.onmessage = (e) => {
  const { code, functionName, test } = e.data;

  // Capture the user's console output so it can be surfaced next to the result.
  // The captured console is passed into the function scope, shadowing the
  // global. Non-string args are JSON-ified via `show`.
  const logs = [];
  const record = (parts) => {
    if (logs.length >= MAX_LOG_LINES) return;
    logs.push(parts.map((p) => (typeof p === 'string' ? p : show(p))).join(' '));
  };
  const captureConsole = {
    log: (...a) => record(a),
    info: (...a) => record(a),
    warn: (...a) => record(a),
    error: (...a) => record(a),
    debug: (...a) => record(a),
  };

  try {
    // Build the user's function in an isolated scope and hand back the named
    // entry point. `"use strict"` keeps accidental globals from leaking.
    const factory = new Function(
      'console',
      `"use strict";\n${code}\n;return typeof ${functionName} === "function" ? ${functionName} : undefined;`
    );
    const fn = factory(captureConsole);

    if (typeof fn !== 'function') {
      self.postMessage({
        pass: false,
        error: `Couldn't find a function named "${functionName}". Make sure it's defined.`,
        logs,
      });
      return;
    }

    // Defensive copy of args so a solution that mutates inputs can't poison
    // the comparison.
    const args = structuredClone(test.args);
    const received = fn(...args);
    const pass = deepEqual(received, test.expected);

    self.postMessage({
      pass,
      received: show(received),
      expected: show(test.expected),
      logs,
    });
  } catch (err) {
    self.postMessage({
      pass: false,
      error: err && err.message ? err.message : String(err),
      logs,
    });
  }
};
