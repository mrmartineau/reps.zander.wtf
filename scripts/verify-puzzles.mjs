// Structural validator for puzzle YAML files. Run before committing a new
// puzzle: `npm run verify-puzzles`. It checks shape, not answer correctness
// (answers aren't stored in the file), so it catches the common mistakes —
// missing fields, wrong test count, function name not matching the starter.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const dir = path.join(process.cwd(), 'public', 'puzzles');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

let ok = true;
const fail = (file, msg) => {
  ok = false;
  console.log(`❌ ${file}: ${msg}`);
};

for (const file of files) {
  let p;
  try {
    p = yaml.load(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (e) {
    fail(file, `YAML parse error: ${e.message}`);
    continue;
  }

  // Components are keyed by `componentName`; functions and hooks by
  // `functionName`. Their tests differ too: components assert against rendered
  // DOM, everything else maps args → expected.
  const kind = p.kind ?? 'function';
  const isComponent = kind === 'react-component';
  const entryField = isComponent ? 'componentName' : 'functionName';
  const entryName = p[entryField];

  for (const field of ['day', 'title', 'prompt', 'starterCode', 'tests']) {
    if (p[field] == null) fail(file, `missing "${field}"`);
  }
  if (entryName == null) fail(file, `missing "${entryField}"`);
  if (Array.isArray(p.tests)) {
    if (p.tests.length !== 3) fail(file, `expected 3 tests, found ${p.tests.length}`);
    p.tests.forEach((t, i) => {
      if (!t.name) fail(file, `test ${i} missing "name"`);
      if (isComponent) {
        if (!t.assert || typeof t.assert !== 'object' || Array.isArray(t.assert)) fail(file, `test ${i} missing "assert" object`);
      } else {
        if (!Array.isArray(t.args)) fail(file, `test ${i} "args" must be an array`);
        if (!('expected' in t)) fail(file, `test ${i} missing "expected"`);
      }
    });
  } else {
    fail(file, '"tests" must be an array');
  }
  if (entryName && p.starterCode && !p.starterCode.includes(entryName)) {
    fail(file, `starterCode doesn't mention "${entryName}"`);
  }
  if (p.solution == null) {
    fail(file, 'missing "solution" (the recommended answer shown on demand)');
  } else if (entryName && !p.solution.includes(entryName)) {
    fail(file, `solution doesn't define "${entryName}"`);
  }
  if (!['easy', 'medium', 'hard'].includes(p.difficulty)) {
    fail(file, `"difficulty" must be easy | medium | hard (got ${JSON.stringify(p.difficulty)})`);
  }
  if (ok) console.log(`✅ ${file} — ${p.title}`);
}

if (!ok) {
  console.log('\nValidation failed.');
  process.exit(1);
}
console.log(`\nAll ${files.length} puzzles valid.`);
