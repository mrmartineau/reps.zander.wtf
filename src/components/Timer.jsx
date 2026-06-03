import { useEffect, useState } from 'react';
import { formatTime } from '../lib/share.js';

export function Timer({ startedAt, frozenMs }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (frozenMs != null || startedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, frozenMs]);

  const elapsed =
    frozenMs != null ? frozenMs : startedAt == null ? 0 : now - startedAt;

  return (
    <span className="timer" aria-label="Elapsed time">
      {formatTime(elapsed)}
    </span>
  );
}
