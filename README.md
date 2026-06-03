# Reps

A daily coding-puzzle game — like Wordle, but you write a small JavaScript
function and it runs against three tests in your browser. One rep a day to keep
the coding muscles warm.

## What's here

- **JavaScript-only** — runs entirely in the browser, no backend.
- **40 puzzles** as plain YAML files in `public/puzzles/`, spanning strings,
  numbers, arrays, objects, classic algorithms, and real-world data
  transformations.
- **Difficulty labels** (`easy` / `medium` / `hard`) shown as a badge. The daily
  order is deliberately mixed so newcomers aren't scared off by a hard run.
- **Three tests per puzzle**, ordered happy path → second case → edge case.
- **Monaco editor** with JavaScript syntax highlighting; your in-progress code is
  saved to `localStorage`, so a refresh or back-button never loses edits.
- **Markdown prompts** (GitHub-flavoured) with worked examples.
- **Animated test runner** — results reveal one at a time, like a live run.
- **Recommended solution** revealable on demand, plus a **code-golf** character
  count.
- **Timer** that starts on first edit and freezes on first run.
- **Stats overlay** — games played, win %, streaks, best/avg time, best golf, and
  a per-day history.
- **Wordle-style share string** — coloured squares, solve time, and char count;
  never the answer or your code.
- Solutions run in a **Web Worker with a 2s timeout**, so an infinite loop fails
  cleanly instead of hanging the page.
- Built with **[zui](https://zui.zander.wtf)** (`@mrmartineau/zui`), Vite, and
  the **[Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)**.

## Run it

```bash
pnpm install
pnpm dev
```

Then open the printed local URL.

```bash
pnpm build               # production build (emits dist/ + dist/wrangler.json)
pnpm validate-puzzles    # structure + run every reference solution against its tests
pnpm deploy              # build and deploy to Cloudflare (needs auth)
```

### Previewing upcoming puzzles

Contributors and admins can preview any puzzle without affecting their real
progress (no auth — see the caveat below):

- `?preview=5` (or `?day=5`) — load that puzzle file directly.
- `?date=2026-07-01` — simulate the live date-cycling for a future day.

Preview sessions don't read or write `localStorage`, so your streak and drafts
stay untouched. Note these are convenience, not secrecy — puzzle YAML lives in
`public/` and is fetchable regardless.

## Contributing a puzzle

See **[CONTRIBUTORS.md](./CONTRIBUTORS.md)** for the full guidelines on what makes
a good puzzle and the submission workflow. In short: drop a draft `.yaml` in
[`submissions/`](./submissions/) with `day: 0`, run `pnpm validate-submissions`,
and open a PR. A maintainer reviews it, then promotes accepted puzzles into the
live rotation and assigns the real day number. CI runs the same validation on any
PR that touches puzzle files.

### Puzzle format

```yaml
day: 11
title: "Chunk an Array"
difficulty: medium # easy | medium | hard
prompt: |
  Implement `chunk(arr, size)` so it splits `arr` into sub-arrays of length
  `size` (the last chunk may be shorter).

  For example, `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [3, 4], [5]]`.
functionName: chunk
starterCode: |
  function chunk(arr, size) {
    // your code here
  }
tests:
  - name: "Even split"
    args: [[1, 2, 3, 4, 5], 2]
    expected: [[1, 2], [3, 4], [5]]
  - name: "Exact fit"
    args: [[1, 2, 3], 3]
    expected: [[1, 2, 3]]
  - name: "Empty input"
    args: [[], 3]
    expected: []
solution: |
  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
```

Each `args` array is spread into the call, so `args: [[1,2,3], 9]` calls
`chunk([1,2,3], 9)`. `expected` is compared with deep equality, so arrays and
plain objects work (but not `Map`/`Set` — convert those first). Unlike a pure
structural check, `validate-puzzles` also **compiles the `solution` and runs it
against every test**, so a stored `expected` can't drift from a working answer.

## How "today's puzzle" is chosen

`public/puzzles/index.json` has a launch `epoch` date and an ordered list of
`days`. The app shows `days[daysSinceEpoch mod days.length]`, cycling through the
full set. The order is curated to interleave difficulty rather than ramp it, so a
daily player gets variety. The running puzzle number (Wordle-style `#N`) is the
day count since launch, independent of which file is shown. Swap the modulo in
`src/lib/loadPuzzle.js` for a strict 1:1 date→day mapping once there's a full
calendar.

## Deployment

Site deployed to **Cloudflare Workers**. The
[`Deploy to Cloudflare`](.github/workflows/deploy.yml) workflow runs on manual
dispatch.

## Where this goes next

- **More languages**: same puzzle, language-idiomatic implementations. JS/TS run
  in-browser; Python (Pyodide) and Rust (wasm) can too with more setup; Go, PHP,
  Swift want a sandboxed backend test runner. Keep the YAML schema language-aware
  (a `language` field + per-language `starterCode`/`tests`) so one puzzle file can
  describe all variants.
- **Leaderboards / sharing**: the share string is spoiler-free today; a backend
  could aggregate times and golf scores.

> Made by [Zander Martineau](https://zander.wtf)
