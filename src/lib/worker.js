// Runs entirely off the main thread so a runaway solution (infinite loop)
// can be killed by terminating the worker from the runner.
import { deepEqual, show } from './equal.js';

self.onmessage = (e) => {
  const { code, functionName, test } = e.data;
  try {
    // Build the user's function in an isolated scope and hand back the
    // named entry point. `"use strict"` keeps accidental globals from leaking.
    const factory = new Function(
      `"use strict";\n${code}\n;return typeof ${functionName} === "function" ? ${functionName} : undefined;`
    );
    const fn = factory();

    if (typeof fn !== 'function') {
      self.postMessage({
        pass: false,
        error: `Couldn't find a function named "${functionName}". Make sure it's defined.`,
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
    });
  } catch (err) {
    self.postMessage({
      pass: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};
