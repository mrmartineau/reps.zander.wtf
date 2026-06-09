---
name: new-puzzle
description: Scaffold a new Reps puzzle as a validated YAML draft in submissions/. Use when a contributor wants to author, draft, write, or add a new puzzle for the daily JavaScript puzzle game. Walks the idea through difficulty calibration, the three-test structure, the file format, and runs validate-submissions before finishing.
---

# Create a new Reps puzzle

Guide a contributor from a puzzle idea to a validated `submissions/<name>.yaml`
draft that passes `pnpm validate-submissions`. The authoritative rules live in
[`CONTRIBUTORS.md`](../../../CONTRIBUTORS.md) — this skill operationalises them.

`submissions/` ships two worked reference drafts, `example-count-vowels.yaml` and
`example-sum-array.yaml` — point the contributor at them for a real template.
The `example-` prefix is **reserved**: those files stay in `submissions/`
permanently and are never promoted to the live set. Don't name a new draft
`example-*`.

## Workflow

### 1. Pin down the idea

Ask the contributor (or infer from what they gave you) the **one transform** the
puzzle teaches. Good puzzles are a single, self-contained idea solvable in 5–15
lines without looking anything up: a string transform, an array reshape, a bit of
math, a classic algorithm. Real-world flavour beats abstract ("group these orders
by category" > "transform array X into array Y").

Reject / reshape if it is:

- **A one-liner with no decision** (`isEven`, `double`). Fold the idea into
  something with shape — `sumEvens`, `partitionByParity`.
- **Not pure** — depends on randomness, dates, the network, current time, or
  locale; or relies on `console` side effects. The runner compares the **return
  value** only.
- **Engine-dependent output** — locale-aware sort, float formatting. If output is
  a float, round it and say so in the prompt.
- **A look-it-up trick** — DP, graph traversal, heavy bit-twiddling. Reps is a
  daily warm-up, not LeetCode Hard. Inputs must be small enough that a clear,
  unoptimised solution finishes inside the runner's 2-second timeout.

### 2. Calibrate difficulty honestly

The badge drives rotation ordering, so be accurate:

- **easy** — one method or a short loop. `sumEvens`, `range`, `capitalizeWords`.
- **medium** — combine 2–3 steps, or a standard algorithm. `chunk`, `gcd`,
  `groupByCategory`, `runLengthEncode`.
- **hard** — a non-obvious algorithm or multi-stage pipeline. `isBalanced`
  (stack), `summariseByCategory` (filter → group → summarise).

### 3. Write exactly three tests

Always three, ordered by strictness:

1. **Happy path** — the obvious case straight from the prompt.
2. **A second normal case** — proves it generalises, isn't hardcoded.
3. **An edge case** — empty input, zero, a tie, no match, wrap-around.

Rules that trip people up (the validator enforces these):

- **Return arrays/objects, never `Map`/`Set`.** Those don't deep-compare; convert
  to a plain array/object first. The validator hard-fails a `Map`/`Set` return.
- **`expected` is a literal.** Write the value out; don't compute it. The
  validator runs your `solution` and asserts it deep-equals `expected`.
- **`args` is spread into the call:** `args: [a, b]` → `fn(a, b)`.
- Inputs are deep-cloned before each run, so mutating arguments is safe — but
  returning a fresh value is nicer style.

### 4. Write the file

Create `submissions/<function-name>.yaml` (kebab-case, named after the function,
e.g. `chunk-array.yaml`). Use `id: 0` — a maintainer assigns the real id on
acceptance. Day numbers and ordering are **curated**, not first-come — never set a
real `id` or touch `public/puzzles/` or `index.json`. Don't use the reserved
`example-` filename prefix.

```yaml
id: 0 # leave as 0 — a maintainer assigns the real id on acceptance
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

Field notes:

- **`prompt`** is GitHub-flavoured Markdown. Backtick code/identifiers, blank line
  between paragraphs, and **always include a worked example** — biggest
  comprehension win.
- **`functionName`** must appear verbatim in both `starterCode` and `solution`.
- **`solution`** is shown to players on demand — keep it clear and idiomatic, not
  code-golfed; they read it to learn.
- **`solutionExplanation`** (optional, but strongly encouraged) — Markdown that
  **teaches** the puzzle to a player who got stuck and couldn't solve it. This is
  the educational payoff, not a code summary. Write it for someone who read the
  prompt, tried, and didn't see the path. Aim to:
  - **Name the core insight** — the one idea that unlocks it ("the trick is to
    walk the array in steps of `size`", "use a stack so the most recent open
    bracket is on top"). Lead with this.
  - **Build up the approach step by step**, in plain language, mapping each step
    back to the prompt. Explain *why* this works, not just *what* the code does.
  - **Call out the gotcha** that the edge-case test guards (empty input, a tie,
    wrap-around) and why a naive attempt trips on it.
  - **Mention an alternative or a "you might have tried…"** when it helps — show
    the dead-end and why the chosen path is cleaner.
  - Keep a teaching tone: short paragraphs, backtick identifiers, a worked trace
    of one tricky case if it clarifies. Assume curiosity, not expertise. Don't
    just restate the `solution` line by line — explain the thinking that produces
    it, so the player can solve the *next* puzzle like it on their own.

### 5. Validate before finishing

```bash
pnpm validate-submissions
```

This checks structure **and** compiles the `solution` and runs it against all
three tests — green means it'll pass CI. Fix any failure and re-run until clean.
Report the result to the contributor.

### 6. Next steps to tell the contributor

- Optionally preview in the browser: `pnpm dev`, then open `/submissions.html`
  and pick the puzzle from the dropdown.
- Open a PR. CI re-runs validation and (for branches in this repo, not forks)
  deploys a live preview the maintainer can play. A maintainer reviews for quality
  and difficulty fit, then promotes it into `public/puzzles/` with a real id.
  **Live files are named `puzzle-NNN.yaml` with the id zero-padded to 3 digits**
  (id 7 → `puzzle-007.yaml`, id 42 → `puzzle-042.yaml`) — the loader fetches the
  padded path, so an unpadded filename won't load. Promotion is automated by the
  `Promote submissions` GitHub workflow (`scripts/promote-submissions.mjs`), which
  skips the `example-*.yaml` reference files.

## Variants (advanced)

Puzzles also support `kind: react-component` and `kind: react-hook`. These use
`componentName` instead of `functionName` and a different test shape (components
assert against rendered DOM via an `assert` block). They can't execute in the
Node validator — only structure + JSX compile are checked. Default to plain
`function` puzzles unless the contributor specifically wants a React one; if so,
copy the shape from an existing `react-component` / `react-hook` puzzle in
`public/puzzles/` rather than guessing.

## Checklist before declaring done

- [ ] One clear idea, pure function, no side effects or time/locale dependence
- [ ] Honest `difficulty`, not a trivial one-liner
- [ ] Prompt explains it plainly **with a worked example**
- [ ] Exactly three tests: happy path, second case, edge case
- [ ] Returns arrays/objects (not `Map`/`Set`)
- [ ] `solutionExplanation` teaches the insight (not a code restatement), for a
      player who got stuck
- [ ] File is in `submissions/` with `id: 0`, named after the function (not
      `example-*`)
- [ ] `pnpm validate-submissions` passes
