// Puzzle validator: structure + correctness. Compiles each puzzle's `solution`
// and runs it against every test, asserting the result deep-equals `expected` —
// the same comparison the in-browser runner uses. Also cross-checks index.json.
// This is the project's test suite. Used by contributors and CI.
//
// Usage:
//   node scripts/validate-puzzles.mjs                 # validates public/puzzles
//   node scripts/validate-puzzles.mjs submissions     # validates a drafts dir
//   node scripts/validate-puzzles.mjs path/to/file.yaml ...   # specific files
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { transform } from 'sucrase';

// Mirrors src/lib/equal.js so validation matches in-browser behaviour exactly.
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

// Fields every puzzle needs, regardless of kind. The entry-point field
// (functionName vs componentName) and per-test shape vary by kind below.
const REQUIRED_COMMON = ['id', 'title', 'difficulty', 'prompt', 'starterCode', 'tests', 'solution'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const KINDS = ['function', 'react-component', 'react-hook'];

// Resolve args → list of yaml files.
const args = process.argv.slice(2);
const targets = args.length ? args : ['public/puzzles'];
const files = [];
for (const target of targets) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) continue;
  if (fs.statSync(abs).isDirectory()) {
    for (const f of fs.readdirSync(abs).filter((f) => f.endsWith('.yaml')).sort()) {
      files.push(path.join(abs, f));
    }
  } else if (abs.endsWith('.yaml')) {
    files.push(abs);
  }
}

if (files.length === 0) {
  console.log('No puzzle files to validate.');
  process.exit(0);
}

let ok = true;
const seenIds = new Map();
const metaById = new Map(); // id → { title } for the index.json cross-check
const fail = (file, msg) => {
  ok = false;
  console.log(`❌ ${path.basename(file)}: ${msg}`);
};

for (const file of files) {
  let p;
  try {
    p = yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(file, `YAML parse error: ${e.message}`);
    continue;
  }

  // ---- structure (common) ----
  const kind = p.kind ?? 'function';
  if (!KINDS.includes(kind)) {
    fail(file, `"kind" must be one of ${KINDS.join(' | ')} (got ${JSON.stringify(p.kind)})`);
  }
  // Components are identified by `componentName`; functions and hooks by
  // `functionName`.
  const isComponent = kind === 'react-component';
  const entryField = isComponent ? 'componentName' : 'functionName';
  const entryName = p[entryField];

  for (const field of REQUIRED_COMMON) {
    if (p[field] == null) fail(file, `missing "${field}"`);
  }
  if (entryName == null) fail(file, `missing "${entryField}"`);
  if (!DIFFICULTIES.includes(p.difficulty)) {
    fail(file, `"difficulty" must be one of ${DIFFICULTIES.join(' | ')} (got ${JSON.stringify(p.difficulty)})`);
  }
  // id 0 = unassigned placeholder (used in submissions/ before promotion).
  if (!Number.isInteger(p.id) || p.id < 0) {
    fail(file, `"id" must be a non-negative integer — 0 for an unassigned draft (got ${JSON.stringify(p.id)})`);
  } else if (p.id > 0 && seenIds.has(p.id)) {
    fail(file, `duplicate id ${p.id} (also in ${seenIds.get(p.id)})`);
  } else if (p.id > 0) {
    seenIds.set(p.id, path.basename(file));
  }
  if (p.id > 0 && p.title != null) metaById.set(p.id, { title: p.title });
  if (entryName && p.starterCode && !p.starterCode.includes(entryName)) {
    fail(file, `starterCode doesn't define "${entryName}"`);
  }
  if (entryName && p.solution && !p.solution.includes(entryName)) {
    fail(file, `solution doesn't define "${entryName}"`);
  }

  if (!Array.isArray(p.tests)) {
    fail(file, '"tests" must be an array');
    continue;
  }
  if (p.tests.length !== 3) {
    fail(file, `expected exactly 3 tests, found ${p.tests.length}`);
  }
  p.tests.forEach((t, i) => {
    if (!t.name) fail(file, `test ${i} missing "name"`);
    if (isComponent) {
      // Component tests assert against rendered DOM via a declarative block.
      if (!t.assert || typeof t.assert !== 'object' || Array.isArray(t.assert)) fail(file, `test ${i} missing "assert" object`);
      if ('props' in t && (typeof t.props !== 'object' || Array.isArray(t.props))) {
        fail(file, `test ${i} "props" must be an object`);
      }
    } else {
      if (!Array.isArray(t.args)) fail(file, `test ${i} "args" must be an array`);
      if (!('expected' in t)) fail(file, `test ${i} missing "expected"`);
    }
  });

  if (!ok) continue;

  // ---- correctness ----
  // React kinds can't run here (no DOM in Node), so we settle for confirming
  // their starter + solution at least compile through the same JSX transform
  // the browser uses. Plain functions are fully executed against their tests.
  if (kind !== 'function') {
    for (const [labelText, src] of [['starterCode', p.starterCode], ['solution', p.solution]]) {
      try {
        transform(src, { transforms: ['jsx'], jsxRuntime: 'classic', production: true });
      } catch (e) {
        fail(file, `${labelText} failed to compile (JSX): ${e.message}`);
      }
    }
    if (ok) console.log(`✅ ${path.basename(file)} — ${p.title} (${p.difficulty}) [${kind}, structure + compile only]`);
    continue;
  }

  let fn;
  try {
    fn = new Function(`"use strict";\n${p.solution}\n;return typeof ${entryName} === "function" ? ${entryName} : undefined;`)();
  } catch (e) {
    fail(file, `solution failed to compile: ${e.message}`);
    continue;
  }
  if (typeof fn !== 'function') {
    fail(file, `solution doesn't produce a function named "${entryName}"`);
    continue;
  }
  for (const t of p.tests) {
    let received;
    try {
      received = fn(...structuredClone(t.args));
    } catch (e) {
      fail(file, `solution threw on "${t.name}": ${e.message}`);
      continue;
    }
    if (received instanceof Map || received instanceof Set) {
      fail(file, `"${t.name}" returns a Map/Set — the runner compares plain arrays/objects; convert it first`);
      continue;
    }
    if (!deepEqual(received, t.expected)) {
      fail(file, `solution output doesn't match "expected" for "${t.name}": got ${JSON.stringify(received)}, expected ${JSON.stringify(t.expected)}`);
    }
  }

  if (ok) console.log(`✅ ${path.basename(file)} — ${p.title} (${p.difficulty})`);
}

// ---- index.json consistency ----
// Only when validating a directory that ships an index.json (the live set, not
// a submissions draft dir or an explicit file list). Each entry must resolve to
// a real puzzle file, and its inline title must match that file — title
// duplicates the yaml for legibility, so guard against drift.
for (const target of targets) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
  const indexPath = path.join(abs, 'index.json');
  if (!fs.existsSync(indexPath)) continue;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    fail(indexPath, `JSON parse error: ${e.message}`);
    continue;
  }
  if (!Array.isArray(manifest.days)) {
    fail(indexPath, '"days" must be an array');
    continue;
  }

  const seenIndexIds = new Set();
  manifest.days.forEach((entry, i) => {
    if (typeof entry !== 'object' || entry === null) {
      fail(indexPath, `days[${i}] must be a { id, title } object (got ${JSON.stringify(entry)})`);
      return;
    }
    const { id, title } = entry;
    const meta = metaById.get(id);
    if (!meta) {
      fail(indexPath, `days[${i}] references id ${id}, which has no puzzle file`);
      return;
    }
    if (seenIndexIds.has(id)) fail(indexPath, `days[${i}] duplicate id ${id}`);
    seenIndexIds.add(id);
    if (title !== meta.title) {
      fail(indexPath, `days[${i}] (id ${id}) title "${title}" ≠ file title "${meta.title}"`);
    }
  });
  if (ok) console.log(`✅ index.json — ${manifest.days.length} days, titles match`);
}

if (!ok) {
  console.log('\nValidation failed.');
  process.exit(1);
}
console.log(`\nAll ${files.length} puzzle(s) valid — structure and solutions check out.`);
