# Reps

A daily coding-puzzle game — like Wordle, but you write a small function and it
runs against three tests in your browser. One rep a day to keep the coding
muscles warm.

> Working name. Rename freely — it's referenced in `index.html`, the `.wordmark`
> in `src/App.jsx`, and the share string in `src/lib/share.js`.

## What's here (proof of concept)

- **JavaScript-only** to start — runs entirely in the browser, no backend.
- **10 puzzles** as plain YAML files in `public/puzzles/`.
- **Three tests per puzzle** of increasing strictness (happy path → edge case →
  trickier/constraint). No easy/medium/hard labels; some days just bite harder.
- **Timer** that starts on first edit and freezes on first run.
- **Wordle-style share string** — coloured squares + solve time, never the
  answer or your code.
- **Streaks** persisted in `localStorage`.
- Solutions run in a **Web Worker with a 2s timeout**, so an infinite loop fails
  cleanly instead of hanging the page.
- Built with **[zui](https://zui.zander.wtf)** (`@mrmartineau/zui`).

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL.

```bash
npm run build      # production build
npm run verify-puzzles   # structural check on all puzzle files
```

## Adding a puzzle

Drop a new file in `public/puzzles/`, e.g. `day-011.yaml`:

```yaml
day: 11
title: "Your Puzzle"
prompt: |
  Implement `solve(x)` so it does the thing.
functionName: solve
starterCode: |
  function solve(x) {
    // your code here
  }
tests:
  - name: "Happy path"
    args: [1]
    expected: 2
  - name: "Edge case"
    args: [0]
    expected: 0
  - name: "The tricky one"
    args: [-1]
    expected: -2
```

Then add its day number to `public/puzzles/index.json` and run
`npm run verify-puzzles`. Each `args` array is spread into the function call, so
`args: [[1,2,3], 9]` calls `solve([1,2,3], 9)`. `expected` is compared with deep
equality, so arrays and objects work.

The validator checks structure (required fields, exactly three tests, function
name present in the starter) — it doesn't check that your answer is correct,
since the answer isn't stored in the file. Sanity-check your own solution before
committing.

## How "today's puzzle" is chosen

`public/puzzles/index.json` has a launch `epoch` date and a list of `days`. The
app shows `(daysSinceEpoch mod numberOfPuzzles)`, so during the PoC it cycles
through the ten puzzles forever and there's always something to solve. Swap the
modulo in `src/lib/loadPuzzle.js` for a strict 1:1 date→day mapping once you
have a full calendar.

## Where this goes next

- **Community puzzles**: the YAML format is the contribution interface. A PR that
  adds a validated `day-NNN.yaml` is the whole workflow. A light review keeps
  difficulty fair.
- **More languages**: same puzzle, language-idiomatic implementations. JS/TS run
  in-browser; Python (Pyodide) and Rust (wasm) can too with more setup; Go, PHP,
  Swift want a sandboxed backend test runner. Keep the YAML schema language-aware
  (a `language` field + per-language `starterCode`/`tests`) so one puzzle file
  can describe all variants.
- **Editor upgrade**: swap the `<textarea>` in `src/components/CodeEditor.jsx`
  for CodeMirror for syntax highlighting.

## Project layout

```
public/puzzles/        YAML puzzles + index.json manifest
src/lib/loadPuzzle.js  picks today's puzzle, parses YAML
src/lib/runner.js      runs each test in a worker with a timeout
src/lib/worker.js      executes user code in isolation
src/lib/equal.js       deep equality for outputs
src/lib/share.js       spoiler-free share string
src/lib/storage.js     daily state + streak (localStorage)
src/components/        Timer, CodeEditor, TestResults, ShareCard
src/App.jsx            wires it together
scripts/verify-puzzles.mjs  structural validator
```
