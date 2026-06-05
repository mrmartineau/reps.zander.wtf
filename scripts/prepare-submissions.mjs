// Copies the draft puzzles from submissions/ into public/submissions/ so the
// submission-preview page (submissions.html) can fetch them, and writes an
// index.json manifest of them. public/submissions/ is generated (gitignored)
// and rebuilt on every dev/build run. No-op when there are no submissions.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const srcDir = path.join(process.cwd(), 'submissions');
const outDir = path.join(process.cwd(), 'public', 'submissions');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const files = fs.existsSync(srcDir)
  ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.yaml')).sort()
  : [];

const manifest = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
  let meta = {};
  try {
    const p = yaml.load(raw);
    meta = { title: p?.title ?? file, difficulty: p?.difficulty ?? null };
  } catch {
    meta = { title: file, difficulty: null, invalid: true };
  }
  fs.writeFileSync(path.join(outDir, file), raw);
  manifest.push({ file, ...meta });
}

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${manifest.length} submission(s) for preview.`);
