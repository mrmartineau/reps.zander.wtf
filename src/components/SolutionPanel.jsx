import { useState } from 'react';
import { Button } from '@mrmartineau/zui/react';
import { ReadOnlyCode } from './ReadOnlyCode.jsx';
import { Markdown } from './Markdown.jsx';

// Reveals the puzzle's recommended solution beneath the editor. Hidden behind a
// click so it never spoils the puzzle by accident. `explanation` is optional
// Markdown that walks through how the solution works.
export function SolutionPanel({ solution, explanation }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!solution) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  }

  return (
    <section className="solution">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
      >
        {shown ? 'Hide solution' : 'Show recommended solution'}
      </Button>

      {shown && (
        <div className="solution-reveal">
          <div className="solution-bar">
            <span className="solution-label">Recommended solution — one way to solve it</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <ReadOnlyCode value={solution} />
          {explanation && (
            <Markdown className="solution-explanation markdown">{explanation}</Markdown>
          )}
        </div>
      )}
    </section>
  );
}
