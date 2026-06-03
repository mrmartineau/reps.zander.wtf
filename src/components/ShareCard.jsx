import { useState } from 'react';
import { Button } from '@mrmartineau/zui/react';
import { buildShareText, copyToClipboard } from '../lib/share.js';

export function ShareCard({ puzzle, results, elapsedMs, chars, streak }) {
  const [copied, setCopied] = useState(false);
  const allPassed = results.every((r) => r.pass);
  const text = buildShareText(puzzle, results, elapsedMs, chars);

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="share-card">
      <p className="share-headline">
        {allPassed ? 'Solved!' : 'Run complete'}
        {streak > 1 && <span className="streak"> · {streak} day streak 🔥</span>}
      </p>
      {allPassed && typeof chars === 'number' && (
        <p className="share-golf">⛳ {chars} characters of JavaScript</p>
      )}
      <pre className="share-preview">{text}</pre>
      <Button onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy result'}
      </Button>
    </div>
  );
}
