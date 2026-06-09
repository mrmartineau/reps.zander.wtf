# CLAUDE.md

## What this is

Reps — a Wordle-style daily JavaScript puzzle game. The player writes a small function in a Monaco editor; it runs against three tests entirely in-browser. No backend; static-assets-only Cloudflare Workers deploy.

## Commands

- `pnpm dev` — local dev server (runs `prepare-submissions` first, then Vite).
- `pnpm build` — production build → `dist/` + generated `dist/wrangler.json`.
- `pnpm deploy` — build + `wrangler deploy` (needs Cloudflare auth).
- `pnpm validate-puzzles` — structural check of `public/puzzles/*.yaml` **and runs every reference `solution` against its own `tests`**. This is the closest thing to a test suite — run it after touching any puzzle or the runner/equality logic.
- `pnpm validate-submissions` — same check against `submissions/`.

Package manager is **pnpm** (`pnpm@11.5.0`). There is no unit-test runner; "tests" are the per-puzzle cases, exercised by `validate-puzzles` or by playing a puzzle in the browser. To eyeball one puzzle, preview it: `?day=N`.

## Architecture

**Two client entry points, one shared lib.** `index.html` → `src/main.jsx` → `App.jsx` (the game). `submissions.html` → `src/submissions/main.jsx` → `SubmissionsApp.jsx` (contributor preview page). Both are scoped as client entries in `vite.config.js`; there is no Worker entry — `@cloudflare/vite-plugin` emits `dist/wrangler.json` for a static-assets site with SPA fallback.

**Puzzles are plain YAML data, not code.** Live puzzles live in `public/puzzles/puzzle-NNN.yaml` (each: `id`, `title`, `difficulty`, `prompt` markdown, `functionName` — or `componentName` for `kind: react-component` — `starterCode`, `tests[]`, `solution`, optional `solutionExplanation` markdown). `id` is a stable identifier + the filename key (`puzzle-NNN.yaml`), **not** "the day it appears". `public/puzzles/index.json` holds `epoch` + a curated `days[]` array of `{ id, title }` entries; **array order alone determines the schedule** (`days[elapsed % length]`), so the `id` values can be any order. **Adding a file does not add it to rotation** — a maintainer must add its `{ id, title }` entry to `index.json`. Editing a puzzle `title` requires syncing the index entry (caught by `validate-puzzles`).

**Date → puzzle mapping (`src/lib/loadPuzzle.js`).** Currently *cycling* mode: `daysBetween(epoch, today) % days.length` picks the puzzle file, so the calendar never runs out (strict 1:1 mapping is stubbed in comments for later). `puzzleNumber` (running count since launch) is distinct from `id` (which puzzle file is showing). "Today" is the player's **local** date, not UTC (Wordle-style local-midnight rollover). Because the SPA fallback serves `index.html` (HTTP 200) for missing files, `loadPuzzleById` validates the parsed shape to detect a genuinely-missing puzzle.

**Sandboxed execution (`src/lib/runner.js` + `worker.js`).** Each test runs in a **fresh Web Worker** with a hard 2s timeout, so an infinite loop is killed by terminating the worker instead of hanging the page. The worker builds the user's code via `new Function` in strict mode, `structuredClone`s args (so a mutating solution can't poison comparison), compares with `deepEqual` (`src/lib/equal.js`), and captures `console.*` output to show beside each result.

**Persistence (`src/lib/storage.js`).** `localStorage` only. Three namespaces: completed-run state (`reps:v1`, keyed by date), in-progress editor drafts (`reps:draft:v1`, saved on a debounce so results/streak aren't touched per keystroke), plus derived history/streak/stats. **Preview mode never reads or writes storage** — testing an upcoming puzzle can't clobber real progress.

**Preview/query params (`getPreviewParams`).** `?id=N` (aliases `?preview=N` / `?day=N`) loads a puzzle file directly by its id; `?date=YYYY-MM-DD` simulates date-cycling for a future day. These are convenience, not secrecy — puzzle YAML is public.

**Submissions flow.** Drafts go in `submissions/*.yaml` with `id: 0`. `scripts/prepare-submissions.mjs` (run automatically by `dev`/`build`) copies them into `public/submissions/` (gitignored, regenerated each run) plus a manifest, which `submissions.html` fetches. PRs touching `submissions/` get a Cloudflare preview deploy (see `.github/workflows/`); fork PRs can't deploy (no credentials). See `CONTRIBUTORS.md` for the curation/promotion process.

## Conventions

- UI is built with **ZUI** (`@mrmartineau/zui`) — prefer its components/tokens/`zui-*` classes over hand-rolled markup.
- `scripts/generate-puzzles.mjs`, `improve-solutions.mjs`, `add-explanations.mjs` are **one-off authoring tools** that bulk-edit puzzle YAML, not part of the build. Idempotent where it matters; safe to re-read before reusing.
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/)** — `type(scope): subject`, e.g. `feat(puzzles):`, `fix:`, `refactor:`, `chore:`, `docs:`. Imperative subject, ≤~50 chars; use the body to explain the *why* when it isn't obvious. Common scopes: `puzzles`, `runner`, `storage`, `ui`.
