// Runs React-flavoured puzzles (`kind: react-component` and `kind: react-hook`).
//
// Unlike the plain-function puzzles — which execute in a Web Worker with a hard
// timeout — React needs the DOM, so these render on the main thread into a
// hidden, throwaway container that's torn down after each test. That trade-off
// means we lose the worker's infinite-loop kill; a runaway render will hang the
// tab. The production answer is a sandboxed <iframe> we can terminate, but this
// spike keeps it simple. See runner.js for how dispatch happens.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { transformJsx } from './jsxTransform.js';
import { deepEqual, show } from './equal.js';

const MAX_LOG_LINES = 100;

// Build the user's code into a module scope that has `React` and the common
// hooks available by bare name (so `useState`, `useMemo`, … just work), then
// hand back the single named export the puzzle cares about.
function buildExport(code, name) {
  const compiled = transformJsx(code);
  const factory = new Function(
    'React',
    `"use strict";
    const { useState, useEffect, useMemo, useRef, useCallback, useReducer, useContext, Fragment } = React;
    ${compiled}
    ;return typeof ${name} !== "undefined" ? ${name} : undefined;`,
  );
  return factory(React);
}

// Temporarily capture console output around a synchronous block, mirroring the
// worker's behaviour so logs surface beneath each test result.
function withCapturedConsole(fn) {
  const logs = [];
  const record = (parts) =>
    logs.length < MAX_LOG_LINES &&
    logs.push(parts.map((p) => (typeof p === 'string' ? p : show(p))).join(' '));
  const methods = ['log', 'info', 'warn', 'error', 'debug'];
  const original = {};
  for (const m of methods) {
    original[m] = console[m];
    console[m] = (...a) => record(a);
  }
  try {
    fn();
  } finally {
    for (const m of methods) console[m] = original[m];
  }
  return logs;
}

// Render `element` into a hidden container, run `inspect(container)` against the
// resulting DOM, and always tear the render down afterwards.
function renderAndInspect(element, inspect) {
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);
  const root = createRoot(container, { onRecoverableError() {} });
  try {
    flushSync(() => root.render(element));
    return inspect(container);
  } finally {
    flushSync(() => root.unmount());
    container.remove();
  }
}

// --- Declarative assertion DSL -------------------------------------------
// A test's `assert` object can combine any of:
//   selector      CSS selector, scoped to the rendered output
//   count         number of elements matching `selector`
//   exists        true/false — selector matches at least one element
//   text          exact (trimmed) text of the matched element(s)
//   textIncludes  string | string[] — substring(s) that must appear
// All provided checks must pass.
function checkAssertions(container, assert) {
  if (!assert || typeof assert !== 'object') {
    return { pass: false, error: 'Test is missing an `assert` block.' };
  }

  const { selector, count, exists, text, textIncludes } = assert;
  const matched = selector ? Array.from(container.querySelectorAll(selector)) : null;
  const scopeText = (matched ? matched.map((el) => el.textContent).join(' ') : container.textContent) || '';
  const checks = [];

  if (typeof count === 'number') {
    const got = matched ? matched.length : 0;
    checks.push({ ok: got === count, expected: `${count} × \`${selector}\``, received: `${got}` });
  }
  if (typeof exists === 'boolean') {
    const got = matched ? matched.length > 0 : false;
    checks.push({
      ok: got === exists,
      expected: `\`${selector}\` ${exists ? 'present' : 'absent'}`,
      received: got ? 'present' : 'absent',
    });
  }
  if (text != null) {
    const got = (matched && matched.length === 1 ? matched[0].textContent : scopeText).trim();
    checks.push({ ok: got === text, expected: show(text), received: show(got) });
  }
  if (textIncludes != null) {
    const needles = Array.isArray(textIncludes) ? textIncludes : [textIncludes];
    const missing = needles.filter((n) => !scopeText.includes(n));
    checks.push({
      ok: missing.length === 0,
      expected: `text containing ${show(needles)}`,
      received: missing.length ? `missing ${show(missing)}` : show(scopeText.trim().slice(0, 100)),
    });
  }

  if (checks.length === 0) return { pass: false, error: '`assert` had no recognised checks.' };
  const failed = checks.find((c) => !c.ok);
  return failed
    ? { pass: false, expected: failed.expected, received: failed.received }
    : { pass: true };
}

function runComponentTest(Component, test) {
  let outcome;
  const logs = withCapturedConsole(() => {
    try {
      outcome = renderAndInspect(
        React.createElement(Component, test.props || {}),
        (container) => checkAssertions(container, test.assert),
      );
    } catch (err) {
      outcome = { pass: false, error: err && err.message ? err.message : String(err) };
    }
  });
  return { name: test.name, ...outcome, logs };
}

function runHookTest(hook, test) {
  let outcome;
  const logs = withCapturedConsole(() => {
    let captured;
    let captureError;
    function Probe() {
      try {
        captured = hook(...(test.args || []));
      } catch (e) {
        captureError = e;
      }
      return null;
    }
    try {
      renderAndInspect(React.createElement(Probe), () => {});
      if (captureError) throw captureError;
      outcome = {
        pass: deepEqual(captured, test.expected),
        received: show(captured),
        expected: show(test.expected),
      };
    } catch (err) {
      outcome = { pass: false, error: err && err.message ? err.message : String(err) };
    }
  });
  return { name: test.name, ...outcome, logs };
}

// Entry point used by runner.js for React puzzle kinds. Returns the same result
// shape the worker path does, so TestResults renders both identically.
export async function runReactTests(code, puzzle) {
  const isHook = puzzle.kind === 'react-hook';
  const name = isHook ? puzzle.functionName : puzzle.componentName;

  let entry;
  try {
    entry = buildExport(code, name);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return puzzle.tests.map((t) => ({ name: t.name, pass: false, error: `Couldn't compile: ${msg}` }));
  }

  if (typeof entry !== 'function') {
    const kindLabel = isHook ? 'hook' : 'component';
    return puzzle.tests.map((t) => ({
      name: t.name,
      pass: false,
      error: `Couldn't find a ${kindLabel} named "${name}". Make sure it's defined.`,
    }));
  }

  const results = [];
  for (const test of puzzle.tests) {
    results.push(isHook ? runHookTest(entry, test) : runComponentTest(entry, test));
    // Yield to the event loop so the staggered reveal in App.jsx stays smooth.
    await Promise.resolve();
  }
  return results;
}
