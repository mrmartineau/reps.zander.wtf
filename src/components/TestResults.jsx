export function TestResults({ results }) {
  if (!results) return null;

  return (
    <ul className="results" aria-live="polite">
      {results.map((r, i) => (
        <li key={i} className={r.pass ? 'result pass' : 'result fail'}>
          <span className="result-icon" aria-hidden="true">
            {r.pass ? '🟩' : '⬛'}
          </span>
          <div className="result-body">
            <span className="result-name">{r.name}</span>
            {!r.pass && r.error && (
              <span className="result-detail">{r.error}</span>
            )}
            {!r.pass && !r.error && (
              <span className="result-detail">
                expected <code>{r.expected}</code> · got{' '}
                <code>{r.received}</code>
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
