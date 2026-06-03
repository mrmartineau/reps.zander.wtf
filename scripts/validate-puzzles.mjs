// Full puzzle validator: structure + correctness. Unlike verify-puzzles (shape
// only), this also compiles each puzzle's `solution` and runs it against every
// test, asserting the result deep-equals `expected` — the same comparison the
// in-browser runner uses. Used by contributors and CI.
//
// Usage:
//   node scripts/validate-puzzles.mjs                 # validates public/puzzles
//   node scripts/validate-puzzles.mjs submissions     # validates a drafts dir
//   node scripts/validate-puzzles.mjs path/to/file.yaml ...   # specific files
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

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

const REQUIRED = ['day', 'title', 'difficulty', 'prompt', 'functionName', 'starterCode', 'tests', 'solution'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

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
const seenDays = new Map();
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

  // ---- structure ----
  for (const field of REQUIRED) {
    if (p[field] == null) fail(file, `missing "${field}"`);
  }
  if (!DIFFICULTIES.includes(p.difficulty)) {
    fail(file, `"difficulty" must be one of ${DIFFICULTIES.join(' | ')} (got ${JSON.stringify(p.difficulty)})`);
  }
  // day 0 = unassigned placeholder (used in submissions/ before promotion).
  if (!Number.isInteger(p.day) || p.day < 0) {
    fail(file, `"day" must be a non-negative integer — 0 for an unassigned draft (got ${JSON.stringify(p.day)})`);
  } else if (p.day > 0 && seenDays.has(p.day)) {
    fail(file, `duplicate day ${p.day} (also in ${seenDays.get(p.day)})`);
  } else if (p.day > 0) {
    seenDays.set(p.day, path.basename(file));
  }
  if (p.functionName && p.starterCode && !p.starterCode.includes(p.functionName)) {
    fail(file, `starterCode doesn't define "${p.functionName}"`);
  }
  if (p.functionName && p.solution && !p.solution.includes(p.functionName)) {
    fail(file, `solution doesn't define "${p.functionName}"`);
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
    if (!Array.isArray(t.args)) fail(file, `test ${i} "args" must be an array`);
    if (!('expected' in t)) fail(file, `test ${i} missing "expected"`);
  });

  if (!ok) continue;

  // ---- correctness: the reference solution must pass every test ----
  let fn;
  try {
    fn = new Function(`"use strict";\n${p.solution}\n;return typeof ${p.functionName} === "function" ? ${p.functionName} : undefined;`)();
  } catch (e) {
    fail(file, `solution failed to compile: ${e.message}`);
    continue;
  }
  if (typeof fn !== 'function') {
    fail(file, `solution doesn't produce a function named "${p.functionName}"`);
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

if (!ok) {
  console.log('\nValidation failed.');
  process.exit(1);
}
console.log(`\nAll ${files.length} puzzle(s) valid — structure and solutions check out.`);
