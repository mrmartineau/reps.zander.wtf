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

  for (const field of ['day', 'title', 'prompt', 'functionName', 'starterCode', 'tests']) {
    if (p[field] == null) fail(file, `missing "${field}"`);
  }
  if (Array.isArray(p.tests)) {
    if (p.tests.length !== 3) fail(file, `expected 3 tests, found ${p.tests.length}`);
    p.tests.forEach((t, i) => {
      if (!t.name) fail(file, `test ${i} missing "name"`);
      if (!Array.isArray(t.args)) fail(file, `test ${i} "args" must be an array`);
      if (!('expected' in t)) fail(file, `test ${i} missing "expected"`);
    });
  } else {
    fail(file, '"tests" must be an array');
  }
  if (p.functionName && p.starterCode && !p.starterCode.includes(p.functionName)) {
    fail(file, `starterCode doesn't mention "${p.functionName}"`);
  }
  if (p.solution == null) {
    fail(file, 'missing "solution" (the recommended answer shown on demand)');
  } else if (p.functionName && !p.solution.includes(p.functionName)) {
    fail(file, `solution doesn't define "${p.functionName}"`);
  }
  if (ok) console.log(`✅ ${file} — ${p.title}`);
}

if (!ok) {
  console.log('\nValidation failed.');
  process.exit(1);
}
console.log(`\nAll ${files.length} puzzles valid.`);
