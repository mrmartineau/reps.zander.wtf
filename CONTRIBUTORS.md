# Contributing a puzzle

Reps is a daily JavaScript puzzle game. Every puzzle is one plain-YAML file:
a prompt, a function to implement, three tests, and a reference solution. This
guide covers **what makes a good puzzle** and **how to get yours added**.

## How submissions work

It's **not** first-come-first-serve on day numbers. Day numbers and the order
puzzles appear in are *curated* — the rotation is deliberately
difficulty-mixed so newcomers aren't scared off by a hard puzzle three days
running. If everyone picked their own `day`, numbers would collide and the
difficulty spread would drift.

So instead:

1. **Draft it** — add your puzzle as a `.yaml` file in [`submissions/`](./submissions/),
   with `day: 0` (a placeholder). This folder is a holding area; it isn't shipped
   to the live site.
2. **Validate it** — run `npm run validate-submissions`. CI runs the same check
   on your PR automatically.
3. **Open a PR.** A maintainer reviews it for quality and difficulty fit.
4. **Promotion** — if accepted, a maintainer moves the file into
   `public/puzzles/`, assigns the real `day` number, and slots it into the
   difficulty-interleaved order in `public/puzzles/index.json`. You keep the
   authorship in the git history.

This keeps the barrier to contributing low (just write a good puzzle) while
letting maintainers own pacing and ordering.

## What makes a good puzzle

The sweet spot is a **small, self-contained transform** that a working
developer would recognise — solvable in 5–15 lines, in a few minutes, without
looking anything up.

**Aim for:**

- **One clear idea.** A single concept — a string transform, an array reshape,
  a bit of math, a classic algorithm. Not a multi-part question.
- **A pure function.** Same input → same output. No randomness, no dates, no
  network, no `console` side effects (the runner compares the **return value**).
  No reliance on the current time or locale.
- **An obvious "aha".** The fun is recognising the approach (`reduce`, a `Set`,
  a regex, two pointers). The grind shouldn't be in parsing the prompt.
- **Real-world flavour where you can.** "Group these orders by category" lands
  better than "transform array X into array Y."
- **Determinism across engines.** Avoid things that differ by environment
  (locale-aware sorting, float formatting). If output is a float, round it and
  say so in the prompt.

**Difficulty calibration** (be honest — it shows as a badge and drives ordering):

- **easy** — one method or a short loop. `sumEvens`, `range`, `capitalizeWords`.
- **medium** — combine 2–3 steps, or a standard algorithm. `chunk`, `gcd`,
  `groupByCategory`, `runLengthEncode`.
- **hard** — a non-obvious algorithm or a multi-stage pipeline. `isBalanced`
  (stack), `summariseByCategory` (filter → group → summarise).

### Too easy vs. just right

`isEven(n)` is **too easy** — it's a single `%` with no insight. But the *idea*
of even/odd is fine as an ingredient: `sumEvens(nums)` (filter then reduce) or
`partitionByParity(nums)` earns its place. Rule of thumb: if the body is one
trivial expression with no decision to make, fold it into something with a bit
more shape.

### Too hard

If solving needs a known trick most people would have to look up (dynamic
programming, graph traversal, bit-twiddling), it belongs elsewhere. Reps is a
daily warm-up, not LeetCode Hard. Keep inputs small enough that a clear,
unoptimised solution passes within the runner's 2-second timeout.

## The three tests

Every puzzle has **exactly three** tests, ordered by strictness:

1. **Happy path** — the obvious case from the prompt.
2. **A second normal case** — proves it generalises, not hardcoded.
3. **An edge case** — empty input, zero, a tie, no match, wrap-around.

Tests compare with a structural deep-equality (primitives, arrays, plain
objects, `NaN`-aware). **Return arrays/objects, not `Map`/`Set`** — those don't
compare correctly; convert to an array or plain object first. Inputs are
deep-cloned before each run, so mutating your arguments is safe (but returning
a fresh value is nicer style).

## File format

```yaml
day: 0 # placeholder in submissions/; a maintainer assigns the real number
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

- **`prompt`** is Markdown (GitHub-flavoured). Wrap code/identifiers in
  backticks. **Always include a worked example** — it's the single biggest
  comprehension win. Use a blank line between paragraphs.
- **`functionName`** must appear in both `starterCode` and `solution`.
- **`args`** are spread into the call: `args: [a, b]` → `fn(a, b)`.
- **`expected`** is the literal expected return value. Don't compute it — write
  it out; the validator confirms your `solution` actually produces it.
- **`solution`** is the recommended answer shown on demand. Keep it **clear and
  idiomatic**, not code-golfed — players read it to learn.

## Validate before you PR

```bash
npm run validate-submissions   # your drafts in submissions/
npm run validate-puzzles       # the live set (run if you edited those)
```

The validator checks structure **and** compiles your `solution` and runs it
against all three tests — a green run means it'll pass CI.

## Quick checklist

- [ ] One clear idea, pure function, no side effects or time/locale dependence
- [ ] Honest `difficulty`, and not a one-liner like `isEven`
- [ ] Prompt explains it plainly **with a worked example**
- [ ] Exactly three tests: happy path, second case, edge case
- [ ] Returns arrays/objects (not `Map`/`Set`)
- [ ] `npm run validate-submissions` passes
- [ ] File is in `submissions/` with `day: 0`
