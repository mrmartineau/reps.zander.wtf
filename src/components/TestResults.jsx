export function TestResults({ results, pendingNames = [] }) {
  if (!results && pendingNames.length === 0) return null;

  const revealed = results || [];

  return (
    <ul className="results" aria-live="polite">
      {revealed.map((r, i) => (
        <li key={`r-${i}`} className={`result ${r.pass ? 'pass' : 'fail'} result-revealed`}>
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
            {r.logs?.length > 0 && (
              <pre className="result-logs">
                {r.logs.map((line, j) => (
                  <span key={j} className="result-log-line">
                    {line}
                  </span>
                ))}
              </pre>
            )}
          </div>
        </li>
      ))}

      {pendingNames.map((name, i) => (
        <li key={`p-${i}`} className="result result-pending">
          <span className="result-icon result-spinner" aria-hidden="true" />
          <div className="result-body">
            <span className="result-name">{name}</span>
            <span className="result-detail">running…</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
