// Promotes every draft in `submissions/*.yaml` into the live puzzle set:
//   - assigns the next free id (highest id in use + 1, incrementing per draft)
//   - writes it to `public/puzzles/puzzle-NNN.yaml` (id zero-padded to 3 digits,
//     matching the path the loader fetches)
//   - removes the draft from `submissions/`
//   - appends a `{ id, title }` entry to `public/puzzles/index.json` `days[]`
//
// Files named `example-*.yaml` are permanent reference examples — they stay in
// `submissions/` and are never promoted (see EXAMPLE_PREFIX below).
//
// New entries are appended to the END of `days[]` so no already-served calendar
// position shifts — past dates keep mapping to the same puzzle (see CLAUDE.md
// "Date → puzzle mapping"). Run `validate-puzzles` afterwards to confirm the
// result compiles and the index stays consistent.
//
// Usage: node scripts/promote-submissions.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const subsDir = path.join(root, 'submissions');
const liveDir = path.join(root, 'public', 'puzzles');
const indexPath = path.join(liveDir, 'index.json');

// `example-*.yaml` are kept in submissions/ as reference examples for
// contributors — never promote them.
const EXAMPLE_PREFIX = 'example-';

// Fisher-Yates in-place shuffle so the order drafts land in `days[]` (and thus
// their calendar position) isn't tied to filename ordering.
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const drafts = shuffle(
  fs
    .readdirSync(subsDir)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith(EXAMPLE_PREFIX)),
);

if (drafts.length === 0) {
  console.log('No submissions to promote (example-*.yaml are kept as examples).');
  process.exit(0);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const idOf = (entry) =>
  typeof entry === 'object' && entry !== null ? entry.id ?? entry.day : entry;

// Highest id already in use — across live puzzle files AND the index — so a new
// id never collides even if the two ever drift.
const liveIds = fs
  .readdirSync(liveDir)
  .filter((f) => /^puzzle-\d+\.yaml$/.test(f))
  .map((f) => {
    try {
      return yaml.load(fs.readFileSync(path.join(liveDir, f), 'utf8'))?.id;
    } catch {
      return undefined;
    }
  })
  .filter(Number.isInteger);
const indexIds = index.days.map(idOf).filter(Number.isInteger);
let nextId = Math.max(0, ...liveIds, ...indexIds) + 1;

const promoted = [];
for (const draft of drafts) {
  const draftPath = path.join(subsDir, draft);
  const text = fs.readFileSync(draftPath, 'utf8');

  let doc;
  try {
    doc = yaml.load(text);
  } catch (e) {
    console.error(`✗ ${draft}: YAML parse error — ${e.message}`);
    process.exit(1);
  }
  if (!doc || doc.title == null) {
    console.error(`✗ ${draft}: missing "title" — cannot index it`);
    process.exit(1);
  }

  const id = nextId++;
  const padded = String(id).padStart(3, '0');
  const destName = `puzzle-${padded}.yaml`;
  const dest = path.join(liveDir, destName);
  if (fs.existsSync(dest)) {
    console.error(`✗ ${destName} already exists — aborting to avoid overwrite`);
    process.exit(1);
  }

  // Preserve the draft verbatim except its id line (and drop the "leave as 0"
  // comment). Avoids reflowing the YAML the way load+dump would.
  const out = /^id:.*$/m.test(text)
    ? text.replace(/^id:.*$/m, `id: ${id}`)
    : `id: ${id}\n${text}`;

  fs.writeFileSync(dest, out);
  fs.rmSync(draftPath);
  index.days.push({ id, title: doc.title });
  promoted.push({ draft, destName, id, title: doc.title });
  console.log(`✔ ${draft} → ${destName} (id ${id}, "${doc.title}")`);
}

fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(
  `\nPromoted ${promoted.length} submission(s); index.json now lists ${index.days.length} puzzles.`,
);
