# Puzzle submissions (drafts)

Drop a **proposed** puzzle here as a `.yaml` file and open a pull request. This
folder is **not** shipped to the site — it's a holding area. A maintainer
reviews each submission and, if accepted, promotes it into the live rotation
(`public/puzzles/` as `puzzle-NNN.yaml`), assigns its real `id`, and adds a
`{ id, title }` entry to `public/puzzles/index.json`.

That keeps ids collision-free and lets maintainers curate the
difficulty spread — see [CONTRIBUTORS.md](../CONTRIBUTORS.md) for the full
guidelines on what makes a good puzzle.

## Before you open the PR

Validate your file locally — CI runs the exact same check:

```bash
npm run validate-submissions
```

This checks the shape **and** compiles your `solution` and runs it against all
three tests. Name the file after your function, e.g. `chunk-array.yaml`.

## Template

```yaml
id: 0 # leave as 0 — a maintainer assigns the real id on acceptance
title: "Your Puzzle Title"
difficulty: medium # easy | medium | hard
prompt: |
  Implement `yourFunction(args)` so it does the thing. Explain it plainly.

  For example, `yourFunction(input)` returns `output`.
functionName: yourFunction
starterCode: |
  function yourFunction(args) {
    // your code here
  }
tests:
  - name: "Case 1"
    args: [input1]
    expected: output1
  - name: "Case 2"
    args: [input2]
    expected: output2
  - name: "Case 3 (edge case)"
    args: [input3]
    expected: output3
solution: |
  function yourFunction(args) {
    return /* a correct, readable reference answer */;
  }
```
